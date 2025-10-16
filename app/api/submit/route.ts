// /app/api/submit/route.ts
import { NextResponse } from 'next/server';
import { google, sheets_v4 } from 'googleapis';

export const runtime = 'nodejs';           // googleapis は Node ランタイムで
export const dynamic = 'force-dynamic';    // キャッシュ不可（都度処理）

/**
 * 必要な環境変数（Vercel の Project → Settings → Environment Variables）
 * - SHEET_ID              … スプレッドシートID（/d/ と /edit の間）
 * - SHEET_NAME            … 追記先シート名（例: フォーム入力）
 * - GOOGLE_CLIENT_EMAIL   … サービスアカウントの client_email
 * - GOOGLE_PRIVATE_KEY    … サービスアカウントの private_key（\n を改行に）
 * - （任意）SKIP_SHEET_WRITE='1' … シート追記をスキップして再計算のみ行う
 * - （任意）CORS_ORIGIN            … 例: https://your-site.example
 */

type StringRecord = Record<string, string>;

let sheetsClient: sheets_v4.Sheets | null = null;
const headerCache = new Map<string, string[]>();

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
  if (!SHEET_ID) {
    throw new Error('SHEET_ID が未設定です。');
  }

  const sheets = await getSheetsClient();
  const cacheKey = `${SHEET_ID}::${SHEET_NAME}`;
  const headers = await getSheetHeaders(sheets, SHEET_ID, SHEET_NAME, cacheKey);

  // 和名/英名どちらでも受けられるよう正規化
  const normalized = normalizeKeys(payload);

  // ヘッダ順で値を並べる（存在しないキーは空に）
  const row = headers.map((h) => normalized[h] ?? '');

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
  } catch (error) {
    headerCache.delete(cacheKey);
    sheetsClient = null;
    throw error;
  }
}

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || '';
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || '';

  if (!clientEmail || !privateKeyRaw) {
    throw new Error('GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY が未設定です。');
  }
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

async function getSheetHeaders(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  cacheKey: string,
): Promise<string[]> {
  const cached = headerCache.get(cacheKey);
  if (cached) return cached;

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });

  const headerRow = (headerRes.data.values && headerRes.data.values[0]) || [];
  const headers = headerRow.map((h) => String(h));

  if (headers.length === 0) {
    throw new Error(`シート「${sheetName}」にヘッダー行がありません。`);
  }

  headerCache.set(cacheKey, headers);
  return headers;
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
  data['性別']       = pick('性別', 'gender', 'sex');
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
