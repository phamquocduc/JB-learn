import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightOnRectangleIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
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
import { useSystemConfig } from '../context/useSystemConfig';
import { useToast } from '../context/useToast';
import {
  getStudyStatusLabel,
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
  beginCardReviewSync,
  finishCardReviewSync,
  getUnsyncedSyncPayload,
  clearSyncedReviews,
} from '../services/studyProgress';
import {
  computeAnkiQueueSummary,
  findInitialDueStudyIndex,
  getEarliestUpcomingDueTime,
  isCardDue,
  refreshSrsMapDueStates,
  sortCardsByAnkiPriority,
} from '../services/ankiScheduler';

function applyStatusFilter(
  cardList,
  statusFilter,
  activeSrsMap,
  activeStatusMap
) {
  if (!statusFilter) return cardList;
  if (statusFilter === 'due') {
    const dueCards = cardList.filter((card) =>
      isCardDue(activeSrsMap[String(card.id)])
    );
    return sortCardsByAnkiPriority(dueCards, activeSrsMap);
  }
  if (statusFilter === 'again') {
    const againCards = cardList.filter((card) => {
      const srs = activeSrsMap[String(card.id)];
      const st = activeStatusMap[String(card.id)] || srs?.status || 'unseen';
      return getEffectiveCardStatus(st, srs) === 'again';
    });
    return sortCardsByAnkiPriority(againCards, activeSrsMap);
  }
  const matched = cardList.filter((card) => {
    const srs = activeSrsMap[String(card.id)];
    const st = activeStatusMap[String(card.id)] || srs?.status || 'unseen';
    return getEffectiveCardStatus(st, srs) === statusFilter;
  });
  if (statusFilter === 'unseen') {
    return matched;
  }
  return sortCardsByAnkiPriority(matched, activeSrsMap);
}

