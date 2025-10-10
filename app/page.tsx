'use client';

import { FormEvent, useEffect, useState } from 'react';

const CUSTOMER_TYPES = ['新規', '再来店'];
const REPEAT_CHANNEL_LABEL = 'リピート（2回目以降の来店は全員こちら）';
const CHANNELS = [
  REPEAT_CHANNEL_LABEL,
  '看板',
  'インスタグラム',
  'ツイッター',
  'TikTok',
  'Google Map',
  'Google 検索',
  'ホットペッパー',
  'チラシ',
  'YouTube',
  'お客様からの紹介',
  'スタッフからの紹介',
  '林社長きっかけ',
  '癒しタイムズ',
  'Yahoo検索',
  'Facebook',
  'ふるさと納税',
  'その他',
];
const NEXT_RESERVATION_OPTIONS = ['あり', 'なし'] as const;
const TICKET_OPTIONS = [
  'なし',
  '利用',
  '60×3購入',
  '60×5購入',
  '90×3購入',
  '90×5購入',
  '120×3購入',
  '120×5購入',
  '150×3購入',
  '150×5購入',
  'その他',
];
const PRACTITIONERS = ['すず', 'ある', 'さよこ', 'みき', 'さつき', 'みう'];
const GENDER_OPTIONS = ['男性', '女性'] as const;
const FULL_WIDTH_SPACE = '　';
const CUSTOMER_NAME_REGEX = /^[\u30A0-\u30FFー・]+　[\u30A0-\u30FFー・]+$/;
const CHANNELS_FOR_NEW = CHANNELS.filter((option) => option !== REPEAT_CHANNEL_LABEL);

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

const trimFullWidthWhitespace = (value: string) => value.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');

const normalizeCustomerNameInput = (value: string) =>
  value
    .replace(/[\s\u3000]+/g, ' ')
    .replace(/ /g, FULL_WIDTH_SPACE);

type ErrorState = Record<string, string>;

