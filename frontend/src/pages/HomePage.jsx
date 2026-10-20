import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import FilterBar from '../components/FilterBar';
import FlashcardView from '../components/FlashcardView';
import PracticeView from '../components/PracticeView';
import TableView from '../components/TableView';
import DetailModal from '../components/DetailModal';
import CardFormModal from '../components/CardFormModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { STUDY_STATUS_LABELS } from '../constants/cards';
import {
  fetchCards,
  fetchCourses,
  createCard,
  updateCard,
  deleteCard,
} from '../services/api';
import {
  getCardStatusMap,
  saveCardStatus,
  getLastStudySession,
  saveLastStudySession,
} from '../services/studyProgress';

export default function HomePage({ defaultScope = 'all' }) {
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const [searchParams, setSearchParams] = useSearchParams();

  const { user, isGuest, loading: authLoading, openAuthModal, isAuthModalOpen } = useAuth();
  const { showToast } = useToast();

  const userStorageKey = user?.id ? `user_${user.id}` : 'guest';

  // Study Progress (works for all users)
  const [statusByScope, setStatusByScope] = useState({});
  const statusMap = useMemo(
    () => statusByScope[userStorageKey] ?? getCardStatusMap(user),
    [statusByScope, userStorageKey, user]
  );

  const [activeTab, setActiveTab] = useState('flashcards');
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasAutoRestoredRef = useRef(false);

  // Filters
  const [scope, setScope] = useState(defaultScope);
  const effectiveScope = isGuest ? 'all' : defaultScope === 'mine' ? 'mine' : scope;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(
    () => searchParams.get('course') || ''
  );
  const [selectedLesson, setSelectedLesson] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Data
  const [cards, setCards] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [selectedDetailCard, setSelectedDetailCard] = useState(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState(null);

  // Debounce search input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Derive valid course ID without calling setState in an effect
  const effectiveCourse =
    !isGuest || courses.length === 0
      ? selectedCourse &&
        (courses.length === 0 ||
          courses.some((c) => String(c.id) === String(selectedCourse)))
        ? selectedCourse
        : ''
      : courses.some((c) => String(c.id) === String(selectedCourse))
        ? selectedCourse
        : '';

  const handleSelectCourse = useCallback(
    (courseId) => {
      setSelectedCourse(courseId);
      setSelectedLesson('');
      setCurrentIndex(0);
      const nextParams = new URLSearchParams(searchParams);
      if (courseId) {
        nextParams.set('course', courseId);
      } else {
        nextParams.delete('course');
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Load courses
  const refreshCourses = useCallback(async () => {
    try {
      const data = await fetchCourses();
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let ignore = false;
    fetchCourses()
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setCourses(data);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [authLoading, user]);

  const buildCardParams = useCallback(() => {
    const params = {};
    if (selectedType) params.type = selectedType;
    if (selectedLevel) params.level = selectedLevel;
    if (effectiveCourse) params.course = effectiveCourse;
    if (selectedLesson) params.lesson = selectedLesson;
    if (debouncedSearch) params.search = debouncedSearch;
    if (effectiveScope === 'mine') params.mine = true;
    return params;
  }, [
    selectedType,
    selectedLevel,
    effectiveCourse,
    selectedLesson,
    debouncedSearch,
    effectiveScope,
  ]);

  // Imperative reload for retry & post-mutation sync
  const reloadCards = useCallback(async () => {
    if (authLoading) return;
    setLoadingCards(true);
    setError(null);
    try {
      const data = await fetchCards(buildCardParams());
      setCards(data.results || []);
      if (Array.isArray(data.lessons)) {
        setLessons(data.lessons);
      }
    } catch {
      setError('Không thể tải dữ liệu thẻ học. Vui lòng thử lại.');
    } finally {
      setLoadingCards(false);
    }
  }, [authLoading, buildCardParams]);

  // Reactive card loader with race-condition protection & silent resume of last studied card
  useEffect(() => {
    if (authLoading) return;
    let ignore = false;

    fetchCards(buildCardParams())
      .then((data) => {
        if (!ignore) {
          const loadedCards = data.results || [];
          setCards(loadedCards);
          if (Array.isArray(data.lessons)) {
            setLessons(data.lessons);
          }
          setError(null);

          // Silently restore exact card index on initial page load
          if (!hasAutoRestoredRef.current && loadedCards.length > 0) {
            hasAutoRestoredRef.current = true;
            const saved = getLastStudySession(user);
            if (saved?.cardId) {
              const foundIdx = loadedCards.findIndex(
                (c) => String(c.id) === String(saved.cardId)
              );
              if (foundIdx >= 0) {
                setCurrentIndex(foundIdx);
              }
            }
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Không thể tải dữ liệu thẻ học. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingCards(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authLoading, user, buildCardParams]);

  // Client-side filter by study status (unseen / learned / remembered / mastered)
  const filteredCards = useMemo(() => {
    if (!selectedStatus) return cards;
    return cards.filter((card) => {
      const st = statusMap[String(card.id)] || 'unseen';
      return st === selectedStatus;
    });
  }, [cards, selectedStatus, statusMap]);

  const safeIndex =
    filteredCards.length === 0
      ? 0
      : Math.min(currentIndex, filteredCards.length - 1);

  // Compute progress counts across current card set
  const progressStats = useMemo(() => {
    let learnedCount = 0;
    let rememberedCount = 0;
    let masteredCount = 0;
    for (const card of cards) {
      const st = statusMap[String(card.id)];
      if (st === 'learned') learnedCount += 1;
      else if (st === 'remembered') rememberedCount += 1;
      else if (st === 'mastered') masteredCount += 1;
    }
    return { learnedCount, rememberedCount, masteredCount };
  }, [cards, statusMap]);

  // Silently persist last study position for both Guests and Authenticated Users
  const recordStudySession = useCallback(
    (card, index, tabOverride) => {
      if (!card?.id) return;
      saveLastStudySession(user, {
        cardId: card.id,
        cardIndex: index,
        frontText: card.front_text || card.grammar || '',
        meaning: card.meaning || '',
        lesson: card.lesson || '',
        level: card.level || '',
        cardType: card.card_type || '',
        courseId: effectiveCourse || card.course || '',
        activeTab: tabOverride || activeTab,
      });
    },
    [user, effectiveCourse, activeTab]
  );

  const handleIndexChange = useCallback(
    (nextIdx) => {
      setCurrentIndex(nextIdx);
      const targetCard = filteredCards[nextIdx];
      if (targetCard) {
        recordStudySession(targetCard, nextIdx);
      }
    },
    [filteredCards, recordStudySession]
  );

  const handleStatusChange = useCallback(
    (cardId, nextStatus) => {
      const nextMap = saveCardStatus(user, cardId, nextStatus);
      setStatusByScope((prev) => ({
        ...prev,
        [userStorageKey]: nextMap,
      }));
      const targetCard = filteredCards.find(
        (c) => String(c.id) === String(cardId)
      );
      if (targetCard) {
        recordStudySession(targetCard, safeIndex);
      }
      showToast(
        `Đã đánh dấu: ${STUDY_STATUS_LABELS[nextStatus] || 'Chưa học'}`,
        'success'
      );
    },
    [user, userStorageKey, filteredCards, safeIndex, recordStudySession, showToast]
  );

  const handleSaveCard = async (payload, id) => {
    if (id) {
      await updateCard(id, payload);
      showToast('Đã cập nhật thẻ học thành công.', 'success');
    } else {
      await createCard(payload);
      showToast('Đã tạo thẻ học mới thành công.', 'success');
    }
    await reloadCards();
    await refreshCourses();
  };

  const handleDeleteCard = async (card) => {
    const cardTitle = card.front_text || card.grammar || 'thẻ này';
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa thẻ "${cardTitle}" không?`
    );
    if (!confirmed) return;

    try {
      await deleteCard(card.id);
      if (selectedDetailCard?.id === card.id) {
        setSelectedDetailCard(null);
      }
      showToast(`Đã xóa thẻ "${cardTitle}".`, 'info');
      await reloadCards();
      await refreshCourses();
    } catch (err) {
      showToast(err.message || 'Không thể xóa thẻ học.', 'error');
    }
  };

  const handleOpenCreateCard = () => {
    setCardToEdit(null);
    setIsCardModalOpen(true);
  };

  const handleOpenEditCard = (card) => {
    setCardToEdit(card);
    setIsCardModalOpen(true);
  };

  if (defaultScope === 'mine' && !authLoading && isGuest) {
    return (
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <Card className="p-10 text-center flex flex-col items-center gap-4">
          <h2 className="text-lg font-bold text-slate-900">
            Đăng nhập để quản lý bộ thẻ cá nhân
          </h2>
          <p className="text-sm text-slate-600 max-w-md">
            Bạn có thể học toàn bộ khoá học công khai tại Trang chủ. Hãy đăng nhập để tự tạo và lưu bộ thẻ của riêng bạn.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => openAuthModal('login')}>
              <ArrowRightOnRectangleIcon className="w-4 h-4" aria-hidden="true" />
              <span>Đăng nhập ngay</span>
            </Button>
            <Link
              to="/"
              className="min-h-10 inline-flex items-center px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              Học thẻ công khai
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <>
      <main className="max-w-5xl w-full mx-auto px-3 sm:px-6 pt-3 pb-20 sm:pb-5 flex-1 flex flex-col gap-3">
        {/* Filter & Mode Toolbar */}
        <FilterBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCreateCard={handleOpenCreateCard}
          onOpenSidebar={openSidebar}
          searchQuery={searchQuery}
          setSearchQuery={(val) => {
            setSearchQuery(val);
            setCurrentIndex(0);
          }}
          selectedType={selectedType}
          setSelectedType={(val) => {
            setSelectedType(val);
            setCurrentIndex(0);
          }}
          selectedLevel={selectedLevel}
          setSelectedLevel={(val) => {
            setSelectedLevel(val);
            setCurrentIndex(0);
          }}
          selectedCourse={effectiveCourse}
          setSelectedCourse={handleSelectCourse}
          selectedLesson={selectedLesson}
          setSelectedLesson={(val) => {
            setSelectedLesson(val);
            setCurrentIndex(0);
          }}
          selectedStatus={selectedStatus}
          setSelectedStatus={(val) => {
            setSelectedStatus(val);
            setCurrentIndex(0);
          }}
          scope={effectiveScope}
          setScope={(val) => {
            setScope(val);
            setCurrentIndex(0);
          }}
          courses={courses}
          lessons={lessons}
          hideScopeToggle={defaultScope === 'mine'}
          currentCardNumber={filteredCards.length > 0 ? safeIndex + 1 : 0}
          totalCount={cards.length}
          learnedCount={progressStats.learnedCount}
          rememberedCount={progressStats.rememberedCount}
          masteredCount={progressStats.masteredCount}
          loadingProgress={Boolean((loadingCards || authLoading) && cards.length === 0)}
        />

        {/* Main Study Workspace (~75% viewport height) */}
        <div className="flex-1 flex flex-col">
          {error ? (
            <EmptyState
              title="Không thể tải dữ liệu thẻ học"
              description={error}
              actionLabel="Thử lại"
              onAction={reloadCards}
            />
          ) : (loadingCards || authLoading) && cards.length === 0 ? (
            <Skeleton variant={activeTab} />
          ) : activeTab === 'flashcards' ? (
            <FlashcardView
              cards={filteredCards}
              currentIndex={safeIndex}
              onIndexChange={handleIndexChange}
              statusMap={statusMap}
              onStatusChange={handleStatusChange}
              onEditCard={handleOpenEditCard}
              onDeleteCard={handleDeleteCard}
              disabledShortcuts={Boolean(
                selectedDetailCard || isCardModalOpen || isAuthModalOpen
              )}
            />
          ) : activeTab === 'practice' ? (
            <PracticeView
              cards={filteredCards}
              currentIndex={safeIndex}
              onIndexChange={handleIndexChange}
              statusMap={statusMap}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <TableView
              cards={filteredCards}
              statusMap={statusMap}
              onSelectCard={(card) => {
                setSelectedDetailCard(card);
                const idx = filteredCards.findIndex((c) => c.id === card.id);
                if (idx >= 0) {
                  setCurrentIndex(idx);
                  recordStudySession(card, idx, 'table');
                }
              }}
              onEditCard={handleOpenEditCard}
              onDeleteCard={handleDeleteCard}
            />
          )}
        </div>
      </main>

      {selectedDetailCard && (
        <DetailModal
          card={selectedDetailCard}
          status={statusMap[String(selectedDetailCard.id)] || 'unseen'}
          onStatusChange={handleStatusChange}
          onClose={() => setSelectedDetailCard(null)}
          onEditCard={handleOpenEditCard}
          onDeleteCard={handleDeleteCard}
        />
      )}

      {!isGuest && isCardModalOpen && (
        <CardFormModal
          key={cardToEdit ? `card-${cardToEdit.id}` : 'new-card'}
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          onSubmit={handleSaveCard}
          onCourseCreated={refreshCourses}
          initialCard={cardToEdit}
          courses={courses}
        />
      )}
    </>
  );
}
