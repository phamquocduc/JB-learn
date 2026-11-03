import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Dropdown from './ui/Dropdown';
import { CARD_TYPES, JLPT_LEVELS } from '../constants/cards';
import { createCourse } from '../services/api';

export default function CardFormModal({
  isOpen,
  onClose,
  onSubmit,
  onCourseCreated,
  initialCard = null,
  courses = [],
}) {
  const isEditing = Boolean(initialCard && initialCard.id);

  const [cardType, setCardType] = useState(() => initialCard?.card_type || 'grammar');
  const [level, setLevel] = useState(() => initialCard?.level || 'N3');
  const [courseId, setCourseId] = useState(() =>
    initialCard?.course ? String(initialCard.course) : ''
  );
  const [lesson, setLesson] = useState(() => initialCard?.lesson || 'Bài 1');
  const [frontText, setFrontText] = useState(
    () => initialCard?.front_text || initialCard?.grammar || ''
  );
  const [meaning, setMeaning] = useState(() => initialCard?.meaning || '');
  const [conjugation, setConjugation] = useState(
    () => initialCard?.conjugation || ''
  );
  const [usageNotes, setUsageNotes] = useState(
    () => initialCard?.usage_notes || ''
  );
  const [examples, setExamples] = useState(() => initialCard?.examples || '');
  const [isPublic, setIsPublic] = useState(() =>
    initialCard ? (initialCard.is_public ?? true) : true
  );

  // Quick inline course creation state
  const [showNewCourseForm, setShowNewCourseForm] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const courseOptions = useMemo(
    () => [
      { value: '', label: 'Không gán khoá học' },
      ...courses.map((c) => ({
        value: String(c.id),
        label: c.level ? `${c.title} · ${c.level}` : c.title,
      })),
    ],
    [courses]
  );

  const handleSafeClose = () => {
    if (submitting || creatingCourse) return;
    onClose?.();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (
        e.defaultPrevented ||
        document.querySelector('[data-dropdown-open="true"]')
      ) {
        return;
      }
      if (e.key === 'Escape' && !submitting && !creatingCourse) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, creatingCourse, onClose]);

  if (!isOpen) return null;

  const handleQuickCreateCourse = async () => {
    if (!newCourseTitle.trim()) {
      setErrorMessage('Vui lòng nhập tên khoá học mới.');
      return;
    }
    setErrorMessage('');
    setCreatingCourse(true);
    try {
      const created = await createCourse({
        title: newCourseTitle.trim(),
        level,
        card_type: cardType,
        is_public: Boolean(isPublic),
      });
      await onCourseCreated?.(created);
      setCourseId(String(created.id));
      setNewCourseTitle('');
      setShowNewCourseForm(false);
    } catch (err) {
      setErrorMessage(err.message || 'Không thể tạo khoá học mới.');
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!frontText.trim()) {
      setErrorMessage('Vui lòng nhập nội dung mặt trước của thẻ.');
      return;
    }
    if (!meaning.trim()) {
      setErrorMessage('Vui lòng nhập ý nghĩa của thẻ.');
      return;
    }

    const payload = {
      card_type: cardType,
      level,
      course: courseId ? Number(courseId) : null,
      lesson: lesson.trim() || 'Bài 1',
      front_text: frontText.trim(),
      meaning: meaning.trim(),
      conjugation: conjugation.trim(),
      usage_notes: usageNotes.trim(),
      examples: examples.trim(),
      is_public: Boolean(isPublic),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload, initialCard?.id);
      onClose();
    } catch (err) {
      setErrorMessage(
        err.message || 'Không thể lưu thẻ học. Vui lòng kiểm tra lại dữ liệu.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 animate-backdrop-in"
      onClick={handleSafeClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-form-modal-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col animate-popup-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-b border-slate-200 rounded-t-2xl flex items-center justify-between">
          <h2
            id="card-form-modal-title"
            className="text-base sm:text-lg font-bold text-slate-900"
          >
            {isEditing ? 'Chỉnh sửa thẻ học' : 'Tạo thẻ học mới'}
          </h2>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleSafeClose}
            aria-label="Đóng biểu mẫu"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4">
          {errorMessage && (
            <div
              className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-lg p-3"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          {/* Visibility Toggle */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Quyền hiển thị
            </span>
            <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-1 gap-1">
              <button
                type="button"
                aria-pressed={Boolean(isPublic)}
                onClick={() => setIsPublic(true)}
                className={`flex-1 min-h-9 text-xs sm:text-sm font-semibold rounded-md transition-colors duration-150 cursor-pointer ${
                  isPublic
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                Công khai
              </button>
              <button
                type="button"
                aria-pressed={!isPublic}
                onClick={() => setIsPublic(false)}
                className={`flex-1 min-h-9 text-xs sm:text-sm font-semibold rounded-md transition-colors duration-150 cursor-pointer ${
                  !isPublic
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                Riêng tư
              </button>
            </div>
          </div>

          {/* Row: Type, Level, Lesson */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="card-type-select"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Loại thẻ
              </label>
              <Dropdown
                id="card-type-select"
                value={cardType}
                onChange={setCardType}
                options={CARD_TYPES}
              />
            </div>

            <div>
              <label
                htmlFor="card-level-select"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Cấp độ JLPT
              </label>
              <Dropdown
                id="card-level-select"
                value={level}
                onChange={setLevel}
                options={JLPT_LEVELS}
              />
            </div>

            <div>
              <label
                htmlFor="card-lesson-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Bài học
              </label>
              <input
                id="card-lesson-input"
                type="text"
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                className="w-full min-h-10 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm transition-colors duration-150 focus:bg-white focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              />
            </div>
          </div>

          {/* Course selector + Quick Create Course */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="card-course-select"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Khoá học / Bộ thẻ
              </label>
              <button
                type="button"
                onClick={() => setShowNewCourseForm((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {showNewCourseForm ? 'Đóng tạo khoá học' : 'Tạo khoá học mới'}
                </span>
              </button>
            </div>

            {showNewCourseForm ? (
              <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="text"
                  aria-label="Tên khoá học mới"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickCreateCourse();
                    }
                  }}
                  className="flex-1 min-h-10 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
                <Button
                  variant="primary"
                  disabled={creatingCourse}
                  onClick={handleQuickCreateCourse}
                >
                  {creatingCourse ? 'Đang tạo...' : 'Lưu khoá học'}
                </Button>
              </div>
            ) : (
              <Dropdown
                id="card-course-select"
                value={courseId}
                onChange={setCourseId}
                options={courseOptions}
              />
            )}
          </div>

          {/* Front Text */}
          <div>
            <label
              htmlFor="card-front-text"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Mặt trước *
            </label>
            <input
              id="card-front-text"
              type="text"
              required
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              className="w-full min-h-10 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-jp transition-colors duration-150 focus:bg-white focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            />
          </div>

          {/* Meaning */}
          <div>
            <label
              htmlFor="card-meaning"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Ý nghĩa / Định nghĩa *
            </label>
            <input
              id="card-meaning"
              type="text"
              required
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full min-h-10 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm transition-colors duration-150 focus:bg-white focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            />
          </div>

          {/* Conjugation / Pronunciation */}
          <div>
            <label
              htmlFor="card-conjugation"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Cách chia / Cách đọc / Âm Hán Việt
            </label>
            <input
              id="card-conjugation"
              type="text"
              value={conjugation}
              onChange={(e) => setConjugation(e.target.value)}
              className="w-full min-h-10 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-jp transition-colors duration-150 focus:bg-white focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            />
          </div>

          {/* Usage Notes */}
          <div>
            <label
              htmlFor="card-usage-notes"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Cách dùng / Ghi chú
            </label>
            <textarea
              id="card-usage-notes"
              rows={2}
              value={usageNotes}
              onChange={(e) => setUsageNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm transition-colors duration-150 focus:bg-white focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 resize-y"
            />
          </div>

          {/* Examples */}
          <div>
            <label
              htmlFor="card-examples"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Câu ví dụ
            </label>
            <textarea
              id="card-examples"
              rows={3}
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-jp transition-colors duration-150 focus:bg-white focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 resize-y"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              variant="secondary"
              disabled={submitting || creatingCourse}
              onClick={handleSafeClose}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || creatingCourse}
            >
              {submitting
                ? 'Đang lưu...'
                : isEditing
                  ? 'Lưu thay đổi'
                  : 'Tạo thẻ học'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
