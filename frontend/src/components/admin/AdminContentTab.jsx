import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  RectangleStackIcon,
  VideoCameraIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import CommonTable from '../ui/CommonTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../../context/useToast';
import {
  JLPT_LEVELS,
  getCardTypeLabel,
  getCardTypeOptions,
} from '../../constants/cards';
import { formatNumber } from '../../utils/formatters';
import {
  fetchAdminCourses,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  fetchAdminCards,
  createAdminCard,
  updateAdminCard,
  deleteAdminCard,
  fetchAdminVideos,
  fetchAdminVideoDetail,
  createAdminVideo,
  updateAdminVideo,
  deleteAdminVideo,
} from '../../services/adminApi';
import {
  AdminSearchInput,
  AdminFilterPopover,
  AdminFilterChips,
  AdminPagination,
  AdminModalShell,
  AdminConfirmDialog,
} from './adminShared';
import { getShadowingTopicOptions } from './adminConstants';

const LEVEL_SELECT_OPTIONS = JLPT_LEVELS.map((lv) => ({
  value: lv,
  label: lv,
}));

function buildEnTranslations(existingTranslations, enFields, segmentsMap = null) {
  const next = { ...(existingTranslations || {}) };
  const prevEn =
    next.en && typeof next.en === 'object' ? { ...next.en } : {};

  Object.entries(enFields).forEach(([key, value]) => {
    const trimmed = String(value || '').trim();
    if (trimmed) {
      prevEn[key] = trimmed;
    } else {
      delete prevEn[key];
    }
  });

  if (segmentsMap !== null) {
    if (Object.keys(segmentsMap).length > 0) {
      prevEn.segments = segmentsMap;
    } else {
      delete prevEn.segments;
    }
  }

  if (Object.keys(prevEn).length > 0) {
    next.en = prevEn;
  } else {
    delete next.en;
  }
  return next;
}

