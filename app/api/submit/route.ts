// app/api/submit/route.ts の修正版

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    const sheets = google.sheets({
      auth,
      version: 'v4',
    });

    const newRow = [
      new Date().toLocaleString('ja-JP'),
      body.customerName,
      body.gender,
      body.ageGroup,
      body.customerType,
      body.visitCount,
      body.postalCode,
      body.channel,
      body.practitioner,
      body.totalTime,
      body.headSpaCourse,
      body.options,
      body.sales,
      body.productSales,
      body.ticketSales,
      body.nextReservation,
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'フォーム入力',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ message: 'Success', data: response.data }, { status: 200 });

  } catch (error) { // ← (error: any) から (error) へ変更
    console.error(error);
    // エラーがErrorインスタンスか確認してからメッセージを取得する
    const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}