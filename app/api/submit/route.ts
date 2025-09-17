// app/api/submit/route.ts

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// POSTリクエストを処理する非同期関数
export async function POST(request: Request) {
  try {
    // フロントエンドから送られてきたJSONデータを取得
    const body = await request.json();

    // Google認証を行う
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // .envの改行文字を元に戻す
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    const sheets = google.sheets({
      auth,
      version: 'v4',
    });

    // スプレッドシートに追記するデータを準備
    // ヘッダーの順番に合わせて配列を作成する
    const newRow = [
      new Date().toLocaleString('ja-JP'), // 登録日時を追加しておくと便利
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

    // スプレッドシートにデータを追記する
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'シート1!A1', // 対象シート名と開始セルを指定
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    // 成功したら200 OKレスポンスを返す
    return NextResponse.json({ message: 'Success', data: response.data }, { status: 200 });

  } catch (error: any) {
    console.error(error); // エラーをサーバーのログに出力
    // エラーが発生したら500 Internal Server Errorレスポンスを返す
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}