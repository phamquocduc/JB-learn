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

export const STUDY_STATUS_LABELS = {
  unseen: 'Chưa học',
  learned: 'Đã học',
  remembered: 'Đã nhớ',
  mastered: 'Thành thạo',
};

const JP_CHAR_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
const VD_PREFIX_REGEX = /^VD\d*\s*[:：]\s*/i;
const DIEN_GIAI_REGEX = /^Di[ễế]n\s*gi\s*ải\s*[:：]/i;

export function parseExamples(exampleStr) {
  if (!exampleStr) return [];

  // Cut off trailing "Diễn giải:" block if present in legacy card data
  const withoutExplanation = exampleStr
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/\n\s*Di[ễế]n\s*gi\s*ải\s*[:：]/i)[0];

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
