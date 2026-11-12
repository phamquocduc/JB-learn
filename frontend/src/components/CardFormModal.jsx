import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Dropdown from './ui/Dropdown';
import { getCardTypeOptions, JLPT_LEVELS } from '../constants/cards';
import { createCourse } from '../services/api';

const BASE_INPUT_CLASS =
  'w-full min-h-10 px-3.5 py-2 rounded-control border text-slate-900 text-sm transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1';
const VALID_INPUT_CLASS =
  'border-slate-200 bg-white hover:border-slate-300 focus:border-sky-700 focus-visible:outline-sky-700';
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
  const { t } = useTranslation(['study', 'common']);
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
    () => initialCard?.lesson || defaultLesson || t('study:cardForm.defaultLesson')
  );
  const [frontText, setFrontText] = useState(
    () => initialCard?.front_text || initialCard?.grammar || ''
  );
  const [contentLang, setContentLang] = useState('vi');
  const [meaning, setMeaning] = useState(
    () => initialCard?.source_values?.meaning ?? initialCard?.meaning ?? ''
  );
  const [conjugation, setConjugation] = useState(
    () =>
      initialCard?.source_values?.conjugation ?? initialCard?.conjugation ?? ''
  );
  const [usageNotes, setUsageNotes] = useState(
    () =>
      initialCard?.source_values?.usage_notes ?? initialCard?.usage_notes ?? ''
  );
  const [examples, setExamples] = useState(
    () => initialCard?.source_values?.examples ?? initialCard?.examples ?? ''
  );
  const [enMeaning, setEnMeaning] = useState(
    () => initialCard?.translations?.en?.meaning || ''
  );
  const [enConjugation, setEnConjugation] = useState(
    () => initialCard?.translations?.en?.conjugation || ''
  );
  const [enUsageNotes, setEnUsageNotes] = useState(
    () => initialCard?.translations?.en?.usage_notes || ''
  );
  const [enExamples, setEnExamples] = useState(
    () => initialCard?.translations?.en?.examples || ''
  );
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
      { value: '', label: t('study:cardForm.noCourse') },
      ...courses.map((c) => ({
        value: String(c.id),
        label: c.level ? `${c.title} · ${c.level}` : c.title,
      })),
    ],
    [courses, t]
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
    if (fieldKey === 'meaning') {
      setContentLang('vi');
      requestAnimationFrame(() => {
        meaningInputRef.current?.focus();
      });
      return;
    }
    const refMap = {
      lesson: lessonInputRef,
      frontText: frontInputRef,
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
      setNewCourseError(t('study:cardForm.errors.newCourseNameRequired'));
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
      setErrorMessage(
        err.message || t('study:cardForm.errors.newCourseCreateFailed')
      );
    } finally {
      setCreatingCourse(false);
    }
  };

  const validateFields = () => {
    const nextErrors = {};
    if (!lesson.trim()) {
      nextErrors.lesson = t('study:cardForm.errors.lessonRequired');
    }
    if (showNewCourseForm && newCourseTitle.trim()) {
      nextErrors.newCourseTitle = t('study:cardForm.errors.unsavedNewCourse');
    }
    if (!frontText.trim()) {
      nextErrors.frontText = t('study:cardForm.errors.frontRequired');
    }
    if (!meaning.trim()) {
      nextErrors.meaning = t('study:cardForm.errors.meaningRequired');
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

    const existingTranslations =
      initialCard?.translations && typeof initialCard.translations === 'object'
        ? initialCard.translations
        : {};
    const enFields = {
      meaning: enMeaning.trim(),
      conjugation: enConjugation.trim(),
      usage_notes: enUsageNotes.trim(),
      examples: enExamples.trim(),
    };
    const hasEnContent = Object.values(enFields).some(Boolean);
    const nextTranslations = { ...existingTranslations };
    if (hasEnContent) {
      nextTranslations.en = enFields;
    } else {
      delete nextTranslations.en;
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
      translations: nextTranslations,
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
        setContentLang('vi');
        setMeaning('');
        setConjugation('');
        setUsageNotes('');
        setExamples('');
        setEnMeaning('');
        setEnConjugation('');
        setEnUsageNotes('');
        setEnExamples('');
        setFieldErrors({});
        setErrorMessage('');
        requestAnimationFrame(() => {
          frontInputRef.current?.focus();
        });
      }
    } catch (err) {
      setErrorMessage(err.message || t('study:cardForm.errors.saveFailed'));
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
        className="bg-white border border-slate-200 rounded-surface shadow-sm max-w-2xl w-full max-h-[90vh] flex flex-col animate-popup-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 rounded-t-surface flex items-center justify-between">
          <h2
            id="card-form-modal-title"
            className="text-sm sm:text-base font-semibold text-slate-900"
          >
            {isEditing
              ? t('study:cardForm.editTitle')
              : t('study:cardForm.createTitle')}
          </h2>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleSafeClose}
            aria-label={t('study:cardForm.closeAria')}
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
              className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-control p-3"
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
              className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-control p-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600"
            >
              <p
                id="card-form-error-summary-title"
                className="font-semibold mb-1"
              >
                {t('study:cardForm.requiredSummary')}
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
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              {t('study:cardForm.visibilityLabel')}
            </span>
            <div className="flex bg-slate-100 border border-slate-200 rounded-control p-1 gap-1">
              <button
                type="button"
                aria-pressed={Boolean(isPublic)}
                onClick={() => setIsPublic(true)}
                className={`flex-1 min-h-9 text-xs sm:text-sm font-medium rounded-control transition-colors duration-150 cursor-pointer ${
                  isPublic
                    ? 'bg-sky-700 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {t('study:cardForm.publicOption')}
              </button>
              <button
                type="button"
                aria-pressed={!isPublic}
                onClick={() => setIsPublic(false)}
                className={`flex-1 min-h-9 text-xs sm:text-sm font-medium rounded-control transition-colors duration-150 cursor-pointer ${
                  !isPublic
                    ? 'bg-sky-700 text-white'
                    : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {t('study:cardForm.privateOption')}
              </button>
            </div>
          </div>

          {/* Row: Type, Level, Lesson */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="card-type-select"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('study:cardForm.typeLabel')}
              </label>
              <Dropdown
                id="card-type-select"
                value={cardType}
                onChange={setCardType}
                options={getCardTypeOptions()}
              />
            </div>

            <div>
              <label
                htmlFor="card-level-select"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('study:cardForm.levelLabel')}
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
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('study:cardForm.lessonLabel')}
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
                className="block text-xs font-medium text-slate-700"
              >
                {t('study:cardForm.courseLabel')}
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowNewCourseForm((prev) => !prev);
                  setNewCourseError('');
                  setFieldErrors((prev) => ({ ...prev, newCourseTitle: '' }));
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800 cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" aria-hidden="true" />
                <span>
                  {showNewCourseForm
                    ? t('study:cardForm.toggleNewCourseClose')
                    : t('study:cardForm.toggleNewCourseOpen')}
                </span>
              </button>
            </div>

            {showNewCourseForm ? (
              <div>
                <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-surface bg-slate-50 border border-slate-200">
                  <input
                    ref={newCourseInputRef}
                    type="text"
                    aria-label={t('study:cardForm.newCourseAria')}
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
                    className={`flex-1 min-h-10 px-3.5 py-2 rounded-control border bg-white text-slate-900 text-sm transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 ${
                      newCourseError
                        ? 'border-red-400 focus:border-red-600 focus-visible:outline-red-600'
                        : 'border-slate-200 hover:border-slate-300 focus:border-sky-700 focus-visible:outline-sky-700'
                    }`}
                  />
                  <Button
                    variant="primary"
                    disabled={creatingCourse}
                    onClick={handleQuickCreateCourse}
                  >
                    {creatingCourse
                      ? t('study:cardForm.creatingCourse')
                      : t('study:cardForm.saveCourseButton')}
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
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              {t('study:cardForm.frontLabel')}
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

          {/* Bilingual Translatable Content Tabs */}
          <div className="pt-2 border-t border-slate-200 flex flex-col gap-3.5">
            <div
              role="tablist"
              aria-label={t('common:contentForm.languageTabsAria')}
              className="inline-flex bg-slate-100 border border-slate-200 p-1 rounded-control gap-1 self-start"
            >
              <button
                type="button"
                role="tab"
                aria-selected={contentLang === 'vi'}
                onClick={() => setContentLang('vi')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-control transition-colors duration-150 cursor-pointer ${
                  contentLang === 'vi'
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <span>{t('common:contentForm.viTab')}</span>
                {fieldErrors.meaning && contentLang !== 'vi' && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-red-600"
                    aria-hidden="true"
                  />
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={contentLang === 'en'}
                onClick={() => setContentLang('en')}
                className={`px-3 py-1 text-xs font-medium rounded-control transition-colors duration-150 cursor-pointer ${
                  contentLang === 'en'
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {t('common:contentForm.enTab')}
              </button>
            </div>

            {contentLang === 'vi' ? (
              <>
                {/* Meaning */}
                <div>
                  <label
                    htmlFor="card-meaning"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:cardForm.meaningLabel')}
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
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:cardForm.conjugationLabel')}
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
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:cardForm.usageNotesLabel')}
                  </label>
                  <textarea
                    id="card-usage-notes"
                    rows={2}
                    value={usageNotes}
                    onChange={(e) => setUsageNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 resize-y"
                  />
                </div>

                {/* Examples */}
                <div>
                  <label
                    htmlFor="card-examples"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:cardForm.examplesLabel')}
                  </label>
                  <textarea
                    id="card-examples"
                    rows={3}
                    value={examples}
                    onChange={(e) => setExamples(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm font-jp transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 resize-y"
                  />
                </div>
              </>
            ) : (
              <>
                {/* English Meaning */}
                <div>
                  <label
                    htmlFor="card-meaning-en"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:cardForm.meaningEnLabel')}
                  </label>
                  <input
                    id="card-meaning-en"
                    type="text"
                    value={enMeaning}
                    onChange={(e) => setEnMeaning(e.target.value)}
                    className={`${BASE_INPUT_CLASS} ${VALID_INPUT_CLASS}`}
                  />
                </div>

                {/* English Conjugation / Reading note */}
                <div>
                  <label
                    htmlFor="card-conjugation-en"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:cardForm.conjugationEnLabel')}
                  </label>
                  <input
                    id="card-conjugation-en"
                    type="text"
                    value={enConjugation}
                    onChange={(e) => setEnConjugation(e.target.value)}
                    className={`${BASE_INPUT_CLASS} ${VALID_INPUT_CLASS} font-jp`}
                  />
                </div>

                {/* English Usage Notes */}
                <div>
                  <label
                    htmlFor="card-usage-notes-en"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:cardForm.usageNotesEnLabel')}
                  </label>
                  <textarea
                    id="card-usage-notes-en"
                    rows={2}
                    value={enUsageNotes}
                    onChange={(e) => setEnUsageNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 resize-y"
                  />
                </div>

                {/* English Examples */}
                <div>
                  <label
                    htmlFor="card-examples-en"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:cardForm.examplesEnLabel')}
                  </label>
                  <textarea
                    id="card-examples-en"
                    rows={3}
                    value={enExamples}
                    onChange={(e) => setEnExamples(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm font-jp transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 resize-y"
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              variant="secondary"
              disabled={submitting || creatingCourse}
              onClick={handleSafeClose}
            >
              {hasCreatedCard ? t('common:actions.close') : t('common:actions.cancel')}
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || creatingCourse}
            >
              {submitting
                ? t('common:actions.saving')
                : isEditing
                  ? t('study:cardForm.saveChangesButton')
                  : t('study:cardForm.createCardButton')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
