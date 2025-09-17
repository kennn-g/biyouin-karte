// app/page.tsx

// 'use client' は、このコンポーネントがブラウザ上で動くことを示すおまじないです。
// useStateやuseEffectなどの機能（フック）を使うために必要です。
'use client';

// ReactからuseStateとuseEffectという機能をインポートします。
// useState: フォームの入力内容などを一時的に記憶するために使います。
// useEffect: 特定のタイミングで処理を実行するために使います。
import { useState, useEffect, FormEvent } from 'react';

export default function Home() {
  // useStateを使って、各フォーム項目の状態（入力値）を管理します。
  const [customerName, setCustomerName] = useState('');
  const [gender, setGender] = useState('男');
  const [ageGroup, setAgeGroup] = useState('20代');
  const [customerType, setCustomerType] = useState('新規'); // お客様区分（新規 or 再来店）
  const [visitCount, setVisitCount] = useState('1回');
  const [postalCode, setPostalCode] = useState('');
  const [channel, setChannel] = useState('インスタグラム'); // 経由
  const [practitioner, setPractitioner] = useState(''); // 施術者
  const [totalTime, setTotalTime] = useState(''); // 合計施術時間
  const [headSpaCourse, setHeadSpaCourse] = useState('');
  const [options, setOptions] = useState<string[]>([]); // オプションは複数選択可なので配列
  const [sales, setSales] = useState(''); // 施術売上
  const [productSales, setProductSales] = useState('0'); // 物販売上
  const [ticketSales, setTicketSales] = useState('0'); // 回数券販売数
  const [nextReservation, setNextReservation] = useState(false); // 次回予約の有無

  // 送信中の状態を管理
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 送信後のメッセージを管理
  const [submitMessage, setSubmitMessage] = useState('');

  // ========== 売上自動計算のロジック ==========
  // 合計施術時間(totalTime)が変更されたら、自動で施術売上を計算します。
  useEffect(() => {
    // totalTimeが数字でなければ何もしない
    if (!totalTime || isNaN(Number(totalTime))) {
      setSales(''); // 時間が未入力なら売上も空にする
      return;
    }
    // ここで料金計算ロジックを実装します。例：10分あたり1000円
    const calculatedSales = (Number(totalTime) / 10) * 1000;
    setSales(String(calculatedSales));
  }, [totalTime]); // totalTimeが変化した時だけこの中が実行される

  // ========== オプションのチェックボックス処理 ==========
  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      // チェックされたら、オプションの配列に追加
      setOptions((prev) => [...prev, value]);
    } else {
      // チェックが外れたら、オプションの配列から削除
      setOptions((prev) => prev.filter((option) => option !== value));
    }
  };

  // ========== フォームが送信された時の処理 ==========
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // フォーム送信時のデフォルトのページリロードを防ぐ
    setIsSubmitting(true); // 送信中フラグを立てる
    setSubmitMessage(''); // メッセージをリセット

    // スプレッドシートに書き込むデータを作成
    const formData = {
      customerName,
      gender,
      ageGroup,
      customerType,
      visitCount,
      postalCode: customerType === '新規' ? postalCode : '', // 新規の場合のみ郵便番号をセット
      channel: customerType === '新規' ? channel : '', // 新規の場合のみ経由をセット
      practitioner,
      totalTime,
      headSpaCourse,
      options: options.join(', '), // 配列をカンマ区切りの文字列に変換
      sales: sales || '0', // 未入力なら0
      productSales: productSales || '0',
      ticketSales: ticketSales || '0',
      nextReservation: nextReservation ? '有' : '無',
    };

    try {
      // これから作るAPIエンドポイントにデータを送信
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitMessage('✅ データが正常に送信されました！');
        // ここでフォームをリセットする処理も追加できる
      } else {
        throw new Error(result.error || '送信に失敗しました。');
      }
    } catch (error: any) {
      setSubmitMessage(`❌エラーが発生しました: ${error.message}`);
    } finally {
      setIsSubmitting(false); // 送信中フラグを解除
    }
  };

  // ========== ここから下が画面の見た目 (JSX) ==========
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">美容院 顧客情報フォーム</h1>

      {/* フォーム全体 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ----- 基本情報セクション ----- */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium">顧客名</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block mb-1 font-medium">性別</label>
              <div className="flex gap-4">
                <label><input type="radio" value="男" checked={gender === '男'} onChange={(e) => setGender(e.target.value)} /> 男</label>
                <label><input type="radio" value="女" checked={gender === '女'} onChange={(e) => setGender(e.target.value)} /> 女</label>
              </div>
            </div>
            {/* ... 他の項目も同様に ... */}
            <div>
              <label className="block mb-1 font-medium">お客様区分</label>
              <select value={customerType} onChange={(e) => setCustomerType(e.target.value)} className="w-full p-2 border rounded">
                <option>新規</option>
                <option>再来店</option>
              </select>
            </div>
          </div>
        </div>

        {/* ----- 新規のお客様専用セクション ----- */}
        {/* customerTypeが'新規'の時だけ、この部分が表示される */}
        {customerType === '新規' && (
          <div className="p-4 border rounded-lg bg-blue-50">
            <h2 className="text-xl font-semibold mb-4">新規のお客様情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block mb-1 font-medium">郵便番号</label>
                 <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="w-full p-2 border rounded" />
               </div>
               <div>
                 <label className="block mb-1 font-medium">経由</label>
                 <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full p-2 border rounded">
                   <option>インスタグラム</option>
                   <option>X</option>
                   <option>TikTok</option>
                   <option>Googleマップ</option>
                   <option>ホットペッパー</option>
                   <option>youtube</option>
                   <option>紹介</option>
                 </select>
               </div>
            </div>
          </div>
        )}

        {/* ----- 施術情報セクション ----- */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">施術情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium">合計施術時間 (分)</label>
              <input type="number" value={totalTime} onChange={(e) => setTotalTime(e.target.value)} required className="w-full p-2 border rounded" />
            </div>
             <div>
              <label className="block mb-1 font-medium">施術売上 (税込)</label>
              <input type="number" value={sales} onChange={(e) => setSales(e.target.value)} placeholder="時間から自動計算されます" required className="w-full p-2 border rounded bg-gray-100" />
            </div>
            {/* ... 物販や回数券など他の項目も追加 ... */}
            <div>
              <label className="block mb-1 font-medium">物販売上 (税込)</label>
              <input type="number" value={productSales} onChange={(e) => setProductSales(e.target.value)} className="w-full p-2 border rounded" />
            </div>
          </div>
           <div className="mt-4">
             <label className="block mb-1 font-medium">オプション</label>
             <div className="flex gap-4">
                <label><input type="checkbox" value="首肩" checked={options.includes('首肩')} onChange={handleOptionChange} /> 首肩</label>
                <label><input type="checkbox" value="ハンド" checked={options.includes('ハンド')} onChange={handleOptionChange} /> ハンド</label>
             </div>
           </div>
           <div className="mt-4">
             <label className="flex items-center gap-2">
               <input type="checkbox" checked={nextReservation} onChange={(e) => setNextReservation(e.target.checked)} />
               次回予約あり
             </label>
           </div>
        </div>

        {/* ----- 送信ボタン ----- */}
        <div className="text-center">
          <button type="submit" disabled={isSubmitting} className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400">
            {isSubmitting ? '送信中...' : 'データを登録する'}
          </button>
        </div>

        {/* ----- 送信後のメッセージ表示エリア ----- */}
        {submitMessage && (
          <p className="text-center text-lg mt-4">{submitMessage}</p>
        )}
      </form>
    </main>
  );
}