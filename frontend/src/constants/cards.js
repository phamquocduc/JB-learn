import i18n from '../i18n';

export const CARD_TYPES = [
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'vocabulary', label: 'Từ vựng' },
  { value: 'kanji', label: 'Hán tự' },
];

export const CARD_TYPE_LABELS = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  kanji: 'Hán tự',
};

const CARD_TYPE_KEY_MAP = {
  grammar: 'study:types.GRAMMAR',
  vocabulary: 'study:types.VOCAB',
  kanji: 'study:types.KANJI',
};

export function getCardTypeLabel(type) {
  const key = CARD_TYPE_KEY_MAP[type];
  return key ? i18n.t(key) : type || '';
}

export function getCardTypeOptions() {
  return [
    { value: 'grammar', label: i18n.t('study:types.GRAMMAR') },
    { value: 'vocabulary', label: i18n.t('study:types.VOCAB') },
    { value: 'kanji', label: i18n.t('study:types.KANJI') },
  ];
}

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const STUDY_STATUSES = [
  {
    value: 'learned',
    label: 'Đã học',
    shortDesc: 'Mới làm quen',
  },
  {
    value: 'remembered',
    label: 'Đã nhớ',
    shortDesc: 'Nhớ được ý nghĩa',
  },
  {
    value: 'mastered',
    label: 'Thành thạo',
    shortDesc: 'Nắm vững & phản xạ nhanh',
  },
];

export const ANKI_RATINGS = [
  {
    value: 'again',
    rating: 1,
    status: 'learned',
    label: 'Học lại',
    previewKey: 'again',
    shortcut: '1',
  },
  {
    value: 'learned',
    rating: 2,
    status: 'learned',
    label: 'Đã học',
    previewKey: 'hard',
    shortcut: '2',
  },
  {
    value: 'remembered',
    rating: 3,
    status: 'remembered',
    label: 'Đã nhớ',
    previewKey: 'good',
    shortcut: '3',
  },
  {
    value: 'mastered',
    rating: 4,
    status: 'mastered',
    label: 'Thành thạo',
    previewKey: 'easy',
    shortcut: '4',
  },
];

export function getAnkiRatings() {
  return [
    {
      value: 'again',
      rating: 1,
      status: 'learned',
      label: i18n.t('study:rating.again'),
      previewKey: 'again',
      shortcut: '1',
    },
    {
      value: 'learned',
      rating: 2,
      status: 'learned',
      label: i18n.t('study:rating.hard'),
      previewKey: 'hard',
      shortcut: '2',
    },
    {
      value: 'remembered',
      rating: 3,
      status: 'remembered',
      label: i18n.t('study:rating.good'),
      previewKey: 'good',
      shortcut: '3',
    },
    {
      value: 'mastered',
      rating: 4,
      status: 'mastered',
      label: i18n.t('study:rating.easy'),
      previewKey: 'easy',
      shortcut: '4',
    },
  ];
}

export const STUDY_STATUS_LABELS = {
  unseen: 'Chưa học',
  due: 'Cần ôn tập',
  again: 'Học lại',
  learned: 'Đã học',
  remembered: 'Đã nhớ',
  mastered: 'Thành thạo',
};

const STUDY_STATUS_KEY_MAP = {
  unseen: 'study:studyStatus.NEW',
  due: 'study:studyStatus.DUE',
  again: 'study:rating.again',
  learned: 'study:studyStatus.LEARNED',
  remembered: 'study:studyStatus.REMEMBERED',
  mastered: 'study:studyStatus.MASTERED',
};

export function getStudyStatusLabel(status) {
  const key = STUDY_STATUS_KEY_MAP[status];
  return key ? i18n.t(key) : STUDY_STATUS_LABELS[status] || status || '';
}

export function getStudyStatusOptions() {
  return [
    { value: 'learned', label: i18n.t('study:studyStatus.LEARNED') },
    { value: 'remembered', label: i18n.t('study:studyStatus.REMEMBERED') },
    { value: 'mastered', label: i18n.t('study:studyStatus.MASTERED') },
  ];
}

