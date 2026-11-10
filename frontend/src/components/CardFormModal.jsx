import React, { useState, useEffect, useMemo, useRef } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Dropdown from './ui/Dropdown';
import { CARD_TYPES, JLPT_LEVELS } from '../constants/cards';
import { createCourse } from '../services/api';

const BASE_INPUT_CLASS =
  'w-full min-h-10 px-3.5 py-2 rounded-lg border text-slate-900 text-sm transition-colors duration-150 focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2';
const VALID_INPUT_CLASS =
  'border-slate-200 bg-slate-50 focus:border-sky-700 focus-visible:outline-sky-700';
const INVALID_INPUT_CLASS =
  'border-red-400 bg-red-50/40 focus:border-red-600 focus-visible:outline-red-600';

export default function CardFormModal({
  isOpen,
  onClose,
  onSubmit,
  onCourseCreated,
  initialCard = null,
  defaultCourseId = '',
  defaultType = '',
  defaultLevel = '',
  defaultLesson = '',
  courses = [],
}) {
  const isEditing = Boolean(initialCard && initialCard.id);

  const initialMatchedCourse = useMemo(() => {
    if (isEditing || !defaultCourseId) return null;
    return (
      courses.find((c) => String(c.id) === String(defaultCourseId)) || null
    );
  }, [isEditing, defaultCourseId, courses]);

  const [cardType, setCardType] = useState(
    () =>
      initialCard?.card_type ||
      initialMatchedCourse?.card_type ||
      defaultType ||
      'grammar'
  );
  const [level, setLevel] = useState(
    () =>
      initialCard?.level || initialMatchedCourse?.level || defaultLevel || 'N3'
  );
  const [courseId, setCourseId] = useState(() =>
    initialCard?.course
      ? String(initialCard.course)
      : defaultCourseId
        ? String(defaultCourseId)
        : ''
  );
  const [lesson, setLesson] = useState(
    () => initialCard?.lesson || defaultLesson || 'Bài 1'
  );
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
    initialCard
      ? (initialCard.is_public ?? true)
      : initialMatchedCourse
        ? (initialMatchedCourse.is_public ?? true)
        : true
  );

  // Quick inline course creation state
  const [showNewCourseForm, setShowNewCourseForm] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseError, setNewCourseError] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Submission & validation state
  const [submitting, setSubmitting] = useState(false);
  const [hasCreatedCard, setHasCreatedCard] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const errorSummaryRef = useRef(null);
  const lessonInputRef = useRef(null);
  const frontInputRef = useRef(null);
  const meaningInputRef = useRef(null);
  const newCourseInputRef = useRef(null);

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

  const focusField = (fieldKey) => {
    const refMap = {
      lesson: lessonInputRef,
      frontText: frontInputRef,
      meaning: meaningInputRef,
      newCourseTitle: newCourseInputRef,
    };
    refMap[fieldKey]?.current?.focus();
  };

  const handleCourseChange = (nextCourseId) => {
    setCourseId(nextCourseId);
    if (!isEditing && nextCourseId) {
      const selected = courses.find(
        (c) => String(c.id) === String(nextCourseId)
      );
      if (selected) {
        if (selected.card_type) setCardType(selected.card_type);
        if (selected.level) setLevel(selected.level);
        if (typeof selected.is_public === 'boolean') {
          setIsPublic(selected.is_public);
        }
      }
    }
  };

  const handleQuickCreateCourse = async () => {
    if (!newCourseTitle.trim()) {
      setNewCourseError('Vui lòng nhập tên khoá học mới.');
      newCourseInputRef.current?.focus();
      return;
    }
    setNewCourseError('');
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

  const validateFields = () => {
    const nextErrors = {};
    if (!lesson.trim()) {
      nextErrors.lesson = 'Vui lòng nhập bài học.';
    }
    if (showNewCourseForm && newCourseTitle.trim()) {
      nextErrors.newCourseTitle =
        'Vui lòng nhấn Lưu khoá học trước khi tạo thẻ.';
    }
    if (!frontText.trim()) {
      nextErrors.frontText = 'Vui lòng nhập nội dung mặt trước của thẻ.';
    }
    if (!meaning.trim()) {
      nextErrors.meaning = 'Vui lòng nhập ý nghĩa hoặc định nghĩa của thẻ.';
    }
    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const nextErrors = validateFields();
    const errorKeys = Object.keys(nextErrors);
    setFieldErrors(nextErrors);
    if (nextErrors.newCourseTitle) {
      setNewCourseError(nextErrors.newCourseTitle);
    }

    if (errorKeys.length > 0) {
      requestAnimationFrame(() => {
        if (errorKeys.length > 1) {
          errorSummaryRef.current?.focus();
        } else {
          focusField(errorKeys[0]);
        }
      });
      return;
    }

    const payload = {
      card_type: cardType,
      level,
      course: courseId ? Number(courseId) : null,
      lesson: lesson.trim(),
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
      if (isEditing) {
        onClose?.();
      } else {
        setHasCreatedCard(true);
        setFrontText('');
        setMeaning('');
        setConjugation('');
        setUsageNotes('');
        setExamples('');
        setFieldErrors({});
        setErrorMessage('');
        requestAnimationFrame(() => {
          frontInputRef.current?.focus();
        });
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Không thể lưu thẻ học. Vui lòng kiểm tra lại dữ liệu.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const errorEntries = Object.entries(fieldErrors).filter(([, msg]) =>
    Boolean(msg)
  );

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

        <form
          noValidate
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4"
        >
          {errorMessage && (
            <div
              className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-lg p-3"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          {errorEntries.length > 1 && (
            <div
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
              aria-labelledby="card-form-error-summary-title"
              className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-lg p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <p
                id="card-form-error-summary-title"
                className="font-semibold mb-1"
              >
                Vui lòng kiểm tra các trường bắt buộc:
              </p>
              <ul className="list-disc list-inside flex flex-col gap-0.5">
                {errorEntries.map(([key, msg]) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => focusField(key)}
                      className="underline hover:text-red-900 text-left cursor-pointer"
                    >
                      {msg}
                    </button>
                  </li>
                ))}
              </ul>
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
                Bài học *
              </label>
              <input
                ref={lessonInputRef}
                id="card-lesson-input"
                type="text"
                value={lesson}
                aria-invalid={Boolean(fieldErrors.lesson)}
                aria-describedby={
                  fieldErrors.lesson ? 'card-lesson-error' : undefined
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setLesson(val);
                  if (fieldErrors.lesson && val.trim()) {
                    setFieldErrors((prev) => ({ ...prev, lesson: '' }));
                  }
                }}
                className={`${BASE_INPUT_CLASS} ${
                  fieldErrors.lesson ? INVALID_INPUT_CLASS : VALID_INPUT_CLASS
                }`}
              />
              {fieldErrors.lesson && (
                <p
                  id="card-lesson-error"
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-red-600"
                >
                  {fieldErrors.lesson}
                </p>
              )}
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
                onClick={() => {
                  setShowNewCourseForm((prev) => !prev);
                  setNewCourseError('');
                  setFieldErrors((prev) => ({ ...prev, newCourseTitle: '' }));
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {showNewCourseForm ? 'Đóng tạo khoá học' : 'Tạo khoá học mới'}
                </span>
              </button>
            </div>

            {showNewCourseForm ? (
              <div>
                <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <input
                    ref={newCourseInputRef}
                    type="text"
                    aria-label="Tên khoá học mới"
                    aria-invalid={Boolean(newCourseError)}
                    aria-describedby={
                      newCourseError ? 'new-course-title-error' : undefined
                    }
                    value={newCourseTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewCourseTitle(val);
                      if (newCourseError) {
                        setNewCourseError('');
                        setFieldErrors((prev) => ({
                          ...prev,
                          newCourseTitle: '',
                        }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickCreateCourse();
                      }
                    }}
                    className={`flex-1 min-h-10 px-3.5 py-2 rounded-lg border bg-white text-slate-900 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      newCourseError
                        ? 'border-red-400 focus:border-red-600 focus-visible:outline-red-600'
                        : 'border-slate-200 focus:border-sky-700 focus-visible:outline-sky-700'
                    }`}
                  />
                  <Button
                    variant="primary"
                    disabled={creatingCourse}
                    onClick={handleQuickCreateCourse}
                  >
                    {creatingCourse ? 'Đang tạo...' : 'Lưu khoá học'}
                  </Button>
                </div>
                {newCourseError && (
                  <p
                    id="new-course-title-error"
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-red-600"
                  >
                    {newCourseError}
                  </p>
                )}
              </div>
            ) : (
              <Dropdown
                id="card-course-select"
                value={courseId}
                onChange={handleCourseChange}
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
              ref={frontInputRef}
              id="card-front-text"
              type="text"
              value={frontText}
              aria-invalid={Boolean(fieldErrors.frontText)}
              aria-describedby={
                fieldErrors.frontText ? 'card-front-text-error' : undefined
              }
              onChange={(e) => {
                const val = e.target.value;
                setFrontText(val);
                if (fieldErrors.frontText && val.trim()) {
                  setFieldErrors((prev) => ({ ...prev, frontText: '' }));
                }
              }}
              className={`${BASE_INPUT_CLASS} font-jp ${
                fieldErrors.frontText ? INVALID_INPUT_CLASS : VALID_INPUT_CLASS
              }`}
            />
            {fieldErrors.frontText && (
              <p
                id="card-front-text-error"
                role="alert"
                className="mt-1.5 text-xs font-medium text-red-600"
              >
                {fieldErrors.frontText}
              </p>
            )}
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
              ref={meaningInputRef}
              id="card-meaning"
              type="text"
              value={meaning}
              aria-invalid={Boolean(fieldErrors.meaning)}
              aria-describedby={
                fieldErrors.meaning ? 'card-meaning-error' : undefined
              }
              onChange={(e) => {
                const val = e.target.value;
                setMeaning(val);
                if (fieldErrors.meaning && val.trim()) {
                  setFieldErrors((prev) => ({ ...prev, meaning: '' }));
                }
              }}
              className={`${BASE_INPUT_CLASS} ${
                fieldErrors.meaning ? INVALID_INPUT_CLASS : VALID_INPUT_CLASS
              }`}
            />
            {fieldErrors.meaning && (
              <p
                id="card-meaning-error"
                role="alert"
                className="mt-1.5 text-xs font-medium text-red-600"
              >
                {fieldErrors.meaning}
              </p>
            )}
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
              className={`${BASE_INPUT_CLASS} ${VALID_INPUT_CLASS} font-jp`}
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
              {hasCreatedCard ? 'Đóng' : 'Hủy'}
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
