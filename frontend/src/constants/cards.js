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

export function parseExamples(exampleStr) {
  if (!exampleStr) return [];
  return exampleStr
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
