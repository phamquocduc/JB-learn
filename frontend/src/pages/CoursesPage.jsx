import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Navigate,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BookOpenIcon,
  ChevronRightIcon,
  LanguageIcon,
  AcademicCapIcon,
  XMarkIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/useAuth';
import { useSystemConfig } from '../context/useSystemConfig';
import { useToast } from '../context/useToast';
import {
  getCardTypeLabel,
  getCardTypeOptions,
  JLPT_LEVELS,
} from '../constants/cards';
import { formatNumber } from '../utils/formatters';
import {
  fetchCourses,
  fetchCards,
  createCourse,
  updateCourse,
  deleteCourse,
  syncCardReviews,
} from '../services/api';
import {
  getCardStatusMap,
  mergeServerSrsMap,
  getLastStudySession,
  saveLastStudySession,
  getUnsyncedSyncPayload,
  clearSyncedReviews,
} from '../services/studyProgress';

const FILTER_TABS = [
  { id: 'all', labelKey: 'study:courses.filters.all' },
  { id: 'learning', labelKey: 'study:courses.filters.learning' },
  { id: 'unseen', labelKey: 'study:courses.filters.unseen' },
];

function getCourseVisual(cardType) {
  if (cardType === 'vocabulary') {
    return {
      icon: LanguageIcon,
      boxClass: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
    };
  }
  if (cardType === 'kanji') {
    return {
      icon: AcademicCapIcon,
      boxClass: 'bg-sky-50 border border-sky-200 text-sky-700',
    };
  }
  return {
    icon: BookOpenIcon,
    boxClass: 'bg-sky-50 border border-sky-200 text-sky-700',
  };
}

