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
const PRACTITIONERS = ['すず', 'ある', 'さよこ', 'みき', 'さつき', 'みう'];
const STAFF_TYPES = ['固定給スタッフ', '歩合制スタッフ'];
const NOMINATION_OPTIONS = ['指名なし', '指名あり'];
const PRICE_PER_TEN_MINUTES = 1000;
const KATAKANA_REGEX = /^[\u30A0-\u30FFー・]+$/;

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
  const [headSpaMinutes, setHeadSpaMinutes] = useState('');
  const [optionMinutes, setOptionMinutes] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [productSales, setProductSales] = useState('0');
  const [ticketSales, setTicketSales] = useState('0');
  const [hpbPointUsage, setHpbPointUsage] = useState('0');
  const [storePointUsage, setStorePointUsage] = useState('0');
  const [ticketUsageAmount, setTicketUsageAmount] = useState('0');
  const [giftUsageAmount, setGiftUsageAmount] = useState('0');
  const [giftPurchaseAmount, setGiftPurchaseAmount] = useState('0');
  const [staffType, setStaffType] = useState(STAFF_TYPES[0]);
  const [nominationStatus, setNominationStatus] = useState(NOMINATION_OPTIONS[0]);
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

  const calculateAmountByMinutes = (minutesValue: string) => {
    const minutes = toNumber(minutesValue);
    if (minutes <= 0) {
      return 0;
    }
    return Math.round((minutes / 10) * PRICE_PER_TEN_MINUTES);
  };

  const headSpaAmount = calculateAmountByMinutes(headSpaMinutes);
  const optionAmount = calculateAmountByMinutes(optionMinutes);
  const hpbPointAmount = toNumber(hpbPointUsage);
  const ticketUsageValue = toNumber(ticketUsageAmount);
  const giftPurchaseValue = toNumber(giftPurchaseAmount);
  const productSalesValue = toNumber(productSales);
  const nominationFee = nominationStatus === '指名あり' ? 500 : 0;

  const commissionSalesAmount =
    ticketUsageValue > 0
      ? ticketUsageValue + giftPurchaseValue
      : headSpaAmount + optionAmount + hpbPointAmount + giftPurchaseValue;

  const fixedSalesAmount =
    ticketUsageValue > 0
      ? ticketUsageValue + productSalesValue + nominationFee
      : headSpaAmount + optionAmount + productSalesValue + nominationFee;

  const selectedStaffSalesAmount =
    staffType === '固定給スタッフ' ? fixedSalesAmount : commissionSalesAmount;

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

    const numericValidationTargets: Array<{ value: string; key: string; message: string }> = [
      { value: headSpaMinutes, key: 'headSpaMinutes', message: '時間は半角数字で入力してください。' },
      { value: optionMinutes, key: 'optionMinutes', message: '時間は半角数字で入力してください。' },
      { value: productSales, key: 'productSales', message: '数字のみ入力してください。' },
      { value: ticketSales, key: 'ticketSales', message: '数字のみ入力してください。' },
      { value: hpbPointUsage, key: 'hpbPointUsage', message: '数字のみ入力してください。' },
      { value: storePointUsage, key: 'storePointUsage', message: '数字のみ入力してください。' },
      { value: ticketUsageAmount, key: 'ticketUsageAmount', message: '数字のみ入力してください。' },
      { value: giftUsageAmount, key: 'giftUsageAmount', message: '数字のみ入力してください。' },
      { value: giftPurchaseAmount, key: 'giftPurchaseAmount', message: '数字のみ入力してください。' },
    ];

    numericValidationTargets.forEach(({ value, key, message }) => {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return;
      }
      const parsed = Number(trimmedValue);
      if (Number.isNaN(parsed)) {
        validationErrors[key] = message;
      } else if (parsed < 0) {
        validationErrors[key] = '0以上の数字を入力してください。';
      }
    });

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
      headSpaMinutes: numericToString(headSpaMinutes),
      headSpaAmount: String(headSpaAmount),
      optionMinutes: numericToString(optionMinutes),
      optionAmount: String(optionAmount),
      options: options.join(', '),
      productSales: numericToString(productSales),
      ticketSales: numericToString(ticketSales),
      hpbPointUsage: numericToString(hpbPointUsage),
      storePointUsage: numericToString(storePointUsage),
      ticketUsageAmount: numericToString(ticketUsageAmount),
      giftUsageAmount: numericToString(giftUsageAmount),
      giftPurchaseAmount: numericToString(giftPurchaseAmount),
      staffType,
      nominationStatus,
      nominationFee: String(nominationFee),
      fixedSalesAmount: String(fixedSalesAmount),
      commissionSalesAmount: String(commissionSalesAmount),
      selectedStaffSalesAmount: String(selectedStaffSalesAmount),
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
            <div className="mt-6 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">ヘッドスパコース</h3>
                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="headSpaMinutes" className="mb-2 block text-sm font-semibold text-slate-700">
                      時間 (分)
                    </label>
                    <input
                      id="headSpaMinutes"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={headSpaMinutes}
                      onChange={(e) => {
                        setHeadSpaMinutes(e.target.value);
                        clearError('headSpaMinutes');
                      }}
                      className={inputClass('headSpaMinutes')}
                      aria-invalid={Boolean(errors.headSpaMinutes)}
                      aria-describedby={errors.headSpaMinutes ? 'headSpaMinutes-error' : undefined}
                      placeholder="0"
                    />
                    {errors.headSpaMinutes && (
                      <p id="headSpaMinutes-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.headSpaMinutes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">0分の場合はそのままで問題ありません。</p>
                  </div>
                  <div>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">ヘッドスパ金額 (自動計算)</span>
                    <input
                      id="headSpaAmount"
                      type="number"
                      inputMode="numeric"
                      value={String(headSpaAmount)}
                      readOnly
                      tabIndex={-1}
                      className={`${inputClass('headSpaAmount')} bg-blue-50/70`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800">オプション</h3>
                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="optionMinutes" className="mb-2 block text-sm font-semibold text-slate-700">
                      時間 (分)
                    </label>
                    <input
                      id="optionMinutes"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={optionMinutes}
                      onChange={(e) => {
                        setOptionMinutes(e.target.value);
                        clearError('optionMinutes');
                      }}
                      className={inputClass('optionMinutes')}
                      aria-invalid={Boolean(errors.optionMinutes)}
                      aria-describedby={errors.optionMinutes ? 'optionMinutes-error' : undefined}
                      placeholder="0"
                    />
                    {errors.optionMinutes && (
                      <p id="optionMinutes-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.optionMinutes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">0分の場合はそのままで問題ありません。</p>
                  </div>
                  <div>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">オプション金額 (自動計算)</span>
                    <input
                      id="optionAmount"
                      type="number"
                      inputMode="numeric"
                      value={String(optionAmount)}
                      readOnly
                      tabIndex={-1}
                      className={`${inputClass('optionAmount')} bg-blue-50/70`}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">オプション内容</span>
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
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800">売上・ポイント</h3>
                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
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
                      aria-invalid={Boolean(errors.productSales)}
                      aria-describedby={errors.productSales ? 'productSales-error' : undefined}
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
                      aria-invalid={Boolean(errors.ticketSales)}
                      aria-describedby={errors.ticketSales ? 'ticketSales-error' : undefined}
                    />
                    {errors.ticketSales && (
                      <p id="ticketSales-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.ticketSales}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="hpbPointUsage" className="mb-2 block text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-2">
                        <span>HPBポイント使用 (円)</span>
                        <span className="text-xs font-normal text-slate-500">0円なら未記入でOK</span>
                      </span>
                    </label>
                    <input
                      id="hpbPointUsage"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={hpbPointUsage}
                      onChange={(e) => {
                        setHpbPointUsage(e.target.value);
                        clearError('hpbPointUsage');
                      }}
                      className={inputClass('hpbPointUsage')}
                      placeholder="0"
                      aria-invalid={Boolean(errors.hpbPointUsage)}
                      aria-describedby={errors.hpbPointUsage ? 'hpbPointUsage-error' : undefined}
                    />
                    {errors.hpbPointUsage && (
                      <p id="hpbPointUsage-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.hpbPointUsage}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="storePointUsage" className="mb-2 block text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-2">
                        <span>店舗ポイント使用 (円)</span>
                        <span className="text-xs font-normal text-slate-500">0円なら未記入でOK</span>
                      </span>
                    </label>
                    <input
                      id="storePointUsage"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={storePointUsage}
                      onChange={(e) => {
                        setStorePointUsage(e.target.value);
                        clearError('storePointUsage');
                      }}
                      className={inputClass('storePointUsage')}
                      placeholder="0"
                      aria-invalid={Boolean(errors.storePointUsage)}
                      aria-describedby={errors.storePointUsage ? 'storePointUsage-error' : undefined}
                    />
                    {errors.storePointUsage && (
                      <p id="storePointUsage-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.storePointUsage}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="ticketUsageAmount" className="mb-2 block text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-2">
                        <span>回数券の使用 (円)</span>
                        <span className="text-xs font-normal text-slate-500">0円なら未記入でOK</span>
                      </span>
                    </label>
                    <input
                      id="ticketUsageAmount"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={ticketUsageAmount}
                      onChange={(e) => {
                        setTicketUsageAmount(e.target.value);
                        clearError('ticketUsageAmount');
                      }}
                      className={inputClass('ticketUsageAmount')}
                      placeholder="0"
                      aria-invalid={Boolean(errors.ticketUsageAmount)}
                      aria-describedby={errors.ticketUsageAmount ? 'ticketUsageAmount-error' : undefined}
                    />
                    {errors.ticketUsageAmount && (
                      <p id="ticketUsageAmount-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.ticketUsageAmount}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="giftUsageAmount" className="mb-2 block text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-2">
                        <span>ギフト券の使用 (円)</span>
                        <span className="text-xs font-normal text-slate-500">0円なら未記入でOK</span>
                      </span>
                    </label>
                    <input
                      id="giftUsageAmount"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={giftUsageAmount}
                      onChange={(e) => {
                        setGiftUsageAmount(e.target.value);
                        clearError('giftUsageAmount');
                      }}
                      className={inputClass('giftUsageAmount')}
                      placeholder="0"
                      aria-invalid={Boolean(errors.giftUsageAmount)}
                      aria-describedby={errors.giftUsageAmount ? 'giftUsageAmount-error' : undefined}
                    />
                    {errors.giftUsageAmount && (
                      <p id="giftUsageAmount-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.giftUsageAmount}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="giftPurchaseAmount" className="mb-2 block text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-2">
                        <span>ギフト券の購入 (円)</span>
                        <span className="text-xs font-normal text-slate-500">0円なら未記入でOK</span>
                      </span>
                    </label>
                    <input
                      id="giftPurchaseAmount"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={giftPurchaseAmount}
                      onChange={(e) => {
                        setGiftPurchaseAmount(e.target.value);
                        clearError('giftPurchaseAmount');
                      }}
                      className={inputClass('giftPurchaseAmount')}
                      placeholder="0"
                      aria-invalid={Boolean(errors.giftPurchaseAmount)}
                      aria-describedby={errors.giftPurchaseAmount ? 'giftPurchaseAmount-error' : undefined}
                    />
                    {errors.giftPurchaseAmount && (
                      <p id="giftPurchaseAmount-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.giftPurchaseAmount}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800">スタッフ設定</h3>
                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">スタッフ区分</span>
                    <div
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                      role="radiogroup"
                      aria-invalid={Boolean(errors.staffType)}
                      aria-describedby={errors.staffType ? 'staffType-error' : undefined}
                    >
                      {STAFF_TYPES.map((type) => (
                        <label key={type} className={chipClass(staffType === type)}>
                          <input
                            type="radio"
                            className="sr-only"
                            name="staffType"
                            value={type}
                            checked={staffType === type}
                            onChange={(e) => {
                              setStaffType(e.target.value);
                              clearError('staffType');
                            }}
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                    {errors.staffType && (
                      <p id="staffType-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.staffType}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">指名の有無</span>
                    <div
                      className="grid grid-cols-2 gap-3"
                      role="radiogroup"
                      aria-invalid={Boolean(errors.nominationStatus)}
                      aria-describedby={errors.nominationStatus ? 'nominationStatus-error' : undefined}
                    >
                      {NOMINATION_OPTIONS.map((option) => (
                        <label key={option} className={chipClass(nominationStatus === option)}>
                          <input
                            type="radio"
                            className="sr-only"
                            name="nominationStatus"
                            value={option}
                            checked={nominationStatus === option}
                            onChange={(e) => {
                              setNominationStatus(e.target.value);
                              clearError('nominationStatus');
                            }}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {errors.nominationStatus && (
                      <p id="nominationStatus-error" className="mt-2 text-sm text-rose-600" role="alert">
                        {errors.nominationStatus}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">指名料 (自動加算)</span>
                    <input
                      id="nominationFee"
                      type="number"
                      inputMode="numeric"
                      value={String(nominationFee)}
                      readOnly
                      tabIndex={-1}
                      className={`${inputClass('nominationFee')} bg-blue-50/70`}
                    />
                  </div>

                  {staffType === '歩合制スタッフ' && (
                    <div>
                      <span className="mb-2 block text-sm font-semibold text-slate-700">歩合制売上額 (自動計算)</span>
                      <input
                        id="commissionSalesAmount"
                        type="number"
                        inputMode="numeric"
                        value={String(commissionSalesAmount)}
                        readOnly
                        tabIndex={-1}
                        className={`${inputClass('commissionSalesAmount')} bg-blue-50/70`}
                      />
                    </div>
                  )}

                  {staffType === '固定給スタッフ' && (
                    <div>
                      <span className="mb-2 block text-sm font-semibold text-slate-700">固定制売上額 (自動計算)</span>
                      <input
                        id="fixedSalesAmount"
                        type="number"
                        inputMode="numeric"
                        value={String(fixedSalesAmount)}
                        readOnly
                        tabIndex={-1}
                        className={`${inputClass('fixedSalesAmount')} bg-blue-50/70`}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-blue-50/70 px-4 py-3">
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