export default function Home() {
  const [customerName, setCustomerName] = useState('');
  const [gender, setGender] = useState('');
  const [customerType, setCustomerType] = useState(CUSTOMER_TYPES[0]);
  const [channel, setChannel] = useState('');
  const [practitioner, setPractitioner] = useState('');
  const [businessDay, setBusinessDay] = useState(() => formatDateForInput(new Date()));
  const [ticketStatus, setTicketStatus] = useState(TICKET_OPTIONS[0]);
  const [hasNextReservation, setHasNextReservation] = useState<(typeof NEXT_RESERVATION_OPTIONS)[number]>('なし');
  const [nextReservationDate, setNextReservationDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [errors, setErrors] = useState<ErrorState>({});

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

  useEffect(() => {
    if (customerType === '再来店') {
      if (channel !== REPEAT_CHANNEL_LABEL) {
        setChannel(REPEAT_CHANNEL_LABEL);
      }
      setErrors((prev) => {
        if (!prev.channel) {
          return prev;
        }
        const next = { ...prev };
        delete next.channel;
        return next;
      });
    } else if (channel === REPEAT_CHANNEL_LABEL) {
      setChannel('');
    }
  }, [channel, customerType]);

  const validateForm = (): ErrorState => {
    const validationErrors: ErrorState = {};

    const trimmedCustomerName = trimFullWidthWhitespace(customerName);
    if (!trimmedCustomerName) {
      validationErrors.customerName = '顧客名は必須です。';
    } else if (!CUSTOMER_NAME_REGEX.test(trimmedCustomerName)) {
      validationErrors.customerName = '顧客名は「ヤマダ　ハナコ」のように全角カタカナで姓と名の間に全角スペースを入れて入力してください。';
    }

    if (!gender.trim()) {
      validationErrors.gender = '性別を選択してください。';
    }

    if (!practitioner.trim()) {
      validationErrors.practitioner = '施術者は必須です。';
    }

    if (!businessDay) {
      validationErrors.businessDay = '営業日を選択してください。';
    } else if (Number.isNaN(new Date(businessDay).getTime())) {
      validationErrors.businessDay = '有効な日付を選択してください。';
    }

    if (customerType === '新規') {
      if (!channel.trim()) {
        validationErrors.channel = '経由を選択してください。';
      } else if (channel === REPEAT_CHANNEL_LABEL) {
        validationErrors.channel = '新規のお客様にはリピート以外の経由を選択してください。';
      }
    }

    if (!ticketStatus) {
      validationErrors.ticketStatus = '回数券についてを選択してください。';
    }

    if (!NEXT_RESERVATION_OPTIONS.includes(hasNextReservation)) {
      validationErrors.hasNextReservation = '次回予約の有無を選択してください。';
    }

    if (hasNextReservation === 'あり') {
      if (!nextReservationDate) {
        validationErrors.nextReservationDate = '次回予約日を入力してください。';
      } else {
        const parsedNextReservation = new Date(nextReservationDate);
        if (Number.isNaN(parsedNextReservation.getTime())) {
          validationErrors.nextReservationDate = '有効な日付を選択してください。';
        }
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

    const sanitizedCustomerName = trimFullWidthWhitespace(customerName);
    const formData = {
      customerName: sanitizedCustomerName,
      gender,
      customerType,
      channel: customerType === '再来店' ? REPEAT_CHANNEL_LABEL : channel,
      practitioner,
      businessDay,
      ticketStatus,
      hasNextReservation,
      nextReservationDate: hasNextReservation === 'あり' ? nextReservationDate : '',
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
                    const inputValue = normalizeCustomerNameInput(e.target.value);
                    setCustomerName(inputValue);
                    clearError('customerName');
                  }}
                  className={inputClass('customerName')}
                  aria-invalid={Boolean(errors.customerName)}
                  aria-describedby={errors.customerName ? 'customerName-error' : undefined}
                  placeholder="例：ヤマダ　ハナコ"
                  autoComplete="name"
                  required
                />
                <p className="mt-2 text-sm text-slate-500">姓と名の間に全角スペースを入れて、全角カタカナでご入力ください。</p>
                {errors.customerName && (
                  <p id="customerName-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.customerName}
                  </p>
                )}
              </div>

              <div>
                <span id="gender-label" className="mb-2 block text-sm font-semibold text-slate-700">
                  性別 <span className="text-rose-500">*</span>
                </span>
                <div
                  className="grid grid-cols-2 gap-3"
                  role="radiogroup"
                  aria-labelledby="gender-label"
                  aria-invalid={Boolean(errors.gender)}
                  aria-describedby={errors.gender ? 'gender-error' : undefined}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={chipClass(gender === option, Boolean(errors.gender))}
                    >
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
                        required
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {errors.gender && (
                  <p id="gender-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.gender}
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
            </div>
          </section>

          {customerType === '新規' && (
            <section className="rounded-3xl border border-slate-200 bg-blue-50/70 p-6 shadow-md">
              <h2 className="text-xl font-semibold text-slate-900">新規のお客様情報</h2>
              <div className="mt-6 space-y-6">
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
                    <option value="" disabled hidden>
                      経由を選択してください
                    </option>
                    {CHANNELS_FOR_NEW.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-slate-500">来店経路に該当する項目を選択してください。</p>
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
            <h2 className="text-xl font-semibold text-slate-900">回数券情報</h2>
            <div className="mt-6">
              <label htmlFor="ticketStatus" className="mb-2 block text-sm font-semibold text-slate-700">
                回数券について <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500">*販売履歴を優先報告</p>
              <select
                id="ticketStatus"
                value={ticketStatus}
                onChange={(e) => {
                  setTicketStatus(e.target.value);
                  clearError('ticketStatus');
                }}
                className={`mt-3 ${inputClass('ticketStatus')}`}
                aria-invalid={Boolean(errors.ticketStatus)}
                aria-describedby={errors.ticketStatus ? 'ticketStatus-error' : undefined}
                required
              >
                {TICKET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.ticketStatus && (
                <p id="ticketStatus-error" className="mt-2 text-sm text-rose-600" role="alert">
                  {errors.ticketStatus}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-blue-50/70 p-6 shadow-md">
            <h2 className="text-xl font-semibold text-slate-900">次回予約</h2>
            <div className="mt-6 space-y-6">
              <div>
                <span id="hasNextReservation-label" className="mb-2 block text-sm font-semibold text-slate-700">
                  次回予約有無 <span className="text-rose-500">*</span>
                </span>
                <div
                  className="grid grid-cols-2 gap-3"
                  role="radiogroup"
                  aria-labelledby="hasNextReservation-label"
                  aria-invalid={Boolean(errors.hasNextReservation)}
                  aria-describedby={errors.hasNextReservation ? 'hasNextReservation-error' : undefined}
                >
                  {NEXT_RESERVATION_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={chipClass(hasNextReservation === option, Boolean(errors.hasNextReservation))}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name="hasNextReservation"
                        value={option}
                        checked={hasNextReservation === option}
                        onChange={(e) => {
                          setHasNextReservation(e.target.value as (typeof NEXT_RESERVATION_OPTIONS)[number]);
                          clearError('hasNextReservation');
                          if (e.target.value === 'なし') {
                            setNextReservationDate('');
                            clearError('nextReservationDate');
                          }
                        }}
                        required
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {errors.hasNextReservation && (
                  <p id="hasNextReservation-error" className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.hasNextReservation}
                  </p>
                )}
              </div>

              {hasNextReservation === 'あり' && (
                <div>
                  <label htmlFor="nextReservationDate" className="mb-2 block text-sm font-semibold text-slate-700">
                    次回予約日 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="nextReservationDate"
                    type="date"
                    value={nextReservationDate}
                    onChange={(e) => {
                      setNextReservationDate(e.target.value);
                      clearError('nextReservationDate');
                    }}
                    className={inputClass('nextReservationDate')}
                    aria-invalid={Boolean(errors.nextReservationDate)}
                    aria-describedby={errors.nextReservationDate ? 'nextReservationDate-error' : undefined}
                    required
                  />
                  <p className="mt-2 text-sm text-slate-500">カレンダーから次回の予約日を選択してください。</p>
                  {errors.nextReservationDate && (
                    <p id="nextReservationDate-error" className="mt-2 text-sm text-rose-600" role="alert">
                      {errors.nextReservationDate}
                    </p>
                  )}
                </div>
              )}
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
