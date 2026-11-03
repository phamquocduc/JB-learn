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
import {
  STUDY_STATUS_LABELS,
  getEffectiveCardStatus,
} from '../constants/cards';
import {
  fetchCards,
  fetchCourses,
  createCard,
  updateCard,
  deleteCard,
  reviewCardApi,
  syncCardReviews,
} from '../services/api';
import {
  getCardStatusMap,
  getCardSrsMap,
  saveCardSrsState,
  persistSrsMap,
  reviewCardWithAnki,
  mergeServerSrsMap,
  getLastStudySession,
  saveLastStudySession,
} from '../services/studyProgress';
import {
  computeAnkiQueueSummary,
  getEarliestUpcomingDueTime,
  isCardDue,
  refreshSrsMapDueStates,
  sortCardsByAnkiPriority,
} from '../services/ankiScheduler';

export default function HomePage({ defaultScope = 'all' }) {
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const [searchParams, setSearchParams] = useSearchParams();

  const { user, isGuest, loading: authLoading, openAuthModal, isAuthModalOpen } = useAuth();
  const { showToast } = useToast();

  const userStorageKey = user?.id ? `user_${user.id}` : 'guest';

  // Study Progress & Anki Spaced Repetition State (works for all users)
  const [statusByScope, setStatusByScope] = useState({});
  const [srsByScope, setSrsByScope] = useState({});
  const statusMap = useMemo(
    () => statusByScope[userStorageKey] ?? getCardStatusMap(user),
    [statusByScope, userStorageKey, user]
  );
  const srsMap = useMemo(
    () => srsByScope[userStorageKey] ?? getCardSrsMap(user),
    [srsByScope, userStorageKey, user]
  );

  const [activeTab, setActiveTab] = useState('flashcards');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentCardId, setCurrentCardId] = useState(null);
  const hasAutoRestoredRef = useRef(false);
  const syncedUserIdRef = useRef(null);

  const resetCardPosition = useCallback(() => {
    setCurrentIndex(0);
    setCurrentCardId(null);
  }, []);

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
      resetCardPosition();
      const nextParams = new URLSearchParams(searchParams);
      if (courseId) {
        nextParams.set('course', courseId);
      } else {
        nextParams.delete('course');
      }
      setSearchParams(nextParams, { replace: true });
    },
    [resetCardPosition, searchParams, setSearchParams]
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
      .catch(() => { });

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
      if (data.srs_states && typeof data.srs_states === 'object') {
        const merged = mergeServerSrsMap(user, data.srs_states);
        setSrsByScope((prev) => ({
          ...prev,
          [userStorageKey]: merged.srsMap,
        }));
        setStatusByScope((prev) => ({
          ...prev,
          [userStorageKey]: merged.statusMap,
        }));
      }
    } catch {
      setError('Không thể tải dữ liệu thẻ học. Vui lòng thử lại.');
    } finally {
      setLoadingCards(false);
    }
  }, [authLoading, buildCardParams, user, userStorageKey]);

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
          if (data.srs_states && typeof data.srs_states === 'object') {
            const merged = mergeServerSrsMap(user, data.srs_states);
            setSrsByScope((prev) => ({
              ...prev,
              [userStorageKey]: merged.srsMap,
            }));
            setStatusByScope((prev) => ({
              ...prev,
              [userStorageKey]: merged.statusMap,
            }));
          }
          setError(null);

          // Silently sync local SRS progress once when authenticated user loads
          if (user?.id && syncedUserIdRef.current !== user.id) {
            syncedUserIdRef.current = user.id;
            const localSrs = getCardSrsMap(user);
            if (Object.keys(localSrs).length > 0) {
              syncCardReviews(localSrs)
                .then((res) => {
                  if (!ignore && res?.srs_states) {
                    const synced = mergeServerSrsMap(user, res.srs_states);
                    setSrsByScope((prev) => ({
                      ...prev,
                      [userStorageKey]: synced.srsMap,
                    }));
                    setStatusByScope((prev) => ({
                      ...prev,
                      [userStorageKey]: synced.statusMap,
                    }));
                  }
                })
                .catch(() => {});
            }
          }

          // Silently restore exact last studied card position on initial page load
          if (!hasAutoRestoredRef.current && loadedCards.length > 0) {
            hasAutoRestoredRef.current = true;
            const saved = getLastStudySession(user);
            const savedIdx =
              saved?.cardId != null
                ? loadedCards.findIndex(
                    (c) => String(c.id) === String(saved.cardId)
                  )
                : -1;
            const initialIdx = savedIdx >= 0 ? savedIdx : 0;
            setCurrentIndex(initialIdx);
            setCurrentCardId(loadedCards[initialIdx]?.id ?? null);
          } else if (loadedCards.length > 0) {
            setCurrentCardId((prev) => prev ?? loadedCards[0].id);
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
  }, [authLoading, user, userStorageKey, buildCardParams]);

  // Live timer: automatically flip is_due to true as soon as any learning/relearning card's due_at arrives
  useEffect(() => {
    const earliestDueMs = getEarliestUpcomingDueTime(srsMap);
    if (earliestDueMs === null) return undefined;

    const delayMs = Math.min(
      2147483647,
      Math.max(10, earliestDueMs - Date.now() + 10)
    );
    const timer = setTimeout(() => {
      setSrsByScope((prev) => {
        const hadScoped = Boolean(prev[userStorageKey]);
        const current = prev[userStorageKey] ?? getCardSrsMap(user);
        const evalNow = new Date(Math.max(Date.now(), earliestDueMs));
        const { changed, srsMap: refreshed } = refreshSrsMapDueStates(
          current,
          evalNow
        );
        if (!changed && hadScoped) return prev;
        persistSrsMap(user, refreshed);
        return {
          ...prev,
          [userStorageKey]: refreshed,
        };
      });
    }, delayMs);

    return () => clearTimeout(timer);
  }, [srsMap, user, userStorageKey]);

  // Also refresh expired due states when browser tab regains focus/visibility
  useEffect(() => {
    const refreshIfDue = () => {
      setSrsByScope((prev) => {
        const hadScoped = Boolean(prev[userStorageKey]);
        const current = prev[userStorageKey] ?? getCardSrsMap(user);
        const { changed, srsMap: refreshed } = refreshSrsMapDueStates(current);
        if (!changed && hadScoped) return prev;
        persistSrsMap(user, refreshed);
        return {
          ...prev,
          [userStorageKey]: refreshed,
        };
      });
    };

    window.addEventListener('focus', refreshIfDue);
    document.addEventListener('visibilitychange', refreshIfDue);
    return () => {
      window.removeEventListener('focus', refreshIfDue);
      document.removeEventListener('visibilitychange', refreshIfDue);
    };
  }, [user, userStorageKey]);

  const filterCardsByStatus = useCallback(
    (cardList, statusFilter) => {
      if (!statusFilter) return cardList;
      if (statusFilter === 'due') {
        const dueCards = cardList.filter((card) =>
          isCardDue(srsMap[String(card.id)])
        );
        return sortCardsByAnkiPriority(dueCards, srsMap);
      }
      if (statusFilter === 'again') {
        const againCards = cardList.filter((card) => {
          const srs = srsMap[String(card.id)];
          const st = statusMap[String(card.id)] || srs?.status || 'unseen';
          return getEffectiveCardStatus(st, srs) === 'again';
        });
        return sortCardsByAnkiPriority(againCards, srsMap);
      }
      return cardList.filter((card) => {
        const srs = srsMap[String(card.id)];
        const st = statusMap[String(card.id)] || srs?.status || 'unseen';
        return getEffectiveCardStatus(st, srs) === statusFilter;
      });
    },
    [statusMap, srsMap]
  );

  // Client-side filter by study status (due / again / unseen / learned / remembered / mastered)
  const filteredCards = useMemo(
    () => filterCardsByStatus(cards, selectedStatus),
    [cards, selectedStatus, filterCardsByStatus]
  );

  const safeIndex = useMemo(() => {
    if (filteredCards.length === 0) return 0;
    if (currentCardId != null) {
      const idxById = filteredCards.findIndex(
        (c) => String(c.id) === String(currentCardId)
      );
      if (idxById >= 0) {
        return idxById;
      }
    }
    return Math.min(currentIndex, filteredCards.length - 1);
  }, [filteredCards, currentCardId, currentIndex]);

  // Compute progress counts & Anki due queue count across current card set
  const progressStats = useMemo(() => {
    let learnedCount = 0;
    let rememberedCount = 0;
    let masteredCount = 0;
    const cardIds = [];
    for (const card of cards) {
      cardIds.push(card.id);
      const st =
        statusMap[String(card.id)] || srsMap[String(card.id)]?.status;
      if (st === 'learned') learnedCount += 1;
      else if (st === 'remembered') rememberedCount += 1;
      else if (st === 'mastered') masteredCount += 1;
    }
    const queueSummary = computeAnkiQueueSummary(cardIds, srsMap);
    return {
      learnedCount,
      rememberedCount,
      masteredCount,
      dueCount: queueSummary.due_count,
    };
  }, [cards, statusMap, srsMap]);

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
    (nextIdx, nextCardId = null) => {
      setCurrentIndex(nextIdx);
      const targetCard =
        nextCardId != null
          ? filteredCards.find((c) => String(c.id) === String(nextCardId)) ||
            cards.find((c) => String(c.id) === String(nextCardId))
          : filteredCards[nextIdx];
      setCurrentCardId(targetCard ? targetCard.id : nextCardId);
      if (targetCard) {
        recordStudySession(targetCard, nextIdx);
      }
    },
    [filteredCards, cards, recordStudySession]
  );

  const handleStatusChange = useCallback(
    (cardId, ratingOrStatus) => {
      const prevSrs = srsMap[String(cardId)] || null;
      const {
        srsMap: nextSrsMap,
        statusMap: nextStatusMap,
        cardSrs,
      } = reviewCardWithAnki(user, cardId, ratingOrStatus);

      setSrsByScope((prev) => ({
        ...prev,
        [userStorageKey]: nextSrsMap,
      }));
      setStatusByScope((prev) => ({
        ...prev,
        [userStorageKey]: nextStatusMap,
      }));

      const localReviewedAt = cardSrs?.last_reviewed_at
        ? new Date(cardSrs.last_reviewed_at).getTime()
        : Date.now();

      if (!isGuest && user?.id) {
        reviewCardApi(cardId, {
          rating: ratingOrStatus,
          current_state: prevSrs,
        })
          .then((serverReview) => {
            if (serverReview && typeof serverReview === 'object') {
              const currentMap = getCardSrsMap(user);
              const latestLocal = currentMap[String(cardId)];
              const latestLocalTs = latestLocal?.last_reviewed_at
                ? new Date(latestLocal.last_reviewed_at).getTime()
                : 0;
              if (latestLocalTs > localReviewedAt + 500) {
                return;
              }
              const saved = saveCardSrsState(user, cardId, serverReview);
              setSrsByScope((prev) => ({
                ...prev,
                [userStorageKey]: saved.srsMap,
              }));
              setStatusByScope((prev) => ({
                ...prev,
                [userStorageKey]: saved.statusMap,
              }));
            }
          })
          .catch(() => {});
      }

      const targetCard = filteredCards.find(
        (c) => String(c.id) === String(cardId)
      );
      if (targetCard) {
        recordStudySession(targetCard, safeIndex);
      }

      if (cardSrs && cardSrs.state !== 'new') {
        const effectiveStatus = getEffectiveCardStatus(
          cardSrs.status,
          cardSrs
        );
        const label = STUDY_STATUS_LABELS[effectiveStatus] || 'Đã học';
        showToast(
          `Đã đánh dấu: ${label} · Ôn lại sau ${cardSrs.interval_display}`,
          'success'
        );
      } else {
        showToast('Đã đặt lại trạng thái: Chưa học', 'info');
      }

      return {
        srsMap: nextSrsMap,
        statusMap: nextStatusMap,
        cardSrs,
      };
    },
    [
      user,
      isGuest,
      userStorageKey,
      srsMap,
      filteredCards,
      safeIndex,
      recordStudySession,
      showToast,
    ]
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
      <main className="w-full mx-auto px-4 sm:px-6 py-8">
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
      <main className="w-full mx-auto px-3 sm:px-6 pt-3 pb-20 sm:pb-5 flex-1 flex flex-col gap-3">
        {/* Filter & Mode Toolbar */}
        <FilterBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCreateCard={handleOpenCreateCard}
          onOpenSidebar={openSidebar}
          searchQuery={searchQuery}
          setSearchQuery={(val) => {
            setSearchQuery(val);
            resetCardPosition();
          }}
          selectedType={selectedType}
          setSelectedType={(val) => {
            setSelectedType(val);
            resetCardPosition();
          }}
          selectedLevel={selectedLevel}
          setSelectedLevel={(val) => {
            setSelectedLevel(val);
            resetCardPosition();
          }}
          selectedCourse={effectiveCourse}
          setSelectedCourse={handleSelectCourse}
          selectedLesson={selectedLesson}
          setSelectedLesson={(val) => {
            setSelectedLesson(val);
            resetCardPosition();
          }}
          selectedStatus={selectedStatus}
          setSelectedStatus={(val) => {
            const nextFiltered = filterCardsByStatus(cards, val);
            setSelectedStatus(val);
            setCurrentIndex(0);
            setCurrentCardId(nextFiltered[0]?.id ?? null);
          }}
          scope={effectiveScope}
          setScope={(val) => {
            setScope(val);
            resetCardPosition();
          }}
          courses={courses}
          lessons={lessons}
          hideScopeToggle={defaultScope === 'mine'}
          currentCardNumber={filteredCards.length > 0 ? safeIndex + 1 : 0}
          totalCount={cards.length}
          learnedCount={progressStats.learnedCount}
          rememberedCount={progressStats.rememberedCount}
          masteredCount={progressStats.masteredCount}
          dueCount={progressStats.dueCount}
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
              srsMap={srsMap}
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
              srsMap={srsMap}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <TableView
              cards={filteredCards}
              statusMap={statusMap}
              srsMap={srsMap}
              onSelectCard={(card) => {
                setSelectedDetailCard(card);
                const idx = filteredCards.findIndex((c) => c.id === card.id);
                if (idx >= 0) {
                  setCurrentIndex(idx);
                  setCurrentCardId(card.id);
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
          status={
            statusMap[String(selectedDetailCard.id)] ||
            srsMap[String(selectedDetailCard.id)]?.status ||
            'unseen'
          }
          srsState={srsMap[String(selectedDetailCard.id)] || null}
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
