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
const PRACTITIONERS = ['すず', 'ある', 'さよこ', 'みき', 'さつき', 'みう'];
const KATAKANA_REGEX = /^[\u30A0-\u30FFー・]+$/;
const DEFAULT_NEW_CUSTOMER_INTERVAL_DAYS = 21;
const DEFAULT_RESERVATION_TIME = { hour: 10, minute: 0 };
const NEXT_RESERVATION_INTERVAL_BY_VISIT: Record<string, number> = {
  '2回': 35,
  '3回': 42,
  '4回': 49,
  '5回': 56,
  '6回以上': 63,
};

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (value: string) => {
  if (!value) {
    return '';
  }
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${year}年${month}月${day}日`;
};

const formatDateTimeForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTimeForDisplay = (value: string) => {
  if (!value) {
    return '';
  }
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) {
    return value;
  }
  const [year, month, day] = datePart.split('-');
  const [hour, minute] = timePart.split(':');
  if (!year || !month || !day || !hour || !minute) {
    return value;
  }
  return `${year}年${month}月${day}日 ${hour}時${minute}分`;
};

const createDateFromBusinessDay = (businessDay: string) => {
  if (!businessDay) {
    return null;
  }
  const [year, month, day] = businessDay.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(year, month - 1, day, DEFAULT_RESERVATION_TIME.hour, DEFAULT_RESERVATION_TIME.minute);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getNextReservationSuggestion = (
  businessDay: string,
  customerType: (typeof CUSTOMER_TYPES)[number],
  visitCount: string,
) => {
  const baseDate = createDateFromBusinessDay(businessDay);
  if (!baseDate) {
    return '';
  }

  const intervalDays =
    customerType === '新規'
      ? DEFAULT_NEW_CUSTOMER_INTERVAL_DAYS
      : NEXT_RESERVATION_INTERVAL_BY_VISIT[visitCount] ?? DEFAULT_NEW_CUSTOMER_INTERVAL_DAYS;

  const predictedDate = new Date(baseDate);
  predictedDate.setDate(predictedDate.getDate() + intervalDays);
  return formatDateTimeForInput(predictedDate);
};

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
  const [businessDay, setBusinessDay] = useState(() => formatDateForInput(new Date()));
  const [salesAmount, setSalesAmount] = useState('0');
  const [productSalesAmount, setProductSalesAmount] = useState('0');
  const [nextReservationDateTime, setNextReservationDateTime] = useState('');
  const [hasManualNextReservation, setHasManualNextReservation] = useState(false);
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

  const chipClass = (isSelected: boolean, hasError = false) =>
    `flex min-h-[3rem] cursor-pointer items-center justify-center rounded-xl border px-4 py-4 text-base font-medium shadow-sm transition ${
      isSelected
        ? 'border-blue-400 bg-blue-100 text-blue-900'
        : hasError
          ? 'border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400'
          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
    }`;

  const toNumber = (value: string) => {
    if (!value) {
      return 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

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

  useEffect(() => {
    if (!businessDay) {
      if (!hasManualNextReservation) {
        setNextReservationDateTime('');
      }
      return;
    }

    if (hasManualNextReservation) {
      return;
    }

    const suggestion = getNextReservationSuggestion(businessDay, customerType, visitCount);
    setNextReservationDateTime(suggestion);
  }, [businessDay, customerType, visitCount, hasManualNextReservation]);

  const latestNextReservationSuggestion = getNextReservationSuggestion(businessDay, customerType, visitCount);
  const isSuggestionAvailable = Boolean(latestNextReservationSuggestion);
  const isSuggestionApplied =
    Boolean(latestNextReservationSuggestion) && latestNextReservationSuggestion === nextReservationDateTime;

  const handleNextReservationDateTimeChange = (value: string) => {
    setHasManualNextReservation(true);
    setNextReservationDateTime(value);
    clearError('nextReservationDateTime');
  };

  const handleApplyNextReservationSuggestion = () => {
    if (!latestNextReservationSuggestion) {
      return;
    }
    setHasManualNextReservation(false);
    setNextReservationDateTime(latestNextReservationSuggestion);
    clearError('nextReservationDateTime');
  };

  const validateForm = (): ErrorState => {
    const validationErrors: ErrorState = {};

    const trimmedCustomerName = customerName.trim();
    if (!trimmedCustomerName) {
      validationErrors.customerName = '顧客名は必須です。';
    } else if (!KATAKANA_REGEX.test(trimmedCustomerName)) {
      validationErrors.customerName = '顧客名は全角カタカナで空白なしで入力してください。';
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

    if (!businessDay) {
      validationErrors.businessDay = '営業日を選択してください。';
    } else if (Number.isNaN(new Date(businessDay).getTime())) {
      validationErrors.businessDay = '有効な日付を選択してください。';
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

    const trimmedSalesAmount = salesAmount.trim();
    if (!trimmedSalesAmount) {
      validationErrors.salesAmount = '施術売上を入力してください。';
    } else {
      const parsedSales = Number(trimmedSalesAmount);
      if (Number.isNaN(parsedSales)) {
        validationErrors.salesAmount = '数字のみ入力してください。';
      } else if (parsedSales < 0) {
        validationErrors.salesAmount = '0以上の数字を入力してください。';
      }
    }

    const trimmedProductSalesAmount = productSalesAmount.trim();
    if (!trimmedProductSalesAmount) {
      validationErrors.productSalesAmount = '物販売上を入力してください。';
    } else {
      const parsedProductSales = Number(trimmedProductSalesAmount);
      if (Number.isNaN(parsedProductSales)) {
        validationErrors.productSalesAmount = '数字のみ入力してください。';
      } else if (parsedProductSales < 0) {
        validationErrors.productSalesAmount = '0以上の数字を入力してください。';
      }
    }

    if (nextReservationDateTime) {
      const parsedNextReservation = new Date(nextReservationDateTime);
      if (Number.isNaN(parsedNextReservation.getTime())) {
        validationErrors.nextReservationDateTime = '有効な日時を選択してください。';
      }
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

    const numericToString = (value: string) => String(toNumber(value));
    const sanitizedCustomerName = customerName.trim();
    const sanitizedPostalCode = postalCode.trim();
    const formData = {
      customerName: sanitizedCustomerName,
      gender,
      ageGroup,
      customerType,
      visitCount,
      postalCode: customerType === '新規' ? sanitizedPostalCode : '',
      channel: customerType === '新規' ? channel : '',
      practitioner,
      businessDay: formatDateForDisplay(businessDay),
      salesAmount: numericToString(salesAmount),
      productSalesAmount: numericToString(productSalesAmount),
      nextReservationDateTime: nextReservationDateTime
        ? formatDateTimeForDisplay(nextReservationDateTime)
        : '',
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
                <label htmlFor="businessDay" className="mb-2 block text-sm font-semibold text-slate-700">
                  営業日 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="businessDay"
                  type="date"
                  value={businessDay}
                  onChange={(e) => {
                    setBusinessDay(e.target.value);
                    setHasManualNextReservation(false);
                    clearError('businessDay');
                  }}
                  className={inputClass('businessDay')}
                  aria-invalid={Boolean(errors.businessDay)}
                  aria-describedby={errors.businessDay ? 'businessDay-error' : undefined}
                  required
                />
                <p className="mt-2 text-sm text-slate-500">カレンダーから営業日を選択してください（例：{formatDateForDisplay(businessDay)}）。</p>
                {errors.businessDay && (
                  <p id="businessDay-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.businessDay}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="customerName" className="mb-2 block text-sm font-semibold text-slate-700">
                  顧客名 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    const katakanaValue = e.target.value.replace(/\s+/g, '');
                    setCustomerName(katakanaValue);
                    clearError('customerName');
                  }}
                  className={inputClass('customerName')}
                  aria-invalid={Boolean(errors.customerName)}
                  aria-describedby={errors.customerName ? 'customerName-error' : undefined}
                  placeholder="例：ヤマダハナコ"
                  autoComplete="name"
                  required
                />
                <p className="mt-2 text-sm text-slate-500">全角カタカナ・スペースなしでご入力ください。</p>
                {errors.customerName && (
                  <p id="customerName-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.customerName}
                  </p>
                )}
              </div>

              <div>
                <span id="practitioner-label" className="mb-2 block text-sm font-semibold text-slate-700">
                  施術者 <span className="text-rose-500">*</span>
                </span>
                <div
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                  role="radiogroup"
                  aria-labelledby="practitioner-label"
                  aria-invalid={Boolean(errors.practitioner)}
                  aria-describedby={errors.practitioner ? 'practitioner-error' : undefined}
                >
                  {PRACTITIONERS.map((name) => (
                    <label
                      key={name}
                      className={chipClass(practitioner === name, Boolean(errors.practitioner))}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name="practitioner"
                        value={name}
                        checked={practitioner === name}
                        onChange={(e) => {
                          setPractitioner(e.target.value);
                          clearError('practitioner');
                        }}
                        required
                      />
                      {name}
                    </label>
                  ))}
                </div>
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
            <h2 className="text-xl font-semibold text-slate-900">売上情報</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="salesAmount" className="mb-2 block text-sm font-semibold text-slate-700">
                  施術売上 (円) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="salesAmount"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={salesAmount}
                  onChange={(e) => {
                    setSalesAmount(e.target.value);
                    clearError('salesAmount');
                  }}
                  className={inputClass('salesAmount')}
                  placeholder="0"
                  aria-invalid={Boolean(errors.salesAmount)}
                  aria-describedby={errors.salesAmount ? 'salesAmount-error' : undefined}
                  required
                />
                <p className="mt-2 text-sm text-slate-500">施術メニューによる売上金額を入力してください。施術がない場合は0を入力してください。</p>
                {errors.salesAmount && (
                  <p id="salesAmount-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.salesAmount}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="productSalesAmount" className="mb-2 block text-sm font-semibold text-slate-700">
                  物販売上 (円) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="productSalesAmount"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={productSalesAmount}
                  onChange={(e) => {
                    setProductSalesAmount(e.target.value);
                    clearError('productSalesAmount');
                  }}
                  className={inputClass('productSalesAmount')}
                  placeholder="0"
                  aria-invalid={Boolean(errors.productSalesAmount)}
                  aria-describedby={errors.productSalesAmount ? 'productSalesAmount-error' : undefined}
                  required
                />
                <p className="mt-2 text-sm text-slate-500">物販商品の売上金額を入力してください。物販がない場合は0を入力してください。</p>
                {errors.productSalesAmount && (
                  <p id="productSalesAmount-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.productSalesAmount}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-blue-50/70 p-6 shadow-md">
            <h2 className="text-xl font-semibold text-slate-900">次回予約</h2>
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="nextReservationDateTime" className="mb-2 block text-sm font-semibold text-slate-700">
                  次回予約日時（推定）
                </label>
                <input
                  id="nextReservationDateTime"
                  type="datetime-local"
                  value={nextReservationDateTime}
                  onChange={(e) => handleNextReservationDateTimeChange(e.target.value)}
                  className={inputClass('nextReservationDateTime')}
                  aria-invalid={Boolean(errors.nextReservationDateTime)}
                  aria-describedby={errors.nextReservationDateTime ? 'nextReservationDateTime-error' : undefined}
                />
                <p className="mt-2 text-sm text-slate-500">
                  営業日と来店回数から{isSuggestionAvailable ? '推計した日時を初期表示しています。必要があれば修正してください。' : '候補日時を計算できませんでした。営業日を入力すると自動補完されます。'}
                </p>
                {latestNextReservationSuggestion && (
                  <p className="mt-1 text-xs text-slate-500">
                    推定候補: {formatDateTimeForDisplay(latestNextReservationSuggestion)}
                  </p>
                )}
                {errors.nextReservationDateTime && (
                  <p id="nextReservationDateTime-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.nextReservationDateTime}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleApplyNextReservationSuggestion}
                  disabled={!isSuggestionAvailable || isSuggestionApplied}
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  予測日時を再適用
                </button>
                {isSuggestionApplied ? (
                  <span className="text-sm text-slate-500">最新の予測が反映されています。</span>
                ) : (
                  <span className="text-sm text-slate-500">ボタンで提案値を再設定できます。</span>
                )}
              </div>
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
