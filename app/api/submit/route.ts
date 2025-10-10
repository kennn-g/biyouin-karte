// /app/api/submit/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';           // googleapis は Node ランタイムで
export const dynamic = 'force-dynamic';    // キャッシュ不可（都度処理）

/**
 * 必要な環境変数（Vercel の Project → Settings → Environment Variables）
 * - SHEET_ID              … スプレッドシートID（/d/ と /edit の間）
 * - SHEET_NAME            … 追記先シート名（例: フォーム入力）
 * - GOOGLE_CLIENT_EMAIL   … サービスアカウントの client_email
 * - GOOGLE_PRIVATE_KEY    … サービスアカウントの private_key（\n を改行に）
 * - GAS_EXEC_URL          … GAS WebアプリURL（/exec まで）
 * - RECALC_TOKEN          … Code.gs の RECALC_CONFIG.token と一致
 * - （任意）SKIP_SHEET_WRITE='1' … シート追記をスキップして再計算のみ行う
 * - （任意）CORS_ORIGIN            … 例: https://your-site.example
 */

type StringRecord = Record<string, string>;

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() as HeadersInit });
}

export async function POST(req: Request) {
  try {
    // 1) ペイロードを取り出し（JSON / form 両対応）→ すべて string に正規化
    const payload = await parsePayload(req); // StringRecord

    // 2) シート追記（SKIP_SHEET_WRITE !== '1' のときだけ）
    if (process.env.SKIP_SHEET_WRITE !== '1') {
      await appendToSheet(payload);
    }

    // 3) GAS へ再計算を依頼
    await callRecalc();

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json', ...corsHeaders() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[submit route] error:', msg);
    return new NextResponse(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json', ...corsHeaders() },
    });
  }
}

/* -------------------- Payload utils -------------------- */

async function parsePayload(req: Request): Promise<StringRecord> {
  const contentType = req.headers.get('content-type') || '';
  const out: StringRecord = {};

  if (contentType.includes('application/json')) {
    const raw: unknown = await req.json();
    if (isObject(raw)) {
      for (const [k, v] of Object.entries(raw)) {
        out[String(k)] = valueToString(v);
      }
    }
  } else {
    const fd = await req.formData();
    fd.forEach((v, k) => {
      out[k] = typeof v === 'string' ? v : '';
    });
  }
  return out;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function valueToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v : String(v);
}

/* -------------------- Google Sheets append -------------------- */

async function appendToSheet(payload: StringRecord): Promise<void> {
  const SHEET_ID = process.env.SHEET_ID || '';
  const SHEET_NAME = process.env.SHEET_NAME || 'フォーム入力';
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || '';
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || '';

  if (!SHEET_ID || !clientEmail || !privateKeyRaw) {
    throw new Error('SHEET_ID / GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY が未設定です。');
  }
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1行目のヘッダを取得（その順番で値を並べる）
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!1:1`,
  });
  const headerRow = (headerRes.data.values && headerRes.data.values[0]) || [];
  const headers: string[] = headerRow.map((h) => String(h));

  if (headers.length === 0) {
    throw new Error(`シート「${SHEET_NAME}」にヘッダー行がありません。`);
  }

  // 和名/英名どちらでも受けられるよう正規化
  const normalized = normalizeKeys(payload);

  // ヘッダ順で値を並べる（存在しないキーは空に）
  const row = headers.map((h) => normalized[h] ?? '');

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

/** 和名・英名どちらでも受け取れるように -> シートの日本語ヘッダへマッピング */
function normalizeKeys(p: StringRecord): StringRecord {
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = p[k];
      if (v !== undefined && v !== null && String(v).length > 0) return String(v);
    }
    return '';
  };

  const data: StringRecord = {};
  // 既定の列（あなたのシートに合わせて）
  data['会計日']     = pick('会計日', 'businessDay', 'date');
  data['顧客名']     = pick('顧客名', 'customerName', 'name');
  data['施術者']     = pick('施術者', 'therapist', 'practitioner', 'staff');
  data['お客様区分'] = pick('お客様区分', 'customerType');
  data['経由']       = pick('経由', 'source', 'channel');
  data['回数券情報'] = pick('回数券情報', 'ticketStatus', 'ticket');
  data['次回予約']   = pick('次回予約', 'hasNextReservation', 'next');
  data['次回予約日'] = pick('次回予約日', 'nextReservationDate', 'nextDate');

  // 追加のキーが来ても保持（ヘッダに存在すれば反映される）
  for (const [k, v] of Object.entries(p)) {
    if (!(k in data)) data[k] = String(v ?? '');
  }
  return data;
}

/* -------------------- GAS recalc -------------------- */

async function callRecalc(): Promise<void> {
  const execUrl = process.env.GAS_EXEC_URL || '';
  const token = process.env.RECALC_TOKEN || '';
  if (!execUrl || !token) throw new Error('GAS_EXEC_URL / RECALC_TOKEN が未設定です。');

  const url = new URL(execUrl);
  url.search = new URLSearchParams({ token, action: 'recalc' }).toString();

  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`GAS recalc failed: ${res.status} ${t}`);
  }
}

