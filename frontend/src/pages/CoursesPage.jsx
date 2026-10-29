import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BookOpenIcon,
  RectangleStackIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  LanguageIcon,
  AcademicCapIcon,
  XMarkIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { CARD_TYPES, CARD_TYPE_LABELS, JLPT_LEVELS } from '../constants/cards';
import {
  fetchCourses,
  fetchCards,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../services/api';
import {
  getCardStatusMap,
  getLastStudySession,
  saveLastStudySession,
} from '../services/studyProgress';

const FILTER_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'learning', label: 'Đang học' },
  { id: 'unseen', label: 'Chưa học' },
];

function getCourseVisual(cardType) {
  if (cardType === 'vocabulary') {
    return {
      icon: LanguageIcon,
      boxClass: 'bg-emerald-100/80 text-emerald-700',
    };
  }
  if (cardType === 'kanji') {
    return {
      icon: AcademicCapIcon,
      boxClass: 'bg-sky-100/80 text-sky-700',
    };
  }
  return {
    icon: BookOpenIcon,
    boxClass: 'bg-sky-100/80 text-sky-700',
  };
}

export default function CoursesPage() {
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const navigate = useNavigate();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Course form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('N3');
  const [cardType, setCardType] = useState('grammar');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const statusMap = useMemo(() => getCardStatusMap(user), [user]);
  const lastSession = useMemo(() => getLastStudySession(user), [user]);

  const reloadCourses = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setError(null);
    try {
      const [coursesData, cardsData] = await Promise.all([
        fetchCourses(),
        fetchCards().catch(() => ({ cards: [] })),
      ]);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setCards(Array.isArray(cardsData?.cards) ? cardsData.cards : []);
    } catch {
      setError('Không thể tải danh sách khoá học.');
    } finally {
      setLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    let ignore = false;
    Promise.all([
      fetchCourses(),
      fetchCards().catch(() => ({ cards: [] })),
    ])
      .then(([coursesData, cardsData]) => {
        if (!ignore) {
          setCourses(Array.isArray(coursesData) ? coursesData : []);
          setCards(Array.isArray(cardsData?.cards) ? cardsData.cards : []);
          setError(null);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Không thể tải danh sách khoá học.');
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
  }, [authLoading, user]);

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
    const firstCourseCard = cards.find(
      (c) => String(c.course) === String(course.id)
    );
    if (firstCourseCard) {
      saveLastStudySession(user, {
        ...(lastSession || {}),
        cardId: lastSession?.cardId || firstCourseCard.id,
        courseId: course.id,
      });
    }
    navigate(`/?course=${course.id}`);
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setTitle('');
    setDescription('');
    setLevel('N3');
    setCardType('grammar');
    setIsPublic(true);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setTitle(course.title || '');
    setDescription(course.description || '');
    setLevel(course.level || 'N3');
    setCardType(course.card_type || 'grammar');
    setIsPublic(course.is_public ?? true);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Vui lòng nhập tên khoá học.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        level,
        card_type: cardType,
        is_public: Boolean(isPublic),
      };
      if (editingCourse?.id) {
        await updateCourse(editingCourse.id, payload);
        showToast('Đã cập nhật khoá học.', 'success');
      } else {
        await createCourse(payload);
        showToast('Đã tạo khoá học mới.', 'success');
      }
      setIsFormOpen(false);
      await reloadCourses();
    } catch (err) {
      setFormError(err.message || 'Không thể lưu khoá học.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (course) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa khoá học "${course.title}" không?`
    );
    if (!confirmed) return;

    try {
      await deleteCourse(course.id);
      showToast(`Đã xóa khoá học "${course.title}".`, 'info');
      await reloadCourses();
    } catch (err) {
      showToast(err.message || 'Không thể xóa khoá học.', 'error');
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

  return (
    <main className="w-full mx-auto px-3 sm:px-6 pt-3 pb-16 flex flex-col gap-5">
      {/* Create / Edit Course Modal */}
      {!isGuest && isFormOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 animate-backdrop-in"
          onClick={() => setIsFormOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="course-modal-title"
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-lg max-w-lg w-full overflow-hidden flex flex-col animate-popup-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2
                id="course-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                {editingCourse ? 'Chỉnh sửa khoá học' : 'Tạo khoá học mới'}
              </h2>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setIsFormOpen(false)}
                aria-label="Đóng biểu mẫu"
              >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </Button>
            </div>

            <form
              onSubmit={handleSubmitCourse}
              className="p-6 flex flex-col gap-4"
            >
              {formError && (
                <div
                  className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="course-title-input"
                  className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
                >
                  Tên khoá học / Bộ thẻ *
                </label>
                <input
                  id="course-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Tổng hợp Từ vựng N3"
                  className="w-full min-h-10 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm transition-colors duration-150 focus:bg-white focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="course-type-select"
                    className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
                  >
                    Loại thẻ
                  </label>
                  <select
                    id="course-type-select"
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full min-h-10 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:border-sky-700"
                  >
                    {CARD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="course-level-select"
                    className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
                  >
                    Trình độ JLPT
                  </label>
                  <select
                    id="course-level-select"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full min-h-10 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:border-sky-700"
                  >
                    {JLPT_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="course-desc-input"
                  className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
                >
                  Mô tả
                </label>
                <textarea
                  id="course-desc-input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn về nội dung khoá học..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm transition-colors duration-150 focus:bg-white focus:border-sky-700"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Quyền hiển thị
                </span>
                <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex-1 min-h-9 text-xs sm:text-sm font-semibold rounded-md cursor-pointer transition-colors duration-150 ${isPublic
                        ? 'bg-sky-700 text-white'
                        : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                  >
                    Công khai
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 min-h-9 text-xs sm:text-sm font-semibold rounded-md cursor-pointer transition-colors duration-150 ${!isPublic
                        ? 'bg-sky-700 text-white'
                        : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                  >
                    Riêng tư
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  variant="secondary"
                  onClick={() => setIsFormOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Lưu khoá học'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error ? (
        <EmptyState
          title="Không thể tải danh sách khoá học"
          description={error}
          actionLabel="Thử lại"
          onAction={reloadCourses}
        />
      ) : loading && courses.length === 0 ? (
        <Skeleton variant="courses" />
      ) : courses.length === 0 ? (
        <EmptyState
          title="Chưa có khoá học nào"
          description="Hãy tạo khoá học đầu tiên để nhóm các thẻ học theo chủ đề."
          actionLabel={!isGuest && user ? 'Tạo khoá học' : undefined}
          onAction={!isGuest && user ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* 1. TIẾP TỤC HỌC — Most Recently Accessed Course Card (with integrated Create Course & Mobile Menu buttons) */}
          {recentCourse && (
            <Card
              rounded="2xl"
              className="p-4 sm:p-5 flex flex-col gap-3.5 bg-white border border-sky-200/90 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-2 w-2 rounded-full bg-sky-600 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-sky-800 uppercase tracking-wider truncate">
                    Tiếp tục tiến độ học tập
                  </span>
                  <div className="hidden sm:flex items-center gap-1.5 ml-1 shrink-0">
                    <Badge variant="level">{recentCourse.level || 'N3'}</Badge>
                    <Badge variant="secondary">
                      {CARD_TYPE_LABELS[recentCourse.card_type] ||
                        recentCourse.card_type}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isGuest && user && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleOpenCreate}
                      className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-semibold"
                    >
                      <PlusIcon className="w-4 h-4" aria-hidden="true" />
                      <span>Tạo khoá học</span>
                    </Button>
                  )}

                  {openSidebar && (
                    <button
                      type="button"
                      onClick={openSidebar}
                      aria-label="Mở menu điều hướng"
                      className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
                    >
                      <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center shrink-0">
                  <BookOpenIcon className="w-7 h-7" aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {recentCourse.title}
                  </h2>

                  <span className="text-xs sm:text-sm text-slate-500 font-medium">
                    {CARD_TYPE_LABELS[recentCourse.card_type] ||
                      recentCourse.card_type}{' '}
                    · {recentProgress.total} thẻ học
                  </span>

                  <div
                    className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={recentProgress.studied}
                    aria-valuemin={0}
                    aria-valuemax={recentProgress.total}
                    aria-label={`Đã học ${recentProgress.studied} trên ${recentProgress.total} thẻ`}
                  >
                    <div
                      className="h-full bg-sky-600 rounded-full transition-all duration-300"
                      style={{ width: `${recentPercent}%` }}
                    />
                  </div>

                  <span className="text-xs text-slate-500 font-medium">
                    Đã học {recentProgress.studied}/{recentProgress.total} thẻ
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleSelectCourseToStudy(recentCourse)}
                className="w-full min-h-10 sm:min-h-11 rounded-xl"
              >
                <span>Tiếp tục học</span>
                <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
              </Button>
            </Card>
          )}

          {/* 2. Summary Statistics Row (Khóa học / Thẻ học / Hoàn thành) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Card rounded="xl" className="p-3.5 sm:p-4 flex flex-col gap-1.5">
              <BookOpenIcon
                className="w-5 h-5 text-sky-700"
                aria-hidden="true"
              />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {summaryStats.courseCount}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                Khóa học
              </span>
            </Card>

            <Card rounded="xl" className="p-3.5 sm:p-4 flex flex-col gap-1.5">
              <RectangleStackIcon
                className="w-5 h-5 text-sky-700"
                aria-hidden="true"
              />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {summaryStats.totalCards}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                Thẻ học
              </span>
            </Card>

            <Card rounded="xl" className="p-3.5 sm:p-4 flex flex-col gap-1.5">
              <CheckCircleIcon
                className="w-5 h-5 text-emerald-600"
                aria-hidden="true"
              />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {summaryStats.completionPercent}%
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                Hoàn thành
              </span>
            </Card>
          </div>

          {/* 3. Thư viện khóa học Section */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Thư viện khóa học
              </h2>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-xs sm:text-sm font-semibold text-sky-700 hover:text-sky-800 cursor-pointer transition-colors duration-150"
              >
                Xem tất cả
              </button>
            </div>

            {/* Filter Pill Tabs (Tất cả / Đang học / Chưa học) */}
            <div
              className="flex items-center gap-2 flex-wrap"
              role="tablist"
              aria-label="Lọc thư viện khóa học"
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
                    className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${isActive
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Course List */}
            {filteredCourses.length === 0 ? (
              <Card rounded="2xl" className="p-6 text-center text-sm text-slate-500">
                Không có khoá học nào trong mục này.
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
                      rounded="2xl"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectCourseToStudy(course)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectCourseToStudy(course);
                        }
                      }}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-slate-300 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                    >
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 ${visual.boxClass}`}
                        >
                          <CourseIcon className="w-6 h-6" aria-hidden="true" />
                        </div>

                        <div className="flex flex-col gap-0.5 min-w-0">
                          <h3 className="text-base font-bold text-slate-900 truncate">
                            {course.title}
                          </h3>
                          <span className="text-xs sm:text-sm text-slate-500 font-medium">
                            {CARD_TYPE_LABELS[course.card_type] ||
                              course.card_type}{' '}
                            · {course.level}
                            {!course.is_public ? ' · Riêng tư' : ''}
                          </span>
                          <span className="text-xs sm:text-sm text-slate-500">
                            {prog.total} thẻ học
                            {prog.studied > 0
                              ? ` · Đã học ${prog.studied}/${prog.total}`
                              : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {course.is_owner && (
                          <div
                            className="inline-flex items-center gap-1 mr-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => handleOpenEdit(course)}
                              aria-label={`Sửa khoá học ${course.title}`}
                            >
                              <PencilSquareIcon
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteCourse(course)}
                              aria-label={`Xóa khoá học ${course.title}`}
                            >
                              <TrashIcon
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        )}

                        <ChevronRightIcon
                          className="w-5 h-5 text-slate-400"
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