export default function CoursesPage() {
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasLegacyStudyParams = Boolean(
    searchParams.get('course') || searchParams.get('status')
  );
  const {
    user,
    isGuest,
    loading: authLoading,
    hasPermission,
    hasAnyPermission,
  } = useAuth();
  const { isModuleEnabled, getModuleBlockReason, getModuleInfo } =
    useSystemConfig();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation(['study', 'common']);

  useEffect(() => {
    document.title = t('study:pageTitles.courses');
  }, [t]);

  const coursesModuleEnabled = isModuleEnabled('courses');
  const canViewCourses = Boolean(
    coursesModuleEnabled &&
      (isGuest ||
        hasAnyPermission([
          'courses.view',
          'courses.view_all',
          'courses.edit',
          'courses.delete',
        ]))
  );
  const cardsModuleEnabled = isModuleEnabled('study.cards');
  const canViewCards = Boolean(
    cardsModuleEnabled &&
      (isGuest ||
        hasAnyPermission([
          'cards.view',
          'cards.view_all',
          'cards.edit',
          'cards.delete',
        ]))
  );
  const canCreateCourse = Boolean(
    !isGuest &&
      user &&
      (hasPermission('courses.create') || hasPermission('courses.create_own'))
  );

  const [courses, setCourses] = useState([]);
  const [cards, setCards] = useState([]);
  const [statusByScope, setStatusByScope] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Course form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [contentLang, setContentLang] = useState('vi');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [enTitle, setEnTitle] = useState('');
  const [enDescription, setEnDescription] = useState('');
  const [level, setLevel] = useState('N3');
  const [cardType, setCardType] = useState('grammar');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const userStorageKey = user?.id ? `user_${user.id}` : 'guest';
  const statusMap = useMemo(
    () => statusByScope[userStorageKey] ?? getCardStatusMap(user),
    [statusByScope, userStorageKey, user]
  );
  const lastSession = useMemo(() => getLastStudySession(user), [user]);

  const reloadCourses = useCallback(async () => {
    if (authLoading || !canViewCourses) return;
    setLoading(true);
    setError(null);
    try {
      const [coursesData, cardsData] = await Promise.all([
        fetchCourses(),
        canViewCards ? fetchCards().catch(() => ({ results: [] })) : Promise.resolve({ results: [] }),
      ]);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      const loadedCards = Array.isArray(cardsData?.results)
        ? cardsData.results
        : Array.isArray(cardsData?.cards)
          ? cardsData.cards
          : [];
      setCards(loadedCards);
      if (
        cardsData?.srs_states &&
        typeof cardsData.srs_states === 'object'
      ) {
        const merged = mergeServerSrsMap(user, cardsData.srs_states);
        setStatusByScope((prev) => ({
          ...prev,
          [userStorageKey]: merged.statusMap,
        }));
      }
      if (!isGuest && user?.id) {
        const unsyncedPayload = getUnsyncedSyncPayload(user);
        if (Object.keys(unsyncedPayload).length > 0) {
          syncCardReviews(unsyncedPayload)
            .then((res) => {
              clearSyncedReviews(user, unsyncedPayload);
              if (res?.srs_states) {
                const synced = mergeServerSrsMap(user, res.srs_states);
                setStatusByScope((prev) => ({
                  ...prev,
                  [userStorageKey]: synced.statusMap,
                }));
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      setError(t('study:courses.loadError'));
    } finally {
      setLoading(false);
    }
  }, [authLoading, canViewCards, canViewCourses, isGuest, t, user, userStorageKey]);

  useEffect(() => {
    if (authLoading || hasLegacyStudyParams || !canViewCourses) return;
    let ignore = false;
    Promise.all([
      fetchCourses(),
      canViewCards ? fetchCards().catch(() => ({ results: [] })) : Promise.resolve({ results: [] }),
    ])
      .then(([coursesData, cardsData]) => {
        if (!ignore) {
          setCourses(Array.isArray(coursesData) ? coursesData : []);
          const loadedCards = Array.isArray(cardsData?.results)
            ? cardsData.results
            : Array.isArray(cardsData?.cards)
              ? cardsData.cards
              : [];
          setCards(loadedCards);
          if (
            cardsData?.srs_states &&
            typeof cardsData.srs_states === 'object'
          ) {
            const merged = mergeServerSrsMap(user, cardsData.srs_states);
            setStatusByScope((prev) => ({
              ...prev,
              [userStorageKey]: merged.statusMap,
            }));
          }
          if (!isGuest && user?.id) {
            const unsyncedPayload = getUnsyncedSyncPayload(user);
            if (Object.keys(unsyncedPayload).length > 0) {
              syncCardReviews(unsyncedPayload)
                .then((res) => {
                  clearSyncedReviews(user, unsyncedPayload);
                  if (!ignore && res?.srs_states) {
                    const synced = mergeServerSrsMap(user, res.srs_states);
                    setStatusByScope((prev) => ({
                      ...prev,
                      [userStorageKey]: synced.statusMap,
                    }));
                  }
                })
                .catch(() => {});
            }
          }
          setError(null);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError(t('study:courses.loadError'));
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [
    authLoading,
    canViewCards,
    canViewCourses,
    hasLegacyStudyParams,
    isGuest,
    user,
    userStorageKey,
    i18n.language,
    t,
  ]);

  useEffect(() => {
    if (!isFormOpen) return undefined;
    const handleKeyDown = (e) => {
      if (
        e.defaultPrevented ||
        document.querySelector('[data-dropdown-open="true"]')
      ) {
        return;
      }
      if (e.key === 'Escape' && !submitting) {
        setIsFormOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen, submitting]);

  // Compute per-course studied card counts and overall stats
  const courseProgressMap = useMemo(() => {
    const map = {};
    for (const course of courses) {
      map[String(course.id)] = {
        total: course.card_count ?? 0,
        studied: 0,
      };
    }

    for (const card of cards) {
      const cid = card.course ? String(card.course) : '';
      if (!cid) continue;
      if (!map[cid]) {
        map[cid] = { total: 0, studied: 0 };
      }
      const st = statusMap[String(card.id)];
      if (st === 'learned' || st === 'remembered' || st === 'mastered') {
        map[cid].studied += 1;
      }
    }

    return map;
  }, [courses, cards, statusMap]);

  const summaryStats = useMemo(() => {
    const courseCount = courses.length;
    const totalCardsFromCourses = courses.reduce(
      (sum, c) => sum + (c.card_count ?? 0),
      0
    );
    const totalCards = Math.max(totalCardsFromCourses, cards.length);

    let studiedCards = 0;
    if (cards.length > 0) {
      for (const card of cards) {
        const st = statusMap[String(card.id)];
        if (st === 'learned' || st === 'remembered' || st === 'mastered') {
          studiedCards += 1;
        }
      }
    } else {
      studiedCards = Object.values(statusMap).filter(
        (st) => st === 'learned' || st === 'remembered' || st === 'mastered'
      ).length;
    }

    const completionPercent =
      totalCards > 0
        ? Math.min(100, Math.round((studiedCards / totalCards) * 100))
        : 0;

    return {
      courseCount,
      totalCards,
      studiedCards,
      completionPercent,
    };
  }, [courses, cards, statusMap]);

  // Determine the most recently accessed course for "TIẾP TỤC HỌC"
  const recentCourse = useMemo(() => {
    if (courses.length === 0) return null;

    if (lastSession?.courseId) {
      const matched = courses.find(
        (c) => String(c.id) === String(lastSession.courseId)
      );
      if (matched) return matched;
    }

    if (lastSession?.cardId && cards.length > 0) {
      const lastCard = cards.find(
        (c) => String(c.id) === String(lastSession.cardId)
      );
      if (lastCard?.course) {
        const matched = courses.find(
          (c) => String(c.id) === String(lastCard.course)
        );
        if (matched) return matched;
      }
    }

    const inProgressCourse = courses.find((c) => {
      const prog = courseProgressMap[String(c.id)];
      return prog && prog.studied > 0;
    });

    return inProgressCourse || courses[0];
  }, [courses, cards, lastSession, courseProgressMap]);

  const filteredCourses = useMemo(() => {
    if (activeFilter === 'learning') {
      return courses.filter((c) => {
        const prog = courseProgressMap[String(c.id)];
        return prog && prog.studied > 0;
      });
    }
    if (activeFilter === 'unseen') {
      return courses.filter((c) => {
        const prog = courseProgressMap[String(c.id)];
        return !prog || prog.studied === 0;
      });
    }
    return courses;
  }, [courses, activeFilter, courseProgressMap]);

  const handleSelectCourseToStudy = (course) => {
    if (!course?.id) return;
    saveLastStudySession(user, { courseId: course.id });
    navigate(`/study?course=${course.id}`);
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setContentLang('vi');
    setTitle('');
    setDescription('');
    setEnTitle('');
    setEnDescription('');
    setLevel('N3');
    setCardType('grammar');
    setIsPublic(true);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setContentLang('vi');
    setTitle(course.source_values?.title ?? course.title ?? '');
    setDescription(
      course.source_values?.description ?? course.description ?? ''
    );
    setEnTitle(course.translations?.en?.title || '');
    setEnDescription(course.translations?.en?.description || '');
    setLevel(course.level || 'N3');
    setCardType(course.card_type || 'grammar');
    setIsPublic(course.is_public ?? true);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setContentLang('vi');
      setFormError(t('study:courses.titleRequiredError'));
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const existingTranslations =
        editingCourse?.translations &&
        typeof editingCourse.translations === 'object'
          ? editingCourse.translations
          : {};
      const enFields = {
        title: enTitle.trim(),
        description: enDescription.trim(),
      };
      const hasEnContent = Object.values(enFields).some(Boolean);
      const nextTranslations = { ...existingTranslations };
      if (hasEnContent) {
        nextTranslations.en = enFields;
      } else {
        delete nextTranslations.en;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        translations: nextTranslations,
        level,
        card_type: cardType,
        is_public: Boolean(isPublic),
      };
      if (editingCourse?.id) {
        await updateCourse(editingCourse.id, payload);
        showToast(t('study:courses.updateSuccess'), 'success');
      } else {
        await createCourse(payload);
        showToast(t('study:courses.createSuccess'), 'success');
      }
      setIsFormOpen(false);
      await reloadCourses();
    } catch (err) {
      setFormError(err.message || t('study:courses.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (course) => {
    const confirmed = window.confirm(
      t('study:courses.deleteConfirm', { title: course.title })
    );
    if (!confirmed) return;

    try {
      await deleteCourse(course.id);
      showToast(
        t('study:courses.deleteSuccess', { title: course.title }),
        'info'
      );
      await reloadCourses();
    } catch (err) {
      showToast(err.message || t('study:courses.deleteError'), 'error');
    }
  };

  const recentProgress = recentCourse
    ? courseProgressMap[String(recentCourse.id)] || {
      total: recentCourse.card_count ?? 0,
      studied: 0,
    }
    : { total: 0, studied: 0 };
  const recentPercent =
    recentProgress.total > 0
      ? Math.min(
        100,
        Math.round((recentProgress.studied / recentProgress.total) * 100)
      )
      : 0;

  if (hasLegacyStudyParams) {
    return <Navigate to={`/study?${searchParams.toString()}`} replace />;
  }

  if (!canViewCourses) {
    const isRoleRestricted =
      !coursesModuleEnabled
        ? getModuleBlockReason('courses') === 'role_restricted'
        : true;
    const note = getModuleInfo('courses')?.maintenance_note;
    return (
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5 sm:gap-4">
        {openSidebar && (
          <div className="flex lg:hidden items-center justify-end">
            <button
              type="button"
              onClick={openSidebar}
              aria-label={t('common:nav.openMenu')}
              className="w-9 h-9 rounded-control border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
        <EmptyState
          title={
            isRoleRestricted
              ? t('study:courses.blockedTitle')
              : t('study:courses.disabledTitle')
          }
          description={
            isRoleRestricted
              ? t('study:courses.blockedDesc')
              : note || t('study:courses.disabledDescFallback')
          }
        />
      </main>
    );
  }

  return (
    <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5 sm:gap-4">
      {/* Create / Edit Course Modal */}
      {!isGuest && isFormOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 animate-backdrop-in"
          onClick={() => {
            if (!submitting) setIsFormOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="course-modal-title"
        >
          <div
            className="bg-white border border-slate-200 rounded-surface shadow-sm max-w-lg w-full max-h-[90vh] flex flex-col animate-popup-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 rounded-t-surface flex items-center justify-between">
              <h2
                id="course-modal-title"
                className="text-sm sm:text-base font-semibold text-slate-900"
              >
                {editingCourse
                  ? t('study:courses.editModalTitle')
                  : t('study:courses.createModalTitle')}
              </h2>
              <Button
                variant="secondary"
                size="icon"
                disabled={submitting}
                onClick={() => {
                  if (!submitting) setIsFormOpen(false);
                }}
                aria-label={t('study:courses.closeFormAria')}
              >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </Button>
            </div>

            <form
              noValidate
              onSubmit={handleSubmitCourse}
              className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4"
            >
              {formError && (
                <div
                  className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-control p-3"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="course-type-select"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:courses.typeLabel')}
                  </label>
                  <Dropdown
                    id="course-type-select"
                    value={cardType}
                    onChange={setCardType}
                    options={getCardTypeOptions()}
                  />
                </div>

                <div>
                  <label
                    htmlFor="course-level-select"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('study:courses.levelLabel')}
                  </label>
                  <Dropdown
                    id="course-level-select"
                    value={level}
                    onChange={setLevel}
                    options={JLPT_LEVELS}
                  />
                </div>
              </div>

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
                    className={`px-3 py-1 text-xs font-medium rounded-control transition-colors duration-150 cursor-pointer ${
                      contentLang === 'vi'
                        ? 'bg-sky-700 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {t('common:contentForm.viTab')}
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
                    <div>
                      <label
                        htmlFor="course-title-input"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        {t('study:courses.titleLabel')}
                      </label>
                      <input
                        id="course-title-input"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full min-h-10 px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="course-desc-input"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        {t('study:courses.descriptionLabel')}
                      </label>
                      <textarea
                        id="course-desc-input"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 resize-y"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="course-title-en-input"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        {t('study:courses.titleEnLabel')}
                      </label>
                      <input
                        id="course-title-en-input"
                        type="text"
                        value={enTitle}
                        onChange={(e) => setEnTitle(e.target.value)}
                        className="w-full min-h-10 px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="course-desc-en-input"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        {t('study:courses.descriptionEnLabel')}
                      </label>
                      <textarea
                        id="course-desc-en-input"
                        rows={2}
                        value={enDescription}
                        onChange={(e) => setEnDescription(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 resize-y"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t('study:courses.visibilityLabel')}
                </span>
                <div className="flex bg-slate-100 border border-slate-200 rounded-control p-1 gap-1">
                  <button
                    type="button"
                    aria-pressed={Boolean(isPublic)}
                    onClick={() => setIsPublic(true)}
                    className={`flex-1 min-h-9 text-xs sm:text-sm font-medium rounded-control cursor-pointer transition-colors duration-150 ${
                      isPublic
                        ? 'bg-sky-700 text-white'
                        : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {t('study:courses.publicOption')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={!isPublic}
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 min-h-9 text-xs sm:text-sm font-medium rounded-control cursor-pointer transition-colors duration-150 ${
                      !isPublic
                        ? 'bg-sky-700 text-white'
                        : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {t('study:courses.privateOption')}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => {
                    if (!submitting) setIsFormOpen(false);
                  }}
                >
                  {t('common:actions.cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting
                    ? t('common:actions.saving')
                    : t('study:courses.saveCourseButton')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openSidebar && (error || (!loading && courses.length === 0)) && (
        <div className="flex lg:hidden items-center justify-end">
          <button
            type="button"
            onClick={openSidebar}
            aria-label={t('common:nav.openMenu')}
            className="w-9 h-9 rounded-control border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
          >
            <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {error ? (
        <EmptyState
          title={t('study:courses.loadErrorTitle')}
          description={error}
          actionLabel={t('common:actions.retry')}
          onAction={reloadCourses}
        />
      ) : loading && courses.length === 0 ? (
        <Skeleton variant="courses" />
      ) : courses.length === 0 ? (
        <EmptyState
          title={t('study:courses.emptyTitle')}
          description={t('study:courses.emptyDesc')}
          actionLabel={
            canCreateCourse ? t('study:courses.createButton') : undefined
          }
          onAction={canCreateCourse ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Resume most recently accessed course */}
          {recentCourse && (
            <Card className="p-4 sm:p-5 flex flex-col gap-3.5 border-sky-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-2 w-2 rounded-full bg-sky-600 shrink-0" />
                  <span className="text-xs font-semibold text-sky-800 truncate">
                    {t('study:courses.resumeLabel')}
                  </span>
                  <div className="hidden sm:flex items-center gap-1.5 ml-1 shrink-0">
                    <Badge variant="level">{recentCourse.level || 'N3'}</Badge>
                    <Badge variant="secondary">
                      {getCardTypeLabel(recentCourse.card_type) ||
                        recentCourse.card_type}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canCreateCourse && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleOpenCreate}
                    >
                      <PlusIcon className="w-4 h-4" aria-hidden="true" />
                      <span>{t('study:courses.createButton')}</span>
                    </Button>
                  )}

                  {openSidebar && (
                    <button
                      type="button"
                      onClick={openSidebar}
                      aria-label={t('common:nav.openMenu')}
                      className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-control border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
                    >
                      <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 rounded-surface bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                  <BookOpenIcon className="w-5 h-5" aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                    {recentCourse.title}
                  </h2>

                  <span className="text-xs text-slate-500 tabular-nums">
                    {getCardTypeLabel(recentCourse.card_type) ||
                      recentCourse.card_type}{' '}
                    ·{' '}
                    {t('study:courses.cardsCount', {
                      count: recentProgress.total,
                    })}
                  </span>

                  <div
                    className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={recentProgress.studied}
                    aria-valuemin={0}
                    aria-valuemax={recentProgress.total}
                    aria-label={t('study:courses.studiedAria', {
                      studied: recentProgress.studied,
                      total: recentProgress.total,
                    })}
                  >
                    <div
                      className="h-full bg-sky-600 rounded-full transition-all duration-300"
                      style={{ width: `${recentPercent}%` }}
                    />
                  </div>

                  <span className="text-xs text-slate-500 tabular-nums">
                    {t('study:courses.studiedCount', {
                      studied: recentProgress.studied,
                      total: recentProgress.total,
                    })}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleSelectCourseToStudy(recentCourse)}
                className="w-full"
              >
                <span>{t('study:courses.continueStudy')}</span>
              </Button>
            </Card>
          )}

          {/* Summary Statistics Row */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Card className="p-3.5 sm:p-4 flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">
                {t('study:courses.stats.courses')}
              </span>
              <span className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight tabular-nums">
                {formatNumber(summaryStats.courseCount)}
              </span>
            </Card>

            <Card className="p-3.5 sm:p-4 flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">
                {t('study:courses.stats.cards')}
              </span>
              <span className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight tabular-nums">
                {formatNumber(summaryStats.totalCards)}
              </span>
            </Card>

            <Card className="p-3.5 sm:p-4 flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">
                {t('study:courses.stats.completion')}
              </span>
              <span className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight tabular-nums">
                {summaryStats.completionPercent}%
              </span>
            </Card>
          </div>

          {/* Course Library Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                {t('study:courses.libraryHeading')}
              </h2>
              {canViewCards && (
                <button
                  type="button"
                  onClick={() => navigate('/study')}
                  className="text-xs sm:text-sm font-medium text-sky-700 hover:text-sky-800 cursor-pointer transition-colors duration-150"
                >
                  {t('study:courses.studyAllCards')}
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div
              className="flex items-center gap-2 flex-wrap"
              role="tablist"
              aria-label={t('study:courses.filterAria')}
            >
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`h-8 px-3.5 rounded-control text-xs sm:text-sm font-medium border cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                      isActive
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>

            {/* Course List */}
            {filteredCourses.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-500">
                {t('study:courses.emptyFiltered')}
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredCourses.map((course) => {
                  const visual = getCourseVisual(course.card_type);
                  const CourseIcon = visual.icon;
                  const prog = courseProgressMap[String(course.id)] || {
                    total: course.card_count ?? 0,
                    studied: 0,
                  };

                  return (
                    <Card
                      key={course.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectCourseToStudy(course)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectCourseToStudy(course);
                        }
                      }}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-slate-300 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-surface flex items-center justify-center shrink-0 ${visual.boxClass}`}
                        >
                          <CourseIcon className="w-5 h-5" aria-hidden="true" />
                        </div>

                        <div className="flex flex-col gap-0.5 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                            {course.title}
                          </h3>
                          <span className="text-xs text-slate-500">
                            {getCardTypeLabel(course.card_type) ||
                              course.card_type}{' '}
                            · {course.level}
                            {!course.is_public
                              ? ` · ${t('study:courses.privateTag')}`
                              : ''}
                          </span>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {t('study:courses.cardsCount', {
                              count: prog.total,
                            })}
                            {prog.studied > 0
                              ? ` · ${t('study:courses.studiedInline', {
                                  studied: prog.studied,
                                  total: prog.total,
                                })}`
                              : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {((course.can_edit ?? (course.can_manage || course.is_owner)) ||
                          (course.can_delete ?? (course.can_manage || course.is_owner))) && (
                          <div
                            className="inline-flex items-center gap-1 mr-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(course.can_edit ??
                              (course.can_manage || course.is_owner)) && (
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => handleOpenEdit(course)}
                                aria-label={t('study:courses.editAria', {
                                  title: course.title,
                                })}
                              >
                                <PencilSquareIcon
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                />
                              </Button>
                            )}
                            {(course.can_delete ??
                              (course.can_manage || course.is_owner)) && (
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteCourse(course)}
                                aria-label={t('study:courses.deleteAria', {
                                  title: course.title,
                                })}
                              >
                                <TrashIcon
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                />
                              </Button>
                            )}
                          </div>
                        )}

                        <ChevronRightIcon
                          className="w-4 h-4 text-slate-400"
                          aria-hidden="true"
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