export const SRS_STATE_LABELS = {
  new: 'Thẻ mới',
  learning: 'Đang học',
  review: 'Ôn tập',
  relearning: 'Học lại',
};

const SRS_STATE_KEY_MAP = {
  new: 'study:srsState.new',
  learning: 'study:srsState.learning',
  review: 'study:srsState.review',
  relearning: 'study:srsState.relearning',
};

export function getSrsStateLabel(state) {
  const key = SRS_STATE_KEY_MAP[state];
  return key ? i18n.t(key) : SRS_STATE_LABELS[state] || state || '';
}

export function getEffectiveCardStatus(status, srsState) {
  if (srsState && srsState.state !== 'new') {
    const rawRating = srsState.last_rating ?? srsState.rating;
    const ratingNum = Number(rawRating);
    if (
      ratingNum === 1 ||
      (srsState.state === 'relearning' && !Number.isFinite(ratingNum))
    ) {
      return 'again';
    }
  }
  return status || srsState?.status || 'unseen';
}

const JP_CHAR_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
const VD_PREFIX_REGEX = /^(?:VD|Ex|Example)\s*\d*\s*[:：]\s*/i;
const DIEN_GIAI_REGEX = /^(?:Di[ễế]n\s*gi\s*ải|Explanation|Note)\s*[:：]/i;
const DIEN_GIAI_SPLIT_REGEX = /\n\s*(?:Di[ễế]n\s*gi\s*ải|Explanation|Note)\s*[:：]/i;

export function parseExamples(exampleStr) {
  if (!exampleStr) return [];

  // Cut off trailing "Diễn giải:" / "Explanation:" block if present in legacy card data
  const withoutExplanation = exampleStr
    .replace(/<br\s*\/?>/gi, '\n')
    .split(DIEN_GIAI_SPLIT_REGEX)[0];

  const rawLines = withoutExplanation
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !DIEN_GIAI_REGEX.test(line));

  const results = [];
  let currentJp = '';
  let currentVi = '';

  const flushCurrent = () => {
    if (currentJp && currentVi) {
      results.push(`${currentJp} — ${currentVi}`);
    } else if (currentJp) {
      results.push(currentJp);
    } else if (currentVi && results.length === 0) {
      results.push(currentVi);
    }
    currentJp = '';
    currentVi = '';
  };

  let skipUntilNextJp = false;

  for (const rawLine of rawLines) {
    const startsNewVd = VD_PREFIX_REGEX.test(rawLine);
    const cleaned = rawLine.replace(VD_PREFIX_REGEX, '').trim();
    if (!cleaned) continue;

    // Already formatted on a single line: "<JP> — <VI>"
    if (/\s+(?:→|—|-)\s+/.test(cleaned) && JP_CHAR_REGEX.test(cleaned)) {
      flushCurrent();
      skipUntilNextJp = false;
      results.push(cleaned);
      continue;
    }

    // Inline parenthesized translation: "社長はもうお帰りになりました。(Giám đốc đã về rồi.)"
    const parenMatch = cleaned.match(/^(.+?[。！？!?])\s*[（(](.+)[）)]$/);
    if (parenMatch && JP_CHAR_REGEX.test(parenMatch[1])) {
      flushCurrent();
      skipUntilNextJp = false;
      results.push(`${parenMatch[1].trim()} — ${parenMatch[2].trim()}`);
      continue;
    }

    const hasJp = JP_CHAR_REGEX.test(cleaned);
    if (hasJp) {
      if (startsNewVd || currentVi) {
        flushCurrent();
      }
      skipUntilNextJp = false;
      currentJp = currentJp ? `${currentJp}${cleaned}` : cleaned;
    } else {
      // Pure Vietnamese line
      if (skipUntilNextJp) continue;
      if (startsNewVd && (currentJp || results.length > 0)) {
        // Legacy duplicate Vietnamese VD block after an already-translated Japanese example: flush and skip it
        flushCurrent();
        skipUntilNextJp = true;
        continue;
      }
      const viLine = cleaned.replace(/^[（(]|[）)]$/g, '').trim();
      currentVi = currentVi ? `${currentVi} ${viLine}` : viLine;
    }
  }

  flushCurrent();
  return results;
}
