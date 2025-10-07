import { NextResponse } from 'next/server';

const sanitizeUrl = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^['"]+|['"]+$/g, '');
  return trimmed.length > 0 ? trimmed : undefined;
};

const GAS_WEBAPP_URL = sanitizeUrl(process.env.GAS_WEBAPP_URL);
const GAS_SHEET_NAME = process.env.GAS_SHEET_NAME ?? 'フォーム入力';

export async function POST(request: Request) {
  if (!GAS_WEBAPP_URL) {
    return NextResponse.json(
      { error: 'GAS_WEBAPP_URL が設定されていません。' },
      { status: 500 },
    );
  }

  let gasWebAppUrl: URL;
  try {
    gasWebAppUrl = new URL(GAS_WEBAPP_URL);
  } catch {
    return NextResponse.json(
      { error: 'GAS_WEBAPP_URL の書式が正しくありません。URL 文字列を確認してください。' },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    const payloadEntries = Object.entries({
      sheetName: GAS_SHEET_NAME,
      timestamp,
      customerName: body.customerName,
      gender: body.gender,
      customerType: body.customerType,
      channel: body.channel,
      practitioner: body.practitioner,
      businessDay: body.businessDay,
      ticketStatus: body.ticketStatus,
      hasNextReservation: body.hasNextReservation,
      nextReservationDate: body.nextReservationDate,
    }).filter(([, value]) => value !== undefined && value !== null);

    const formBody = new URLSearchParams();
    for (const [key, value] of payloadEntries) {
      formBody.append(key, String(value));
    }

    const gasResponse = await fetch(gasWebAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: formBody.toString(),
    });

    const responseText = await gasResponse.text();

    if (!gasResponse.ok) {
      return NextResponse.json(
        { error: `Google Apps Script error: ${responseText}` },
        { status: 502 },
      );
    }

    try {
      const parsed = JSON.parse(responseText);
      return NextResponse.json({ message: 'Success', data: parsed }, { status: 200 });
    } catch {
      return NextResponse.json({ message: 'Success', data: responseText }, { status: 200 });
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : '不明なエラーが発生しました。';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
