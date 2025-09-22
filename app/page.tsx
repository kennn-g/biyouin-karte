'use client';

import { FormEvent, useEffect, useState } from 'react';

const GENDERS = ['男', '女'];
const AGE_GROUPS = ['10代', '20代', '30代', '40代', '50代', '60代以上'];
const CUSTOMER_TYPES = ['新規', '再来店'];
const VISIT_COUNTS_BY_TYPE: Record<(typeof CUSTOMER_TYPES)[number], string[]> = {
  新規: ['1回'],
  再来店: ['2回', '3回', '4回', '5回', '6回以上'],
};
const CHANNELS = ['インスタグラム', 'X', 'TikTok', 'Googleマップ', 'ホットペッパー', 'youtube', '紹介'];
const OPTIONS = ['首肩', 'ハンド'];

type ErrorState = Record<string, string>;

export default function Home() {
  const [customerName, setCustomerName] = useState('');
  const [gender, setGender] = useState(GENDERS[0]);
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[1]);
  const [customerType, setCustomerType] = useState(CUSTOMER_TYPES[0]);
  const [visitCount, setVisitCount] = useState(VISIT_COUNTS_BY_TYPE['新規'][0]);
  const [postalCode, setPostalCode] = useState('');
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [practitioner, setPractitioner] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [headSpaCourse, setHeadSpaCourse] = useState('0');
  const [options, setOptions] = useState<string[]>([]);
  const [sales, setSales] = useState('');
  const [productSales, setProductSales] = useState('0');
  const [ticketSales, setTicketSales] = useState('0');
  const [nextReservation, setNextReservation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [errors, setErrors] = useState<ErrorState>({});
  const visitCountOptions =
    customerType === '新規'
      ? VISIT_COUNTS_BY_TYPE['新規']
      : VISIT_COUNTS_BY_TYPE['再来店'];

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 text-base border rounded-xl bg-white shadow-sm transition focus:outline-none focus:ring-2 ${
      errors[field]
        ? 'border-rose-400 bg-rose-50 focus:ring-rose-300'
        : 'border-slate-200 hover:border-blue-300 focus:ring-blue-300'
    }`;

  const chipClass = (isSelected: boolean) =>
    `flex items-center justify-center rounded-xl border px-4 py-3 text-base font-medium shadow-sm transition ${
      isSelected
        ? 'border-blue-400 bg-blue-100 text-blue-900'
        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
    }`;

  useEffect(() => {
    if (!totalTime || isNaN(Number(totalTime))) {
      setSales('');
      return;
    }

    const minutes = Number(totalTime);
    if (minutes <= 0) {
      setSales('');
      return;
    }

    const calculatedSales = (minutes / 10) * 1000;
    setSales(String(Math.round(calculatedSales)));
  }, [totalTime]);

  useEffect(() => {
    if (customerType === '新規') {
      setVisitCount(VISIT_COUNTS_BY_TYPE['新規'][0]);
      return;
    }

    setVisitCount((prev) => {
      if (prev === '1回') {
        return VISIT_COUNTS_BY_TYPE['再来店'][0];
      }
      return prev;
    });
  }, [customerType]);

  const handleOptionChange = (value: string, checked: boolean) => {
    setOptions((prev) => {
      const next = checked ? [...prev, value] : prev.filter((option) => option !== value);
      return next;
    });
    clearError('options');
  };

  const validateForm = (): ErrorState => {
    const validationErrors: ErrorState = {};

    if (!customerName.trim()) {
      validationErrors.customerName = '顧客名は必須です。';
    }

    if (!practitioner.trim()) {
      validationErrors.practitioner = '施術者は必須です。';
    }

    if (!ageGroup) {
      validationErrors.ageGroup = '年齢層を選択してください。';
    }

    if (!visitCount) {
      validationErrors.visitCount = '来店回数を選択してください。';
    }

    if (customerType === '新規') {
      if (!postalCode.trim()) {
        validationErrors.postalCode = '郵便番号を入力してください。';
      } else if (!/^\d{7}$/.test(postalCode.trim())) {
        validationErrors.postalCode = '郵便番号はハイフンなし7桁で入力してください。';
      }

      if (!channel.trim()) {
        validationErrors.channel = '経由を選択してください。';
      }
    }

    if (!totalTime.trim()) {
      validationErrors.totalTime = '合計施術時間を入力してください。';
    } else if (Number(totalTime) <= 0) {
      validationErrors.totalTime = '1分以上で入力してください。';
    }

    if (!sales.trim()) {
      validationErrors.sales = '施術売上を入力してください。';
    }

    if (productSales && isNaN(Number(productSales))) {
      validationErrors.productSales = '数字のみ入力してください。';
    }

    if (ticketSales && isNaN(Number(ticketSales))) {
      validationErrors.ticketSales = '数字のみ入力してください。';
    }

    return validationErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitMessage('');

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitMessage('❌ 入力内容を確認してください。');
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const formData = {
      customerName,
      gender,
      ageGroup,
      customerType,
      visitCount,
      postalCode: customerType === '新規' ? postalCode : '',
      channel: customerType === '新規' ? channel : '',
      practitioner,
      totalTime,
      headSpaCourse: headSpaCourse || '0',
      options: options.join(', '),
      sales: sales || '0',
      productSales: productSales || '0',
      ticketSales: ticketSales || '0',
      nextReservation: nextReservation ? '有' : '無',
    };

    try {
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
      } else {
        throw new Error(result.error || '送信に失敗しました。');
      }
    } catch (error) {
      if (error instanceof Error) {
        setSubmitMessage(`❌エラーが発生しました: ${error.message}`);
      } else {
        setSubmitMessage('❌予期せぬエラーが発生しました。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-emerald-50 text-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">美容院 顧客情報フォーム</h1>
        <p className="mt-3 text-base text-slate-600">
          必須項目を入力し、確認のうえ「データを提出する」をタップしてください。
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
            <h2 className="text-xl font-semibold text-slate-900">基本情報</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="customerName" className="mb-2 block text-sm font-semibold text-slate-700">
                  顧客名 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    clearError('customerName');
                  }}
                  className={inputClass('customerName')}
                  aria-invalid={Boolean(errors.customerName)}
                  aria-describedby={errors.customerName ? 'customerName-error' : undefined}
                  placeholder="例：山田 花子"
                  autoComplete="name"
                  required
                />
                {errors.customerName && (
                  <p id="customerName-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.customerName}
                  </p>
                )}
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  施術者 <span className="text-rose-500">*</span>
                </span>
                <input
                  id="practitioner"
                  type="text"
                  value={practitioner}
                  onChange={(e) => {
                    setPractitioner(e.target.value);
                    clearError('practitioner');
                  }}
                  className={inputClass('practitioner')}
                  aria-invalid={Boolean(errors.practitioner)}
                  aria-describedby={errors.practitioner ? 'practitioner-error' : undefined}
                  placeholder="例：佐藤"
                  autoComplete="off"
                  required
                />
                {errors.practitioner && (
                  <p id="practitioner-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.practitioner}
                  </p>
                )}
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  性別 <span className="text-rose-500">*</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {GENDERS.map((option) => (
                    <label key={option} className={chipClass(gender === option)}>
                      <input
                        type="radio"
                        className="sr-only"
                        name="gender"
                        value={option}
                        checked={gender === option}
                        onChange={(e) => {
                          setGender(e.target.value);
                          clearError('gender');
                        }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="ageGroup" className="mb-2 block text-sm font-semibold text-slate-700">
                  年齢層 <span className="text-rose-500">*</span>
                </label>
                <select
                  id="ageGroup"
                  value={ageGroup}
                  onChange={(e) => {
                    setAgeGroup(e.target.value);
                    clearError('ageGroup');
                  }}
                  className={inputClass('ageGroup')}
                  aria-invalid={Boolean(errors.ageGroup)}
                  aria-describedby={errors.ageGroup ? 'ageGroup-error' : undefined}
                  required
                >
                  {AGE_GROUPS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.ageGroup && (
                  <p id="ageGroup-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.ageGroup}
                  </p>
                )}
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  お客様区分 <span className="text-rose-500">*</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {CUSTOMER_TYPES.map((type) => (
                    <label key={type} className={chipClass(customerType === type)}>
                      <input
                        type="radio"
                        className="sr-only"
                        name="customerType"
                        value={type}
                        checked={customerType === type}
                        onChange={(e) => {
                          setCustomerType(e.target.value);
                          clearError('customerType');
                        }}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="visitCount" className="mb-2 block text-sm font-semibold text-slate-700">
                  来店回数 <span className="text-rose-500">*</span>
                </label>
                <select
                  id="visitCount"
                  value={visitCount}
                  onChange={(e) => {
                    setVisitCount(e.target.value);
                    clearError('visitCount');
                  }}
                  className={inputClass('visitCount')}
                  aria-invalid={Boolean(errors.visitCount)}
                  aria-describedby={errors.visitCount ? 'visitCount-error' : undefined}
                  disabled={customerType === '新規'}
                  required
                >
                  {visitCountOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.visitCount && (
                  <p id="visitCount-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.visitCount}
                  </p>
                )}
              </div>
            </div>
          </section>

          {customerType === '新規' && (
            <section className="rounded-3xl border border-slate-200 bg-blue-50/70 p-6 shadow-md">
              <h2 className="text-xl font-semibold text-slate-900">新規のお客様情報</h2>
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="postalCode" className="mb-2 block text-sm font-semibold text-slate-700">
                    郵便番号 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    inputMode="numeric"
                    pattern="\\d*"
                    value={postalCode}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '').slice(0, 7);
                      setPostalCode(numericValue);
                      clearError('postalCode');
                    }}
                    className={inputClass('postalCode')}
                    aria-invalid={Boolean(errors.postalCode)}
                    aria-describedby={errors.postalCode ? 'postalCode-error' : undefined}
                    placeholder="例：1234567"
                    required
                  />
                  <p className="mt-2 text-sm text-slate-500">ハイフンなしの半角数字で入力してください。</p>
                  {errors.postalCode && (
                    <p id="postalCode-error" className="mt-2 text-sm text-rose-600" role="alert">
                      {errors.postalCode}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="channel" className="mb-2 block text-sm font-semibold text-slate-700">
                    経由 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="channel"
                    value={channel}
                    onChange={(e) => {
                      setChannel(e.target.value);
                      clearError('channel');
                    }}
                    className={inputClass('channel')}
                    aria-invalid={Boolean(errors.channel)}
                    aria-describedby={errors.channel ? 'channel-error' : undefined}
                    required
                  >
                    {CHANNELS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.channel && (
                    <p id="channel-error" className="mt-2 text-sm text-rose-600" role="alert">
                      {errors.channel}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
            <h2 className="text-xl font-semibold text-slate-900">施術・売上情報</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="totalTime" className="mb-2 block text-sm font-semibold text-slate-700">
                  合計施術時間 (分) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="totalTime"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={totalTime}
                  onChange={(e) => {
                    setTotalTime(e.target.value);
                    clearError('totalTime');
                  }}
                  className={inputClass('totalTime')}
                  aria-invalid={Boolean(errors.totalTime)}
                  aria-describedby={errors.totalTime ? 'totalTime-error' : undefined}
                  placeholder="例：60"
                  required
                />
                {errors.totalTime && (
                  <p id="totalTime-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.totalTime}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="sales" className="mb-2 block text-sm font-semibold text-slate-700">
                  施術売上 (税込) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="sales"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={sales}
                  onChange={(e) => {
                    setSales(e.target.value);
                    clearError('sales');
                  }}
                  className={`${inputClass('sales')} bg-blue-50/70`}
                  aria-invalid={Boolean(errors.sales)}
                  aria-describedby={errors.sales ? 'sales-error' : undefined}
                  placeholder="時間から自動計算されます"
                  required
                />
                {errors.sales && (
                  <p id="sales-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.sales}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="headSpaCourse" className="mb-2 block text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-2">
                    <span>ヘッドスパコース (分)</span>
                    <span className="text-xs font-normal text-slate-500">0分ならそのままでOK</span>
                  </span>
                </label>
                <input
                  id="headSpaCourse"
                  type="text"
                  value={headSpaCourse}
                  onChange={(e) => {
                    setHeadSpaCourse(e.target.value);
                    clearError('headSpaCourse');
                  }}
                  className={inputClass('headSpaCourse')}
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="productSales" className="mb-2 block text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-2">
                    <span>物販売上 (税込)</span>
                    <span className="text-xs font-normal text-slate-500">0円なら未記入でOK</span>
                  </span>
                </label>
                <input
                  id="productSales"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={productSales}
                  onChange={(e) => {
                    setProductSales(e.target.value);
                    clearError('productSales');
                  }}
                  className={inputClass('productSales')}
                  placeholder="0"
                />
                {errors.productSales && (
                  <p id="productSales-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.productSales}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="ticketSales" className="mb-2 block text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-2">
                    <span>回数券販売数</span>
                    <span className="text-xs font-normal text-slate-500">0枚なら未記入でOK</span>
                  </span>
                </label>
                <input
                  id="ticketSales"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={ticketSales}
                  onChange={(e) => {
                    setTicketSales(e.target.value);
                    clearError('ticketSales');
                  }}
                  className={inputClass('ticketSales')}
                  placeholder="0"
                />
                {errors.ticketSales && (
                  <p id="ticketSales-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.ticketSales}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <span className="mb-2 block text-sm font-semibold text-slate-700">オプション</span>
              <div className="flex flex-wrap gap-3">
                {OPTIONS.map((option) => (
                  <label key={option} className={chipClass(options.includes(option))}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      value={option}
                      checked={options.includes(option)}
                      onChange={(e) => handleOptionChange(option, e.target.checked)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-blue-50/70 px-4 py-3">
              <input
                id="nextReservation"
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 text-blue-500"
                checked={nextReservation}
                onChange={(e) => setNextReservation(e.target.checked)}
              />
              <label htmlFor="nextReservation" className="text-base font-medium text-slate-700">
                次回予約あり
              </label>
            </div>
          </section>

          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? '送信中...' : 'データを提出する'}
            </button>
          </div>

          {submitMessage && (
            <p className="rounded-2xl bg-white px-4 py-3 text-center text-base font-medium text-slate-700 shadow-md" role="status" aria-live="polite">
              {submitMessage}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