export default function HomePage({ defaultScope = 'all' }) {
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    user,
    isGuest,
    loading: authLoading,
    openAuthModal,
    isAuthModalOpen,
    hasPermission,
    hasAnyPermission,
  } = useAuth();
  const { isModuleEnabled, getModuleBlockReason, getModuleInfo } =
    useSystemConfig();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation(['study', 'common']);

  useEffect(() => {
    document.title =
      defaultScope === 'mine'
        ? t('study:pageTitles.myDeck')
        : t('study:pageTitles.study');
  }, [defaultScope, t]);

  const cardsModuleEnabled = isModuleEnabled('study.cards');
  const personalCardsEnabled = isModuleEnabled('study.personal_cards');
  const canViewStudyCards = Boolean(
    cardsModuleEnabled &&
      (isGuest ||
        hasAnyPermission([
          'cards.view',
          'cards.view_all',
          'cards.edit',
          'cards.delete',
        ]))
  );
  const canViewPersonalCards = Boolean(
    cardsModuleEnabled &&
      personalCardsEnabled &&
      (isGuest ||
        hasAnyPermission([
          'personal_cards.view',
          'cards.view_all',
          'cards.edit',
          'cards.delete',
        ]))
  );
  const canViewCurrentScope =
    defaultScope === 'mine' ? canViewPersonalCards : canViewStudyCards;
  const canCreateCard = Boolean(
    !isGuest &&
      user &&
      (hasPermission('cards.create') ||
        (hasPermission('cards.create_own') && personalCardsEnabled))
  );

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
  const [returnCardId, setReturnCardId] = useState(null);
  const restoredContextKeyRef = useRef(null);

  const resetCardPosition = useCallback(() => {
    setCurrentIndex(0);
    setCurrentCardId(null);
    setReturnCardId(null);
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
  const [selectedStatus, setSelectedStatus] = useState(() => {
    const raw = searchParams.get('status') || '';
    return ['unseen', 'learned', 'remembered', 'mastered'].includes(raw)
      ? raw
      : '';
  });
  const selectedStatusRef = useRef(selectedStatus);
  useEffect(() => {
    selectedStatusRef.current = selectedStatus;
  }, [selectedStatus]);

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
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (courseId) {
            nextParams.set('course', courseId);
          } else {
            nextParams.delete('course');
          }
          return nextParams;
        },
        { replace: true }
      );
    },
    [resetCardPosition, setSearchParams]
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
  }, [authLoading, user, i18n.language]);

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
      setError(t('study:home.loadError'));
    } finally {
      setLoadingCards(false);
    }
  }, [authLoading, buildCardParams, user, userStorageKey, t]);

  const deckContextKey = `${userStorageKey}|${effectiveScope}|${effectiveCourse}|${selectedType}|${selectedLevel}|${selectedLesson}|${debouncedSearch}`;

  // Reactive card loader with race-condition protection & Anki SRS deck resume
  useEffect(() => {
    if (authLoading || !canViewCurrentScope) return;
    let ignore = false;

    fetchCards(buildCardParams())
      .then((data) => {
        if (!ignore) {
          const loadedCards = data.results || [];
          setCards(loadedCards);
          if (Array.isArray(data.lessons)) {
            setLessons(data.lessons);
          }
          let effectiveSrsMap = getCardSrsMap(user);
          let effectiveStatusMap = getCardStatusMap(user);
          if (data.srs_states && typeof data.srs_states === 'object') {
            const merged = mergeServerSrsMap(user, data.srs_states);
            effectiveSrsMap = merged.srsMap;
            effectiveStatusMap = merged.statusMap;
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

          // Flush any pending unsynced or guest reviews to backend
          if (!isGuest && user?.id) {
            const unsyncedPayload = getUnsyncedSyncPayload(user);
            if (Object.keys(unsyncedPayload).length > 0) {
              syncCardReviews(unsyncedPayload)
                .then((res) => {
                  clearSyncedReviews(user, unsyncedPayload);
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

          // Restore due-first / per-course card position whenever deck context changes
          if (
            loadedCards.length > 0 &&
            restoredContextKeyRef.current !== deckContextKey
          ) {
            restoredContextKeyRef.current = deckContextKey;
            const activeStatusFilter = selectedStatusRef.current;
            if (activeStatusFilter) {
              const nextFiltered = applyStatusFilter(
                loadedCards,
                activeStatusFilter,
                effectiveSrsMap,
                effectiveStatusMap
              );
              setCurrentIndex(0);
              setCurrentCardId(nextFiltered[0]?.id ?? null);
              setReturnCardId(null);
            } else {
              const saved = getLastStudySession(user, effectiveCourse);
              const { index: initialIdx, returnCardId: nextReturnId } =
                findInitialDueStudyIndex(
                  loadedCards,
                  effectiveSrsMap,
                  saved?.cardId ?? null,
                  new Date(),
                  saved?.returnCardId ?? null
                );
              setCurrentIndex(initialIdx);
              setCurrentCardId(loadedCards[initialIdx]?.id ?? null);
              setReturnCardId(nextReturnId);
            }
          } else if (loadedCards.length === 0) {
            restoredContextKeyRef.current = deckContextKey;
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          setError(t('study:home.loadError'));
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
  }, [
    authLoading,
    canViewCurrentScope,
    isGuest,
    user,
    userStorageKey,
    effectiveCourse,
    buildCardParams,
    deckContextKey,
    i18n.language,
    t,
  ]);

  const currentDeckCardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  // Live timer: automatically flip is_due to true as soon as any card's due_at arrives
  useEffect(() => {
    const earliestDueMs = getEarliestUpcomingDueTime(
      srsMap,
      new Date(),
      currentDeckCardIds
    );
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
  }, [srsMap, currentDeckCardIds, user, userStorageKey]);

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
    (cardList, statusFilter) =>
      applyStatusFilter(cardList, statusFilter, srsMap, statusMap),
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

  // Silently persist last study position per course for both Guests and Authenticated Users
  const recordStudySession = useCallback(
    (card, index, tabOverride, nextReturnCardId = returnCardId) => {
      if (!card?.id) return;
      if (
        selectedStatus &&
        selectedStatus !== 'due' &&
        selectedStatus !== 'again'
      ) {
        return;
      }
      saveLastStudySession(user, {
        cardId: card.id,
        returnCardId: nextReturnCardId ?? null,
        cardIndex: index,
        frontText: card.front_text || card.grammar || '',
        meaning: card.meaning || '',
        lesson: card.lesson || '',
        level: card.level || '',
        cardType: card.card_type || '',
        courseId: effectiveCourse,
        cardCourseId: card.course || '',
        activeTab: tabOverride || activeTab,
      });
    },
    [user, effectiveCourse, activeTab, returnCardId, selectedStatus]
  );

  const handleIndexChange = useCallback(
    (nextIdx, nextCardId = null, nextReturnCardId = undefined) => {
      setCurrentIndex(nextIdx);
      const resolvedReturnId =
        nextReturnCardId !== undefined ? nextReturnCardId : returnCardId;
      if (nextReturnCardId !== undefined) {
        setReturnCardId(nextReturnCardId);
      }
      const targetCard =
        nextCardId != null
          ? filteredCards.find((c) => String(c.id) === String(nextCardId)) ||
            cards.find((c) => String(c.id) === String(nextCardId))
          : filteredCards[nextIdx];
      setCurrentCardId(targetCard ? targetCard.id : nextCardId);
      if (targetCard) {
        recordStudySession(targetCard, nextIdx, undefined, resolvedReturnId);
      }
    },
    [filteredCards, cards, returnCardId, recordStudySession]
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

      if (!isGuest && user?.id) {
        const seq = beginCardReviewSync(user, cardId);
        reviewCardApi(cardId, {
          rating: ratingOrStatus,
          current_state: prevSrs,
        })
          .then((serverReview) => {
            const isLatest = finishCardReviewSync(user, cardId, seq, true);
            if (!isLatest) return;
            if (serverReview && typeof serverReview === 'object') {
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
          .catch(() => {
            finishCardReviewSync(user, cardId, seq, false);
          });
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
        const label =
          getStudyStatusLabel(effectiveStatus) || t('study:studyStatus.LEARNED');
        showToast(
          t('study:home.markedToast', {
            label,
            interval: cardSrs.interval_display,
          }),
          'success'
        );
      } else {
        showToast(t('study:home.resetToast'), 'info');
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
      t,
    ]
  );

  const handleSaveCard = async (payload, id) => {
    if (id) {
      await updateCard(id, payload);
      showToast(t('study:home.updateSuccess'), 'success');
    } else {
      await createCard(payload);
      showToast(t('study:home.createSuccess'), 'success');
    }
    await reloadCards();
    await refreshCourses();
  };

  const handleDeleteCard = async (card) => {
    const cardTitle =
      card.front_text || card.grammar || t('study:home.defaultCardTitle');
    const confirmed = window.confirm(
      t('study:home.deleteConfirm', { title: cardTitle })
    );
    if (!confirmed) return;

    try {
      await deleteCard(card.id);
      if (selectedDetailCard?.id === card.id) {
        setSelectedDetailCard(null);
      }
      if (String(currentCardId) === String(card.id)) {
        setCurrentCardId(null);
      }
      showToast(t('study:home.deleteToast', { title: cardTitle }), 'info');
      await reloadCards();
      await refreshCourses();
    } catch (err) {
      showToast(err.message || t('study:home.deleteError'), 'error');
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

  if (!canViewCurrentScope) {
    const disabledKey =
      defaultScope === 'mine' && !canViewPersonalCards
        ? 'study.personal_cards'
        : 'study.cards';
    const blockReason = getModuleBlockReason(disabledKey);
    const isRoleRestricted =
      blockReason === 'role_restricted' ||
      (blockReason === null &&
        ((defaultScope === 'mine' && personalCardsEnabled && cardsModuleEnabled) ||
          (defaultScope !== 'mine' && cardsModuleEnabled)));
    const note = getModuleInfo(disabledKey)?.maintenance_note;
    return (
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5">
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
              ? t('study:home.blockedTitle')
              : t('study:home.disabledTitle')
          }
          description={
            isRoleRestricted
              ? t('study:home.blockedDesc')
              : note || t('study:home.disabledDescFallback')
          }
        />
      </main>
    );
  }

  if (defaultScope === 'mine' && !authLoading && isGuest) {
    return (
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5">
        <Card className="p-6 sm:p-10 text-center flex flex-col items-center gap-4">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900">
            {t('study:home.guestPersonalTitle')}
          </h2>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => openAuthModal('login')}>
              <ArrowRightOnRectangleIcon className="w-4 h-4" aria-hidden="true" />
              <span>{t('study:home.loginNow')}</span>
            </Button>
            <Link
              to="/study"
              className="min-h-10 inline-flex items-center px-4 py-2 rounded-control border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
            >
              {t('study:home.publicCards')}
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <>
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-20 sm:pb-5 flex-1 flex flex-col gap-3">
        {/* Filter & Mode Toolbar */}
        <FilterBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCreateCard={canCreateCard ? handleOpenCreateCard : undefined}
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
            setSelectedStatus(val);
            if (val) {
              const nextFiltered = filterCardsByStatus(cards, val);
              setCurrentIndex(0);
              setCurrentCardId(nextFiltered[0]?.id ?? null);
              setReturnCardId(null);
            } else if (cards.length > 0) {
              const saved = getLastStudySession(user, effectiveCourse);
              const { index: restoredIdx, returnCardId: nextReturnId } =
                findInitialDueStudyIndex(
                  cards,
                  srsMap,
                  saved?.cardId ?? null,
                  new Date(),
                  saved?.returnCardId ?? null
                );
              setCurrentIndex(restoredIdx);
              setCurrentCardId(cards[restoredIdx]?.id ?? null);
              setReturnCardId(nextReturnId);
            } else {
              resetCardPosition();
            }
            setSearchParams(
              (prev) => {
                const nextParams = new URLSearchParams(prev);
                if (val) {
                  nextParams.set('status', val);
                } else {
                  nextParams.delete('status');
                }
                return nextParams;
              },
              { replace: true }
            );
          }}
          scope={effectiveScope}
          setScope={(val) => {
            setScope(val);
            resetCardPosition();
          }}
          courses={courses}
          lessons={lessons}
          hideScopeToggle={defaultScope === 'mine' || !personalCardsEnabled}
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
              title={t('study:home.loadErrorTitle')}
              description={error}
              actionLabel={t('common:actions.retry')}
              onAction={reloadCards}
            />
          ) : (loadingCards || authLoading) && cards.length === 0 ? (
            <Skeleton variant={activeTab} />
          ) : activeTab === 'flashcards' ? (
            <FlashcardView
              key={deckContextKey}
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
              initialReturnCardId={returnCardId}
            />
          ) : activeTab === 'practice' ? (
            <PracticeView
              key={deckContextKey}
              cards={filteredCards}
              currentIndex={safeIndex}
              onIndexChange={handleIndexChange}
              statusMap={statusMap}
              srsMap={srsMap}
              onStatusChange={handleStatusChange}
              initialReturnCardId={returnCardId}
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
          key={
            cardToEdit
              ? `card-${cardToEdit.id}`
              : `new-card-${effectiveCourse || 'none'}`
          }
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          onSubmit={handleSaveCard}
          onCourseCreated={refreshCourses}
          initialCard={cardToEdit}
          defaultCourseId={effectiveCourse}
          defaultType={selectedType}
          defaultLevel={selectedLevel}
          defaultLesson={selectedLesson}
          courses={courses}
        />
      )}
    </>
  );
}