function ContentLanguageTabs({
  contentLang,
  setContentLang,
  hasViError = false,
}) {
  const { t } = useTranslation(['common']);

  return (
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
        {hasViError && contentLang !== 'vi' && (
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
  );
}

function OwnershipVisibilityRow({
  asSystem,
  setAsSystem,
  isPublic,
  setIsPublic,
}) {
  const { t } = useTranslation(['admin']);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-700">
          {t('admin:content.ownership.ownerLabel')}
        </span>
        <div className="grid grid-cols-2 gap-1 bg-slate-100 border border-slate-200 rounded-control p-1 min-h-10">
          <button
            type="button"
            onClick={() => setAsSystem(true)}
            className={`rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer ${
              asSystem
                ? 'bg-sky-700 text-white'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            {t('admin:content.scopes.system')}
          </button>
          <button
            type="button"
            onClick={() => setAsSystem(false)}
            className={`rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer ${
              !asSystem
                ? 'bg-sky-700 text-white'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            {t('admin:content.scopes.personalOption')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-700">
          {t('admin:content.ownership.visibilityLabel')}
        </span>
        <div className="grid grid-cols-2 gap-1 bg-slate-100 border border-slate-200 rounded-control p-1 min-h-10">
          <button
            type="button"
            onClick={() => setIsPublic(true)}
            className={`rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer ${
              isPublic
                ? 'bg-sky-700 text-white'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            {t('admin:content.visibility.public')}
          </button>
          <button
            type="button"
            onClick={() => setIsPublic(false)}
            className={`rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer ${
              !isPublic
                ? 'bg-sky-700 text-white'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            {t('admin:content.visibility.private')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseAdminModal({ isOpen, onClose, editingCourse, onSaved }) {
  const { t } = useTranslation(['admin', 'study', 'common']);
  const isEditing = Boolean(editingCourse);
  const [contentLang, setContentLang] = useState('vi');
  const [title, setTitle] = useState(
    editingCourse?.source_values?.title ?? editingCourse?.title ?? ''
  );
  const [description, setDescription] = useState(
    editingCourse?.source_values?.description ?? editingCourse?.description ?? ''
  );
  const [enTitle, setEnTitle] = useState(
    editingCourse?.translations?.en?.title || ''
  );
  const [enDescription, setEnDescription] = useState(
    editingCourse?.translations?.en?.description || ''
  );
  const [level, setLevel] = useState(editingCourse?.level || 'N3');
  const [cardType, setCardType] = useState(
    editingCourse?.card_type || 'grammar'
  );
  const [asSystem, setAsSystem] = useState(
    editingCourse ? editingCourse.created_by === null : true
  );
  const [isPublic, setIsPublic] = useState(
    editingCourse ? Boolean(editingCourse.is_public) : true
  );
  const [titleError, setTitleError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cardTypeOptions = getCardTypeOptions();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(t('admin:content.courseModal.errors.titleRequired'));
      setContentLang('vi');
      return;
    }
    setTitleError('');
    setFormError('');
    setSubmitting(true);

    try {
      const translations = buildEnTranslations(editingCourse?.translations, {
        title: enTitle,
        description: enDescription,
      });
      const payload = {
        title: title.trim(),
        description: description.trim(),
        translations,
        level,
        card_type: cardType,
        is_public: isPublic,
        as_system: asSystem,
      };
      const saved = isEditing
        ? await updateAdminCourse(editingCourse.id, payload)
        : await createAdminCourse(payload);
      onSaved?.(saved, isEditing);
      onClose?.();
    } catch (err) {
      setFormError(
        err.message || t('admin:content.courseModal.errors.saveFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModalShell
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={
        isEditing
          ? t('admin:content.courseModal.editTitle')
          : t('admin:content.courseModal.createTitle')
      }
      maxWidthClass="sm:max-w-lg"
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && (
          <div className="p-3 rounded-control bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        <OwnershipVisibilityRow
          asSystem={asSystem}
          setAsSystem={setAsSystem}
          isPublic={isPublic}
          setIsPublic={setIsPublic}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              {t('admin:content.courseModal.cardTypeLabel')}
            </span>
            <Dropdown
              value={cardType}
              onChange={setCardType}
              options={cardTypeOptions}
              ariaLabel={t('admin:content.courseModal.cardTypeAria')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              {t('admin:content.courseModal.levelLabel')}
            </span>
            <Dropdown
              value={level}
              onChange={setLevel}
              options={LEVEL_SELECT_OPTIONS}
              ariaLabel={t('admin:content.courseModal.levelAria')}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 flex flex-col gap-3.5">
          <ContentLanguageTabs
            contentLang={contentLang}
            setContentLang={setContentLang}
            hasViError={Boolean(titleError)}
          />

          {contentLang === 'vi' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-course-title"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.courseModal.titleLabel')}
                </label>
                <input
                  id="admin-course-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError && e.target.value.trim()) setTitleError('');
                  }}
                  placeholder={t('admin:content.courseModal.titlePlaceholder')}
                  className={`min-h-10 px-3.5 py-2 rounded-control bg-white border text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                    titleError
                      ? 'border-red-400 focus:border-red-600'
                      : 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
                  }`}
                />
                {titleError && (
                  <span className="text-xs font-medium text-red-600">
                    {titleError}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-course-desc"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.courseModal.descriptionLabel')}
                </label>
                <textarea
                  id="admin-course-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t(
                    'admin:content.courseModal.descriptionPlaceholder'
                  )}
                  className="px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-course-title-en"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.courseModal.titleEnLabel')}
                </label>
                <input
                  id="admin-course-title-en"
                  type="text"
                  value={enTitle}
                  onChange={(e) => setEnTitle(e.target.value)}
                  placeholder={t(
                    'admin:content.courseModal.titleEnPlaceholder'
                  )}
                  className="min-h-10 px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-course-desc-en"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.courseModal.descriptionEnLabel')}
                </label>
                <textarea
                  id="admin-course-desc-en"
                  rows={3}
                  value={enDescription}
                  onChange={(e) => setEnDescription(e.target.value)}
                  placeholder={t(
                    'admin:content.courseModal.descriptionEnPlaceholder'
                  )}
                  className="px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? t('common:actions.saving')
              : isEditing
                ? t('common:actions.saveChanges')
                : t('admin:content.courseModal.submitCreate')}
          </Button>
        </div>
      </form>
    </AdminModalShell>
  );
}

function CardAdminModal({
  isOpen,
  onClose,
  editingCard,
  courseOptions,
  onSaved,
}) {
  const { t } = useTranslation(['admin', 'study', 'common']);
  const isEditing = Boolean(editingCard);
  const [contentLang, setContentLang] = useState('vi');
  const [asSystem, setAsSystem] = useState(
    editingCard ? editingCard.created_by === null : true
  );
  const [isPublic, setIsPublic] = useState(
    editingCard ? Boolean(editingCard.is_public) : true
  );
  const [cardType, setCardType] = useState(
    editingCard?.card_type || 'grammar'
  );
  const [level, setLevel] = useState(editingCard?.level || 'N3');
  const [lesson, setLesson] = useState(
    editingCard?.lesson || t('admin:content.cardModal.defaultLesson')
  );
  const [courseId, setCourseId] = useState(
    editingCard?.course ? String(editingCard.course) : ''
  );
  const [frontText, setFrontText] = useState(editingCard?.front_text || '');
  const [meaning, setMeaning] = useState(
    editingCard?.source_values?.meaning ?? editingCard?.meaning ?? ''
  );
  const [conjugation, setConjugation] = useState(
    editingCard?.source_values?.conjugation ?? editingCard?.conjugation ?? ''
  );
  const [usageNotes, setUsageNotes] = useState(
    editingCard?.source_values?.usage_notes ?? editingCard?.usage_notes ?? ''
  );
  const [examples, setExamples] = useState(
    editingCard?.source_values?.examples ?? editingCard?.examples ?? ''
  );
  const [enMeaning, setEnMeaning] = useState(
    editingCard?.translations?.en?.meaning || ''
  );
  const [enConjugation, setEnConjugation] = useState(
    editingCard?.translations?.en?.conjugation || ''
  );
  const [enUsageNotes, setEnUsageNotes] = useState(
    editingCard?.translations?.en?.usage_notes || ''
  );
  const [enExamples, setEnExamples] = useState(
    editingCard?.translations?.en?.examples || ''
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cardTypeOptions = getCardTypeOptions();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!frontText.trim()) {
      nextErrors.frontText = t('admin:content.cardModal.errors.frontRequired');
    }
    if (!meaning.trim()) {
      nextErrors.meaning = t('admin:content.cardModal.errors.meaningRequired');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.meaning && !nextErrors.frontText) {
        setContentLang('vi');
      }
      return;
    }

    setErrors({});
    setFormError('');
    setSubmitting(true);

    try {
      const translations = buildEnTranslations(editingCard?.translations, {
        meaning: enMeaning,
        conjugation: enConjugation,
        usage_notes: enUsageNotes,
        examples: enExamples,
      });
      const payload = {
        card_type: cardType,
        level,
        lesson: lesson.trim() || t('admin:content.cardModal.defaultLesson'),
        course: courseId ? Number(courseId) : null,
        front_text: frontText.trim(),
        meaning: meaning.trim(),
        conjugation: conjugation.trim(),
        usage_notes: usageNotes.trim(),
        examples: examples.trim(),
        translations,
        is_public: isPublic,
        as_system: asSystem,
      };
      const saved = isEditing
        ? await updateAdminCard(editingCard.id, payload)
        : await createAdminCard(payload);
      onSaved?.(saved, isEditing);
      onClose?.();
    } catch (err) {
      setFormError(
        err.message || t('admin:content.cardModal.errors.saveFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModalShell
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={
        isEditing
          ? t('admin:content.cardModal.editTitle')
          : t('admin:content.cardModal.createTitle')
      }
      maxWidthClass="sm:max-w-xl"
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && (
          <div className="p-3 rounded-control bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        <OwnershipVisibilityRow
          asSystem={asSystem}
          setAsSystem={setAsSystem}
          isPublic={isPublic}
          setIsPublic={setIsPublic}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              {t('admin:content.cardModal.cardTypeLabel')}
            </span>
            <Dropdown
              value={cardType}
              onChange={setCardType}
              options={cardTypeOptions}
              ariaLabel={t('admin:content.cardModal.cardTypeAria')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              {t('admin:content.cardModal.levelLabel')}
            </span>
            <Dropdown
              value={level}
              onChange={setLevel}
              options={LEVEL_SELECT_OPTIONS}
              ariaLabel={t('admin:content.cardModal.levelAria')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-card-lesson"
              className="text-xs font-medium text-slate-700"
            >
              {t('admin:content.cardModal.lessonLabel')}
            </label>
            <input
              id="admin-card-lesson"
              type="text"
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              className="min-h-10 px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
            />
          </div>
        </div>

        {courseOptions.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              {t('admin:content.cardModal.courseLabel')}
            </span>
            <Dropdown
              value={courseId}
              onChange={setCourseId}
              options={courseOptions}
              ariaLabel={t('admin:content.cardModal.courseAria')}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="admin-card-front"
            className="text-xs font-medium text-slate-700"
          >
            {t('admin:content.cardModal.frontLabel')}
          </label>
          <input
            id="admin-card-front"
            type="text"
            value={frontText}
            onChange={(e) => {
              setFrontText(e.target.value);
              if (errors.frontText && e.target.value.trim()) {
                setErrors((prev) => ({ ...prev, frontText: '' }));
              }
            }}
            placeholder={t('admin:content.cardModal.frontPlaceholder')}
            className={`min-h-10 px-3.5 py-2 rounded-control bg-white border text-sm font-jp text-slate-900 transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
              errors.frontText
                ? 'border-red-400 focus:border-red-600'
                : 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
            }`}
          />
          {errors.frontText && (
            <span className="text-xs font-medium text-red-600">
              {errors.frontText}
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200 flex flex-col gap-3.5">
          <ContentLanguageTabs
            contentLang={contentLang}
            setContentLang={setContentLang}
            hasViError={Boolean(errors.meaning)}
          />

          {contentLang === 'vi' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-card-meaning"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.cardModal.meaningLabel')}
                </label>
                <input
                  id="admin-card-meaning"
                  type="text"
                  value={meaning}
                  onChange={(e) => {
                    setMeaning(e.target.value);
                    if (errors.meaning && e.target.value.trim()) {
                      setErrors((prev) => ({ ...prev, meaning: '' }));
                    }
                  }}
                  placeholder={t('admin:content.cardModal.meaningPlaceholder')}
                  className={`min-h-10 px-3.5 py-2 rounded-control bg-white border text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                    errors.meaning
                      ? 'border-red-400 focus:border-red-600'
                      : 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
                  }`}
                />
                {errors.meaning && (
                  <span className="text-xs font-medium text-red-600">
                    {errors.meaning}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-card-conjugation"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.cardModal.conjugationLabel')}
                </label>
                <input
                  id="admin-card-conjugation"
                  type="text"
                  value={conjugation}
                  onChange={(e) => setConjugation(e.target.value)}
                  className="min-h-10 px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="admin-card-notes"
                    className="text-xs font-medium text-slate-700"
                  >
                    {t('admin:content.cardModal.usageNotesLabel')}
                  </label>
                  <textarea
                    id="admin-card-notes"
                    rows={2}
                    value={usageNotes}
                    onChange={(e) => setUsageNotes(e.target.value)}
                    className="px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="admin-card-examples"
                    className="text-xs font-medium text-slate-700"
                  >
                    {t('admin:content.cardModal.examplesLabel')}
                  </label>
                  <textarea
                    id="admin-card-examples"
                    rows={2}
                    value={examples}
                    onChange={(e) => setExamples(e.target.value)}
                    className="px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-card-meaning-en"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.cardModal.meaningEnLabel')}
                </label>
                <input
                  id="admin-card-meaning-en"
                  type="text"
                  value={enMeaning}
                  onChange={(e) => setEnMeaning(e.target.value)}
                  placeholder={t(
                    'admin:content.cardModal.meaningEnPlaceholder'
                  )}
                  className="min-h-10 px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-card-conjugation-en"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.cardModal.conjugationEnLabel')}
                </label>
                <input
                  id="admin-card-conjugation-en"
                  type="text"
                  value={enConjugation}
                  onChange={(e) => setEnConjugation(e.target.value)}
                  className="min-h-10 px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="admin-card-notes-en"
                    className="text-xs font-medium text-slate-700"
                  >
                    {t('admin:content.cardModal.usageNotesEnLabel')}
                  </label>
                  <textarea
                    id="admin-card-notes-en"
                    rows={2}
                    value={enUsageNotes}
                    onChange={(e) => setEnUsageNotes(e.target.value)}
                    className="px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="admin-card-examples-en"
                    className="text-xs font-medium text-slate-700"
                  >
                    {t('admin:content.cardModal.examplesEnLabel')}
                  </label>
                  <textarea
                    id="admin-card-examples-en"
                    rows={2}
                    value={enExamples}
                    onChange={(e) => setEnExamples(e.target.value)}
                    className="px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? t('common:actions.saving')
              : isEditing
                ? t('common:actions.saveChanges')
                : t('admin:content.cardModal.submitCreate')}
          </Button>
        </div>
      </form>
    </AdminModalShell>
  );
}

function VideoAdminModal({ isOpen, onClose, editingVideo, onSaved }) {
  const { t } = useTranslation(['admin', 'shadowing', 'common']);
  const isEditing = Boolean(editingVideo);
  const [contentLang, setContentLang] = useState('vi');
  const [asSystem, setAsSystem] = useState(
    editingVideo ? editingVideo.created_by === null : true
  );
  const [isPublic, setIsPublic] = useState(
    editingVideo ? Boolean(editingVideo.is_public) : true
  );
  const [title, setTitle] = useState(
    editingVideo?.source_values?.title ?? editingVideo?.title ?? ''
  );
  const [description, setDescription] = useState(
    editingVideo?.source_values?.description ?? editingVideo?.description ?? ''
  );
  const [enTitle, setEnTitle] = useState(
    editingVideo?.translations?.en?.title || ''
  );
  const [enDescription, setEnDescription] = useState(
    editingVideo?.translations?.en?.description || ''
  );
  const [topic, setTopic] = useState(editingVideo?.topic || 'conversation');
  const [level, setLevel] = useState(editingVideo?.level || 'N3');
  const [mediaSource, setMediaSource] = useState(
    editingVideo?.media_source || 'youtube'
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    editingVideo?.youtube_url || ''
  );
  const [mediaFile, setMediaFile] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(
    editingVideo?.duration_seconds
      ? String(editingVideo.duration_seconds)
      : '60'
  );
  const [segments, setSegments] = useState(() => {
    const sourceSegments = editingVideo?.source_values?.segments || {};
    const enSegments = editingVideo?.translations?.en?.segments || {};
    if (
      Array.isArray(editingVideo?.segments) &&
      editingVideo.segments.length > 0
    ) {
      return editingVideo.segments.map((seg, idx) => {
        const segKey = String(seg.id ?? idx + 1);
        return {
          id: seg.id || idx + 1,
          start: seg.start ?? 0,
          end: seg.end ?? 5,
          text: seg.text || '',
          ruby_text: seg.ruby_text || '',
          meaning: sourceSegments[segKey]?.meaning ?? seg.meaning ?? '',
          meaning_en: enSegments[segKey]?.meaning || '',
          words: Array.isArray(seg.words) ? seg.words : [],
        };
      });
    }
    return [
      {
        id: 1,
        start: 0,
        end: 5,
        text: '',
        ruby_text: '',
        meaning: '',
        meaning_en: '',
        words: [],
      },
    ];
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const topicOptions = getShadowingTopicOptions();

  const handleSegmentChange = (idx, field, val) => {
    setSegments((prev) =>
      prev.map((seg, i) => (i === idx ? { ...seg, [field]: val } : seg))
    );
  };

  const handleAddSegment = () => {
    setSegments((prev) => {
      const last = prev[prev.length - 1];
      const nextStart = last ? Number(last.end) || 0 : 0;
      return [
        ...prev,
        {
          id: prev.length + 1,
          start: nextStart,
          end: nextStart + 5,
          text: '',
          ruby_text: '',
          meaning: '',
          meaning_en: '',
          words: [],
        },
      ];
    });
  };

  const handleRemoveSegment = (idx) => {
    setSegments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!title.trim()) {
      nextErrors.title = t('admin:content.videoModal.errors.titleRequired');
    }
    if (mediaSource === 'youtube' && !youtubeUrl.trim()) {
      nextErrors.youtubeUrl = t(
        'admin:content.videoModal.errors.youtubeRequired'
      );
    }
    if (!isEditing && mediaSource === 'upload' && !mediaFile) {
      nextErrors.mediaFile = t('admin:content.videoModal.errors.fileRequired');
    }

    const keptSegments = segments.filter((seg) =>
      String(seg.text || '').trim()
    );
    const cleanedSegments = keptSegments.map((seg, idx) => {
      const startVal = Math.max(0, Number(seg.start) || 0);
      const rawEnd = Number(seg.end);
      const endVal =
        Number.isFinite(rawEnd) && rawEnd > startVal ? rawEnd : startVal + 4;
      return {
        id: idx + 1,
        start: startVal,
        end: endVal,
        text: String(seg.text).trim(),
        ruby_text: String(seg.ruby_text || '').trim(),
        meaning: String(seg.meaning || '').trim(),
        words: Array.isArray(seg.words) ? seg.words : [],
      };
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.title) {
        setContentLang('vi');
      }
      return;
    }

    const enSegmentsMap = {};
    keptSegments.forEach((seg, idx) => {
      const enMeaningVal = String(seg.meaning_en || '').trim();
      if (enMeaningVal) {
        enSegmentsMap[String(idx + 1)] = { meaning: enMeaningVal };
      }
    });

    const translationsPayload = buildEnTranslations(
      editingVideo?.translations,
      {
        title: enTitle,
        description: enDescription,
      },
      enSegmentsMap
    );

    setErrors({});
    setFormError('');
    setSubmitting(true);

    try {
      let body;
      if (mediaFile) {
        const fd = new FormData();
        fd.append('title', title.trim());
        fd.append('description', description.trim());
        fd.append('topic', topic);
        fd.append('level', level);
        fd.append('media_source', 'upload');
        fd.append('media_file', mediaFile);
        fd.append(
          'duration_seconds',
          String(Math.max(0, Number(durationSeconds) || 0))
        );
        fd.append('is_public', String(isPublic));
        fd.append('as_system', String(asSystem));
        fd.append('segments', JSON.stringify(cleanedSegments));
        fd.append('translations', JSON.stringify(translationsPayload));
        body = fd;
      } else {
        body = {
          title: title.trim(),
          description: description.trim(),
          topic,
          level,
          media_source: mediaSource,
          youtube_url: mediaSource === 'youtube' ? youtubeUrl.trim() : '',
          duration_seconds: Math.max(0, Number(durationSeconds) || 0),
          is_public: isPublic,
          as_system: asSystem,
          segments: cleanedSegments,
          translations: translationsPayload,
        };
      }

      const saved = isEditing
        ? await updateAdminVideo(editingVideo.id, body)
        : await createAdminVideo(body);
      onSaved?.(saved, isEditing);
      onClose?.();
    } catch (err) {
      setFormError(
        err.message || t('admin:content.videoModal.errors.saveFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModalShell
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={
        isEditing
          ? t('admin:content.videoModal.editTitle')
          : t('admin:content.videoModal.createTitle')
      }
      maxWidthClass="sm:max-w-2xl"
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && (
          <div className="p-3 rounded-control bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        <OwnershipVisibilityRow
          asSystem={asSystem}
          setAsSystem={setAsSystem}
          isPublic={isPublic}
          setIsPublic={setIsPublic}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              {t('admin:content.videoModal.topicLabel')}
            </span>
            <Dropdown
              value={topic}
              onChange={setTopic}
              options={topicOptions}
              ariaLabel={t('admin:content.videoModal.topicAria')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              {t('admin:content.videoModal.levelLabel')}
            </span>
            <Dropdown
              value={level}
              onChange={setLevel}
              options={LEVEL_SELECT_OPTIONS}
              ariaLabel={t('admin:content.videoModal.levelAria')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-video-duration"
              className="text-xs font-medium text-slate-700"
            >
              {t('admin:content.videoModal.durationLabel')}
            </label>
            <input
              id="admin-video-duration"
              type="number"
              min="0"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              className="min-h-10 px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 tabular-nums transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium text-slate-700">
            {t('admin:content.videoModal.mediaSourceLabel')}
          </span>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 border border-slate-200 rounded-control p-1 min-h-10">
            <button
              type="button"
              onClick={() => setMediaSource('youtube')}
              className={`rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer ${
                mediaSource === 'youtube'
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              {t('admin:content.videoModal.sourceYoutube')}
            </button>
            <button
              type="button"
              onClick={() => setMediaSource('upload')}
              className={`rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer ${
                mediaSource === 'upload'
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              {t('admin:content.videoModal.sourceUpload')}
            </button>
          </div>

          {mediaSource === 'youtube' ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-video-yt"
                className="text-xs font-medium text-slate-700"
              >
                {t('admin:content.videoModal.youtubeUrlLabel')}
              </label>
              <input
                id="admin-video-yt"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder={t('admin:content.videoModal.youtubePlaceholder')}
                className={`min-h-10 px-3.5 py-2 rounded-control bg-white border text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                  errors.youtubeUrl
                    ? 'border-red-400 focus:border-red-600'
                    : 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
                }`}
              />
              {errors.youtubeUrl && (
                <span className="text-xs font-medium text-red-600">
                  {errors.youtubeUrl}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-video-file"
                className="text-xs font-medium text-slate-700"
              >
                {isEditing
                  ? t('admin:content.videoModal.replaceFileLabel')
                  : t('admin:content.videoModal.uploadFileLabel')}
              </label>
              <input
                id="admin-video-file"
                type="file"
                accept="audio/*,video/*"
                onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                className="min-h-10 px-3 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-xs sm:text-sm text-slate-700 transition-colors duration-150"
              />
              {errors.mediaFile && (
                <span className="text-xs font-medium text-red-600">
                  {errors.mediaFile}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200 flex flex-col gap-3.5">
          <ContentLanguageTabs
            contentLang={contentLang}
            setContentLang={setContentLang}
            hasViError={Boolean(errors.title)}
          />

          {contentLang === 'vi' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-video-title"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.videoModal.titleLabel')}
                </label>
                <input
                  id="admin-video-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title && e.target.value.trim()) {
                      setErrors((prev) => ({ ...prev, title: '' }));
                    }
                  }}
                  placeholder={t('admin:content.videoModal.titlePlaceholder')}
                  className={`min-h-10 px-3.5 py-2 rounded-control bg-white border text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                    errors.title
                      ? 'border-red-400 focus:border-red-600'
                      : 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
                  }`}
                />
                {errors.title && (
                  <span className="text-xs font-medium text-red-600">
                    {errors.title}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-video-desc"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.videoModal.descriptionLabel')}
                </label>
                <input
                  id="admin-video-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-10 px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-video-title-en"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.videoModal.titleEnLabel')}
                </label>
                <input
                  id="admin-video-title-en"
                  type="text"
                  value={enTitle}
                  onChange={(e) => setEnTitle(e.target.value)}
                  placeholder={t('admin:content.videoModal.titleEnPlaceholder')}
                  className="min-h-10 px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-video-desc-en"
                  className="text-xs font-medium text-slate-700"
                >
                  {t('admin:content.videoModal.descriptionEnLabel')}
                </label>
                <input
                  id="admin-video-desc-en"
                  type="text"
                  value={enDescription}
                  onChange={(e) => setEnDescription(e.target.value)}
                  placeholder={t(
                    'admin:content.videoModal.descriptionEnPlaceholder'
                  )}
                  className="min-h-10 px-3.5 py-2 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>
            </>
          )}

          {/* Clean Divided Subtitle Editor */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 tabular-nums">
                {t('admin:content.videoModal.segmentsTitle', {
                  count: formatNumber(segments.length),
                })}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddSegment}
              >
                <PlusIcon className="w-4 h-4" aria-hidden="true" />
                <span>{t('admin:content.videoModal.addSegmentButton')}</span>
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-surface border border-slate-200 divide-y divide-slate-200 bg-white">
              {segments.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  {t('admin:content.videoModal.emptySegments')}
                </div>
              ) : (
                segments.map((seg, idx) => (
                  <div key={idx} className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-sky-800 tabular-nums">
                          #{formatNumber(idx + 1)}
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={seg.start}
                          onChange={(e) =>
                            handleSegmentChange(idx, 'start', e.target.value)
                          }
                          aria-label={t(
                            'admin:content.videoModal.segmentStartAria',
                            { index: idx + 1 }
                          )}
                          className="w-16 h-8 px-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-900 tabular-nums focus:outline-none focus:border-sky-700"
                        />
                        <span className="text-xs text-slate-400">→</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={seg.end}
                          onChange={(e) =>
                            handleSegmentChange(idx, 'end', e.target.value)
                          }
                          aria-label={t(
                            'admin:content.videoModal.segmentEndAria',
                            { index: idx + 1 }
                          )}
                          className="w-16 h-8 px-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-900 tabular-nums focus:outline-none focus:border-sky-700"
                        />
                        <span className="text-xs text-slate-400">
                          {t('admin:content.videoModal.secondsUnit')}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSegment(idx)}
                        aria-label={t(
                          'admin:content.videoModal.removeSegmentAria',
                          { index: idx + 1 }
                        )}
                      >
                        <TrashIcon className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={seg.text}
                        onChange={(e) =>
                          handleSegmentChange(idx, 'text', e.target.value)
                        }
                        placeholder={t(
                          'admin:content.videoModal.segmentTextPlaceholder'
                        )}
                        aria-label={t(
                          'admin:content.videoModal.segmentTextAria',
                          { index: idx + 1 }
                        )}
                        className="h-9 px-3 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-xs sm:text-sm font-jp text-slate-900 focus:outline-none focus:border-sky-700"
                      />
                      {contentLang === 'vi' ? (
                        <input
                          type="text"
                          value={seg.meaning}
                          onChange={(e) =>
                            handleSegmentChange(idx, 'meaning', e.target.value)
                          }
                          placeholder={t(
                            'admin:content.videoModal.segmentMeaningPlaceholder'
                          )}
                          aria-label={t(
                            'admin:content.videoModal.segmentMeaningAria',
                            { index: idx + 1 }
                          )}
                          className="h-9 px-3 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-sky-700"
                        />
                      ) : (
                        <input
                          type="text"
                          value={seg.meaning_en}
                          onChange={(e) =>
                            handleSegmentChange(
                              idx,
                              'meaning_en',
                              e.target.value
                            )
                          }
                          placeholder={t(
                            'admin:content.videoModal.segmentMeaningEnPlaceholder'
                          )}
                          aria-label={t(
                            'admin:content.videoModal.segmentMeaningEnAria',
                            { index: idx + 1 }
                          )}
                          className="h-9 px-3 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-sky-700"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? t('common:actions.saving')
              : isEditing
                ? t('common:actions.saveChanges')
                : t('admin:content.videoModal.submitCreate')}
          </Button>
        </div>
      </form>
    </AdminModalShell>
  );
}

export default function AdminContentTab({ hasPermission, hasAnyPermission }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['admin', 'study', 'shadowing', 'common']);
  const { showToast } = useToast();

  const checkAny = (codes) =>
    hasAnyPermission
      ? hasAnyPermission(codes)
      : codes.some((c) => hasPermission?.(c));

  const canViewCourses = checkAny([
    'courses.view_all',
    'courses.create',
    'courses.edit',
    'courses.delete',
  ]);
  const canCreateCourse = Boolean(hasPermission('courses.create'));
  const canEditCourse = Boolean(hasPermission('courses.edit'));
  const canDeleteCourse = Boolean(hasPermission('courses.delete'));

  const canViewCards = checkAny([
    'cards.view_all',
    'cards.create',
    'cards.edit',
    'cards.delete',
  ]);
  const canCreateCard = Boolean(hasPermission('cards.create'));
  const canEditCard = Boolean(hasPermission('cards.edit'));
  const canDeleteCard = Boolean(hasPermission('cards.delete'));

  const canViewVideos = checkAny([
    'shadowing.view_all',
    'shadowing.create',
    'shadowing.edit',
    'shadowing.delete',
  ]);
  const canCreateVideo = Boolean(hasPermission('shadowing.create'));
  const canEditVideo = Boolean(hasPermission('shadowing.edit'));
  const canDeleteVideo = Boolean(hasPermission('shadowing.delete'));

  const availableTabs = useMemo(() => {
    const list = [];
    if (canViewCourses) {
      list.push({ id: 'courses', label: t('admin:content.tabs.courses') });
    }
    if (canViewCards) {
      list.push({ id: 'cards', label: t('admin:content.tabs.cards') });
    }
    if (canViewVideos) {
      list.push({
        id: 'videos',
        label: t('admin:content.tabs.videos'),
      });
    }
    return list;
  }, [canViewCourses, canViewCards, canViewVideos, t]);

  const [subTab, setSubTab] = useState(() => availableTabs[0]?.id || 'courses');
  const activeSubTab = availableTabs.some((tab) => tab.id === subTab)
    ? subTab
    : availableTabs[0]?.id || 'courses';

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');

  const [courseList, setCourseList] = useState([]);
  const courseSelectOptions = useMemo(() => {
    const opts = [{ value: '', label: t('admin:content.table.noCourseOption') }];
    courseList.forEach((c) => {
      opts.push({
        value: String(c.id),
        label: `${c.title} • ${c.level}`,
      });
    });
    return opts;
  }, [courseList, t]);

  const [courseModal, setCourseModal] = useState({ open: false, item: null });
  const [cardModal, setCardModal] = useState({ open: false, item: null });
  const [videoModal, setVideoModal] = useState({ open: false, item: null });
  const [loadingVideoId, setLoadingVideoId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!canViewCourses || (!canCreateCard && !canEditCard)) return undefined;
    let ignore = false;
    fetchAdminCourses({ page_size: 100 })
      .then((res) => {
        if (ignore) return;
        setCourseList(Array.isArray(res?.results) ? res.results : []);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [canViewCourses, canCreateCard, canEditCard, reloadTick, i18n.language]);

  useEffect(() => {
    if (availableTabs.length === 0) return undefined;
    let ignore = false;
    const params = {
      page,
      search: debouncedSearch,
      scope: scopeFilter,
      visibility: visibilityFilter,
      level: levelFilter,
    };

    const reqPromise =
      activeSubTab === 'courses'
        ? fetchAdminCourses({ ...params, card_type: typeFilter })
        : activeSubTab === 'cards'
          ? fetchAdminCards({ ...params, card_type: typeFilter })
          : fetchAdminVideos({ ...params, topic: topicFilter });

    reqPromise
      .then((res) => {
        if (ignore) return;
        setItems(Array.isArray(res?.results) ? res.results : []);
        setTotalPages(res?.total_pages || 1);
        setTotal(res?.total || 0);
        setError('');
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || t('admin:content.table.loadError'));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [
    availableTabs.length,
    activeSubTab,
    page,
    debouncedSearch,
    scopeFilter,
    visibilityFilter,
    levelFilter,
    typeFilter,
    topicFilter,
    reloadTick,
    i18n.language,
    t,
  ]);

  const handleSwitchSubTab = (nextId) => {
    if (nextId === activeSubTab) return;
    setLoading(true);
    setItems([]);
    setPage(1);
    setTypeFilter('');
    setTopicFilter('');
    setSubTab(nextId);
  };

  const handleResetFilters = () => {
    setLoading(true);
    setScopeFilter('');
    setVisibilityFilter('');
    setLevelFilter('');
    setTypeFilter('');
    setTopicFilter('');
    setPage(1);
  };

  const handleOpenEditVideo = async (videoSummary) => {
    setLoadingVideoId(videoSummary.id);
    try {
      const fullVideo = await fetchAdminVideoDetail(videoSummary.id);
      setVideoModal({ open: true, item: fullVideo });
    } catch (err) {
      showToast(
        err.message || t('admin:content.table.videoDetailLoadError'),
        'error'
      );
    } finally {
      setLoadingVideoId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      if (deleteTarget.domain === 'courses') {
        await deleteAdminCourse(deleteTarget.id);
      } else if (deleteTarget.domain === 'cards') {
        await deleteAdminCard(deleteTarget.id);
      } else {
        await deleteAdminVideo(deleteTarget.id);
      }
      showToast(
        t('admin:content.toasts.deleted', { label: deleteTarget.label }),
        'success'
      );
      setDeleteTarget(null);
      setLoading(true);
      setReloadTick((prev) => prev + 1);
    } catch (err) {
      showToast(
        err.message || t('admin:content.toasts.deleteFailed'),
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  const filterSections = useMemo(() => {
    const scopeOptions = [
      { value: '', label: t('admin:content.scopes.all') },
      { value: 'system', label: t('admin:content.scopes.system') },
      { value: 'user', label: t('admin:content.scopes.user') },
    ];
    const visibilityOptions = [
      { value: '', label: t('admin:content.visibility.all') },
      { value: 'public', label: t('admin:content.visibility.public') },
      { value: 'private', label: t('admin:content.visibility.private') },
    ];
    const levelFilterOptions = [
      { value: '', label: t('admin:content.filters.allLevels') },
      ...LEVEL_SELECT_OPTIONS,
    ];
    const typeFilterOptions = [
      { value: '', label: t('admin:content.filters.allTypes') },
      ...getCardTypeOptions(),
    ];
    const topicFilterOptions = [
      { value: '', label: t('admin:content.filters.allTopics') },
      ...getShadowingTopicOptions(),
    ];

    return [
      {
        key: 'scope',
        label: t('admin:content.filters.scopeLabel'),
        options: scopeOptions,
      },
      {
        key: 'visibility',
        label: t('admin:content.filters.visibilityLabel'),
        options: visibilityOptions,
      },
      {
        key: 'level',
        label: t('admin:content.filters.levelLabel'),
        options: levelFilterOptions,
      },
      activeSubTab === 'videos'
        ? {
            key: 'topic',
            label: t('admin:content.filters.topicLabel'),
            options: topicFilterOptions,
          }
        : {
            key: 'type',
            label: t('admin:content.filters.typeLabel'),
            options: typeFilterOptions,
          },
    ];
  }, [activeSubTab, t]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (scopeFilter) {
      chips.push({
        key: 'scope',
        label:
          scopeFilter === 'system'
            ? t('admin:content.scopes.chipSystem')
            : scopeFilter === 'user'
              ? t('admin:content.scopes.chipUser')
              : scopeFilter,
        onRemove: () => {
          setLoading(true);
          setScopeFilter('');
          setPage(1);
        },
      });
    }
    if (visibilityFilter) {
      chips.push({
        key: 'visibility',
        label:
          visibilityFilter === 'public'
            ? t('admin:content.visibility.public')
            : visibilityFilter === 'private'
              ? t('admin:content.visibility.private')
              : visibilityFilter,
        onRemove: () => {
          setLoading(true);
          setVisibilityFilter('');
          setPage(1);
        },
      });
    }
    if (levelFilter) {
      chips.push({
        key: 'level',
        label: t('admin:content.filters.levelChip', { level: levelFilter }),
        onRemove: () => {
          setLoading(true);
          setLevelFilter('');
          setPage(1);
        },
      });
    }
    if (activeSubTab === 'videos' && topicFilter) {
      const topicObj = getShadowingTopicOptions().find(
        (topicItem) => topicItem.value === topicFilter
      );
      chips.push({
        key: 'topic',
        label: topicObj?.label || topicFilter,
        onRemove: () => {
          setLoading(true);
          setTopicFilter('');
          setPage(1);
        },
      });
    }
    if (activeSubTab !== 'videos' && typeFilter) {
      chips.push({
        key: 'type',
        label: getCardTypeLabel(typeFilter) || typeFilter,
        onRemove: () => {
          setLoading(true);
          setTypeFilter('');
          setPage(1);
        },
      });
    }
    return chips;
  }, [
    scopeFilter,
    visibilityFilter,
    levelFilter,
    topicFilter,
    typeFilter,
    activeSubTab,
    t,
  ]);

  const canEditCurrentTab =
    activeSubTab === 'courses'
      ? canEditCourse
      : activeSubTab === 'cards'
        ? canEditCard
        : canEditVideo;
  const canDeleteCurrentTab =
    activeSubTab === 'courses'
      ? canDeleteCourse
      : activeSubTab === 'cards'
        ? canDeleteCard
        : canDeleteVideo;
  const hasRowActions =
    activeSubTab === 'videos' || canEditCurrentTab || canDeleteCurrentTab;

  return (
    <div className="flex flex-col gap-3.5">
      <Card className="flex flex-col">
        {/* Integrated SaaS Toolbar */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-control overflow-x-auto max-w-full self-start shrink-0">
            {availableTabs.map((tab) => {
              const active = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSwitchSubTab(tab.id)}
                  className={`h-8 px-3 rounded-control text-xs sm:text-sm font-medium inline-flex items-center justify-center whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                    active
                      ? 'bg-sky-700 text-white'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 xl:max-w-xl xl:justify-end">
            <AdminSearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder={
                activeSubTab === 'courses'
                  ? t('admin:content.toolbar.searchCoursesPlaceholder')
                  : activeSubTab === 'cards'
                    ? t('admin:content.toolbar.searchCardsPlaceholder')
                    : t('admin:content.toolbar.searchVideosPlaceholder')
              }
              ariaLabel={t('admin:content.toolbar.searchAria')}
            />

            <AdminFilterPopover
              title={t('admin:content.filters.title')}
              sections={filterSections}
              values={{
                scope: scopeFilter,
                visibility: visibilityFilter,
                level: levelFilter,
                type: typeFilter,
                topic: topicFilter,
              }}
              onApply={(vals) => {
                setLoading(true);
                setScopeFilter(vals.scope || '');
                setVisibilityFilter(vals.visibility || '');
                setLevelFilter(vals.level || '');
                setTypeFilter(vals.type || '');
                setTopicFilter(vals.topic || '');
                setPage(1);
              }}
              onReset={handleResetFilters}
            />

            {activeSubTab === 'courses' && canCreateCourse && (
              <Button
                variant="primary"
                size="md"
                className="shrink-0"
                onClick={() => setCourseModal({ open: true, item: null })}
              >
                <PlusIcon className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {t('admin:content.toolbar.createCourse')}
                </span>
                <span className="sm:hidden">
                  {t('admin:content.toolbar.createShort')}
                </span>
              </Button>
            )}
            {activeSubTab === 'cards' && canCreateCard && (
              <Button
                variant="primary"
                size="md"
                className="shrink-0"
                onClick={() => setCardModal({ open: true, item: null })}
              >
                <PlusIcon className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {t('admin:content.toolbar.createCard')}
                </span>
                <span className="sm:hidden">
                  {t('admin:content.toolbar.createShort')}
                </span>
              </Button>
            )}
            {activeSubTab === 'videos' && canCreateVideo && (
              <Button
                variant="primary"
                size="md"
                className="shrink-0"
                onClick={() => setVideoModal({ open: true, item: null })}
              >
                <PlusIcon className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {t('admin:content.toolbar.createVideo')}
                </span>
                <span className="sm:hidden">
                  {t('admin:content.toolbar.addShort')}
                </span>
              </Button>
            )}
          </div>
        </div>

        <AdminFilterChips chips={activeChips} onClearAll={handleResetFilters} />

        {loading && items.length === 0 ? (
          <Skeleton variant="admin-list" count={6} embedded />
        ) : error && items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ExclamationCircleIcon}
              title={t('admin:content.table.loadErrorTitle')}
              description={error}
              actionLabel={t('common:actions.retry')}
              onAction={() => {
                setLoading(true);
                setReloadTick((prev) => prev + 1);
              }}
            />
          </div>
        ) : (
          <CommonTable
            embedded
            columns={[
              {
                key: 'content',
                header: t('admin:content.table.columns.content'),
                cellClassName: 'max-w-80',
                render: (item) => {
                  const primaryLabel =
                    activeSubTab === 'cards' ? item.front_text : item.title;
                  const secondaryLabel =
                    activeSubTab === 'courses'
                      ? t('admin:content.table.courseCardsCount', {
                          count: formatNumber(item.card_count || 0),
                        })
                      : activeSubTab === 'cards'
                        ? `${item.meaning}${item.course_title ? ` • ${item.course_title}` : ` • ${item.lesson}`}`
                        : t('admin:content.table.videoMeta', {
                            segments: formatNumber(item.total_segments || 0),
                            source:
                              item.media_source === 'youtube'
                                ? t('admin:content.table.sourceYoutube')
                                : t('admin:content.table.sourceUpload'),
                          });

                  return (
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-slate-900 truncate">
                        {primaryLabel}
                      </span>
                      <span className="text-xs text-slate-500 truncate tabular-nums">
                        {secondaryLabel}
                      </span>
                    </div>
                  );
                },
              },
              {
                key: 'category',
                header: t('admin:content.table.columns.category'),
                cellClassName: 'whitespace-nowrap',
                render: (item) => (
                  <div className="flex items-center gap-2">
                    <Badge variant="level">{item.level}</Badge>
                    <Badge variant="type">
                      {activeSubTab === 'videos'
                        ? t(`shadowing:topics.${item.topic}`, {
                            defaultValue: item.topic_display || item.topic,
                          })
                        : getCardTypeLabel(item.card_type) || item.card_type}
                    </Badge>
                  </div>
                ),
              },
              {
                key: 'owner',
                header: t('admin:content.table.columns.owner'),
                cellClassName: 'whitespace-nowrap',
                render: (item) => {
                  const isSystem = item.created_by === null;
                  const creatorName =
                    item.created_by_username ||
                    item.creator_username ||
                    t('admin:content.scopes.system');
                  return (
                    <Badge variant={isSystem ? 'lesson' : 'default'}>
                      {isSystem
                        ? t('admin:content.scopes.system')
                        : `@${creatorName}`}
                    </Badge>
                  );
                },
              },
              {
                key: 'visibility',
                header: t('admin:content.table.columns.visibility'),
                cellClassName: 'whitespace-nowrap',
                render: (item) => (
                  <Badge variant={item.is_public ? 'public' : 'private'}>
                    {item.is_public
                      ? t('admin:content.visibility.public')
                      : t('admin:content.visibility.private')}
                  </Badge>
                ),
              },
              hasRowActions && {
                key: 'actions',
                header: t('admin:content.table.columns.actions'),
                align: 'right',
                render: (item) => {
                  const primaryLabel =
                    activeSubTab === 'cards' ? item.front_text : item.title;
                  return (
                    <div className="inline-flex items-center justify-end gap-1">
                      {activeSubTab === 'videos' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/shadowing/${item.id}`)}
                          aria-label={t('admin:content.table.openPracticeAria', {
                            label: primaryLabel,
                          })}
                        >
                          <ArrowTopRightOnSquareIcon
                            className="w-4 h-4"
                            aria-hidden="true"
                          />
                        </Button>
                      )}
                      {canEditCurrentTab && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={loadingVideoId === item.id}
                          onClick={() => {
                            if (activeSubTab === 'courses') {
                              setCourseModal({ open: true, item });
                            } else if (activeSubTab === 'cards') {
                              setCardModal({ open: true, item });
                            } else {
                              handleOpenEditVideo(item);
                            }
                          }}
                          aria-label={t('admin:content.table.editAria', {
                            label: primaryLabel,
                          })}
                        >
                          <PencilSquareIcon
                            className="w-4 h-4"
                            aria-hidden="true"
                          />
                        </Button>
                      )}
                      {canDeleteCurrentTab && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() =>
                            setDeleteTarget({
                              domain: activeSubTab,
                              id: item.id,
                              label: primaryLabel,
                            })
                          }
                          aria-label={t('admin:content.table.deleteAria', {
                            label: primaryLabel,
                          })}
                        >
                          <TrashIcon className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={items}
            getRowKey={(item) => item.id}
            mobileRowClassName="flex flex-col gap-3"
            renderMobileRow={(item) => {
              const isSystem = item.created_by === null;
              const creatorName =
                item.created_by_username ||
                item.creator_username ||
                t('admin:content.scopes.system');
              const primaryLabel =
                activeSubTab === 'cards' ? item.front_text : item.title;
              const secondaryLabel =
                activeSubTab === 'courses'
                  ? t('admin:content.table.courseCardsCount', {
                      count: formatNumber(item.card_count || 0),
                    })
                  : activeSubTab === 'cards'
                    ? item.meaning
                    : t('admin:content.table.videoMeta', {
                        segments: formatNumber(item.total_segments || 0),
                        source:
                          item.media_source === 'youtube'
                            ? t('admin:content.table.sourceYoutube')
                            : t('admin:content.table.sourceUpload'),
                      });

              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-900 block truncate">
                        {primaryLabel}
                      </span>
                      <span className="text-xs text-slate-500 block truncate tabular-nums">
                        {secondaryLabel}
                      </span>
                    </div>
                    <Badge variant={item.is_public ? 'public' : 'private'}>
                      {item.is_public
                        ? t('admin:content.visibility.public')
                        : t('admin:content.visibility.private')}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="level">{item.level}</Badge>
                    <Badge variant="type">
                      {activeSubTab === 'videos'
                        ? t(`shadowing:topics.${item.topic}`, {
                            defaultValue: item.topic_display || item.topic,
                          })
                        : getCardTypeLabel(item.card_type) || item.card_type}
                    </Badge>
                    <Badge variant={isSystem ? 'lesson' : 'default'}>
                      {isSystem
                        ? t('admin:content.scopes.system')
                        : `@${creatorName}`}
                    </Badge>
                  </div>

                  {hasRowActions && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      {activeSubTab === 'videos' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/shadowing/${item.id}`)}
                        >
                          <ArrowTopRightOnSquareIcon
                            className="w-4 h-4"
                            aria-hidden="true"
                          />
                          <span>{t('admin:content.table.mobileOpen')}</span>
                        </Button>
                      )}
                      {canEditCurrentTab && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={loadingVideoId === item.id}
                          onClick={() => {
                            if (activeSubTab === 'courses') {
                              setCourseModal({ open: true, item });
                            } else if (activeSubTab === 'cards') {
                              setCardModal({ open: true, item });
                            } else {
                              handleOpenEditVideo(item);
                            }
                          }}
                        >
                          <PencilSquareIcon
                            className="w-4 h-4"
                            aria-hidden="true"
                          />
                          <span>{t('admin:content.table.mobileEdit')}</span>
                        </Button>
                      )}
                      {canDeleteCurrentTab && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() =>
                            setDeleteTarget({
                              domain: activeSubTab,
                              id: item.id,
                              label: primaryLabel,
                            })
                          }
                          aria-label={t('admin:content.table.deleteAria', {
                            label: primaryLabel,
                          })}
                        >
                          <TrashIcon className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  )}
                </>
              );
            }}
            emptyState={
              <EmptyState
                icon={
                  activeSubTab === 'courses'
                    ? BookOpenIcon
                    : activeSubTab === 'cards'
                      ? RectangleStackIcon
                      : VideoCameraIcon
                }
                title={t('admin:content.table.emptyTitle')}
              />
            }
            footer={
              <AdminPagination
                page={page}
                totalPages={totalPages}
                total={total}
                onPageChange={(nextPage) => {
                  setLoading(true);
                  setPage(nextPage);
                }}
              />
            }
            ariaLabel={t('admin:content.table.ariaLabel')}
          />
        )}
      </Card>

      {/* Modals */}
      {courseModal.open && (
        <CourseAdminModal
          key={
            courseModal.item
              ? `edit-course-${courseModal.item.id}`
              : 'create-course'
          }
          isOpen={courseModal.open}
          onClose={() => setCourseModal({ open: false, item: null })}
          editingCourse={courseModal.item}
          onSaved={(saved, wasEdit) => {
            showToast(
              wasEdit
                ? t('admin:content.toasts.courseUpdated', {
                    title: saved.title,
                  })
                : t('admin:content.toasts.courseCreated', {
                    title: saved.title,
                  }),
              'success'
            );
            setLoading(true);
            setReloadTick((prev) => prev + 1);
          }}
        />
      )}

      {cardModal.open && (
        <CardAdminModal
          key={
            cardModal.item ? `edit-card-${cardModal.item.id}` : 'create-card'
          }
          isOpen={cardModal.open}
          onClose={() => setCardModal({ open: false, item: null })}
          editingCard={cardModal.item}
          courseOptions={courseSelectOptions}
          onSaved={(saved, wasEdit) => {
            showToast(
              wasEdit
                ? t('admin:content.toasts.cardUpdated', {
                    text: saved.front_text,
                  })
                : t('admin:content.toasts.cardCreated', {
                    text: saved.front_text,
                  }),
              'success'
            );
            setLoading(true);
            setReloadTick((prev) => prev + 1);
          }}
        />
      )}

      {videoModal.open && (
        <VideoAdminModal
          key={
            videoModal.item
              ? `edit-video-${videoModal.item.id}`
              : 'create-video'
          }
          isOpen={videoModal.open}
          onClose={() => setVideoModal({ open: false, item: null })}
          editingVideo={videoModal.item}
          onSaved={(saved, wasEdit) => {
            showToast(
              wasEdit
                ? t('admin:content.toasts.videoUpdated', {
                    title: saved.title,
                  })
                : t('admin:content.toasts.videoCreated', {
                    title: saved.title,
                  }),
              'success'
            );
            setLoading(true);
            setReloadTick((prev) => prev + 1);
          }}
        />
      )}

      <AdminConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('admin:content.deleteConfirm.title')}
        message={t('admin:content.deleteConfirm.message', {
          label: deleteTarget?.label || '',
        })}
        confirmLabel={t('admin:content.deleteConfirm.confirmLabel')}
        submitting={deleting}
      />
    </div>
  );
}
