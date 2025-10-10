import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs'; // googleapis使用のため
export const dynamic = 'force-dynamic'; // キャッシュ無効

/***** 環境変数 *****
 * SPREADSHEET_ID         … スプレッドシートID（URLの /d/ と /edit の間）
 * GOOGLE_SHEETS_TAB       … 追記先のシート名（例: フォーム入力）
 * GOOGLE_CLIENT_EMAIL … サービスアカウントの client_email
 * GOOGLE_PRIVATE_KEY  … サービスアカウントの private_key（\n を改行に）
 * GAS_EXEC_URL     … Apps Script WebアプリURL（/exec まで）
 * RECALC_TOKEN     … Code.gs の RECALC_CONFIG.token と同じ値
 * SKIP_SHEET_WRITE … '1' ならシート追記をスキップ（既に他で直書きしている場合）
 * CORS_ORIGIN      … 必要なら https://your-site.example を設定（未設定なら * ）
 ************************/

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() as any });
}

export async function POST(req: Request) {
  try {
    // 1) リクエストボディ（JSON / form 両対応）
    const contentType = req.headers.get('content-type') || '';
    let payload: Record<string, any> = {};
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      const fd = await req.formData();
      fd.forEach((v, k) => (payload[k] = typeof v === 'string' ? v : ''));
    }

    // 2) （任意）シートに追記：SKIP_SHEET_WRITE != '1' のときだけ
    if (process.env.SKIP_SHEET_WRITE !== '1') {
      await appendToSheet(payload);
    }

    // 3) GAS に再計算を依頼
    await callRecalc();

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json', ...corsHeaders() },
    });
  } catch (err: any) {
    console.error('[form route] error:', err?.message || err);
    return new NextResponse(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500,
      headers: { 'content-type': 'application/json', ...corsHeaders() },
    });
  }
}

/* ---------- Google Sheets 追記処理 ---------- */

async function appendToSheet(payload: Record<string, any>) {
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
  const GOOGLE_SHEETS_TAB = process.env.GOOGLE_SHEETS_TAB || 'フォーム入力';
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL!;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!SPREADSHEET_ID || !clientEmail || !privateKey) {
    throw new Error('SPREADSHEET_ID / GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY が未設定です。');
  }

  // サービスアカウント認証
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1行目のヘッダを取得し、その順番で値配列を作る
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${GOOGLE_SHEETS_TAB}!1:1`,
  });
  const headers: string[] = (headerRes.data.values?.[0] as string[]) || [];
  if (!headers.length) {
    throw new Error(`シート「${GOOGLE_SHEETS_TAB}」にヘッダー行がありません。先にヘッダーを作成してください。`);
  }

  // 既存のあなたの列名例：
  // 「会計日, 顧客名, 施術者, お客様区分, 経由, 回数券情報, 次回予約, 次回予約日」
  // キー表記ゆれ吸収（和名/英名どちらでもOK）
  const normalized = normalizeKeys(payload);

  const row = headers.map((h) => normalized[h] ?? '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: GOOGLE_SHEETS_TAB,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

/** 和名・英名どちらでも受け取れるように正規化する */
function normalizeKeys(p: Record<string, any>) {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = p[k];
      if (v !== undefined && v !== null && String(v).length > 0) return String(v);
    }
    return '';
  };

  const data: Record<string, string> = {};
  // シート側ヘッダ名に合わせて値を用意（存在しないキーは空文字）
  data['会計日']     = pick('会計日', 'businessDay', 'date');
  data['顧客名']     = pick('顧客名', 'customerName', 'name');
  data['施術者']     = pick('施術者', 'therapist', 'practitioner', 'staff');
  data['お客様区分'] = pick('お客様区分', 'customerType');
  data['経由']       = pick('経由', 'source', 'channel');
  data['回数券情報'] = pick('回数券情報', 'ticketStatus', 'ticket');
  data['次回予約']   = pick('次回予約', 'hasNextReservation', 'next');
  data['次回予約日'] = pick('次回予約日', 'nextReservationDate', 'nextDate');

  // 追加の列があればそのまま渡す（ヘッダに一致すれば反映される）
  for (const [k, v] of Object.entries(p)) {
    if (!(k in data)) data[k] = String(v ?? '');
  }
  return data;
}

/* ---------- GAS 再計算呼び出し ---------- */
async function callRecalc() {
  const execUrl = process.env.GAS_EXEC_URL!;
  const token = process.env.RECALC_TOKEN!;
  if (!execUrl || !token) throw new Error('GAS_EXEC_URL / RECALC_TOKEN が未設定です。');

  const url = new URL(execUrl);
  url.search = new URLSearchParams({ token, action: 'recalc' }).toString();

  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`GAS recalc failed: ${res.status} ${t}`);
  }
}
