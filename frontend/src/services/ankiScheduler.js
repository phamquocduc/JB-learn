export const ANKI_DEFAULT_CONFIG = Object.freeze({
  learningStepsMinutes: [1, 10],
  relearningStepsMinutes: [10],
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  startingEase: 2.5,
  minimumEase: 1.3,
  easyBonus: 1.3,
  hardFactor: 1.2,
  lapseNewIntervalFactor: 0.5,
  minimumLapseIntervalDays: 1,
  maxIntervalDays: 36500,
  matureIntervalDays: 21,
});

const RATING_MAP = Object.freeze({
  '0': 0,
  unseen: 0,
  reset: 0,
  '1': 1,
  again: 1,
  '2': 2,
  hard: 2,
  learned: 2,
  '3': 3,
  good: 3,
  remembered: 3,
  '4': 4,
  easy: 4,
  mastered: 4,
});

export function normalizeRating(rating) {
  if (typeof rating === 'boolean' || rating === null || rating === undefined) {
    throw new Error('Giá trị đánh giá không hợp lệ.');
  }
  const key = String(rating).trim().toLowerCase();
  if (!(key in RATING_MAP)) {
    throw new Error('Giá trị đánh giá không hợp lệ.');
  }
  return RATING_MAP[key];
}

export function defaultSrsState() {
  return {
    state: 'new',
    status: 'unseen',
    step_index: 0,
    interval: 0,
    learning_minutes: 0,
    ease_factor: ANKI_DEFAULT_CONFIG.startingEase,
    repetitions: 0,
    lapses: 0,
    due_at: null,
    last_reviewed_at: null,
    last_rating: null,
  };
}

function toDate(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    const ms = val > 1e11 ? val : val * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function normalizeSrsState(raw) {
  const base = defaultSrsState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  let state = String(raw.state || 'new').trim().toLowerCase();
  if (!['new', 'learning', 'review', 'relearning'].includes(state)) {
    state = 'new';
  }

  let status = String(raw.status || 'unseen').trim().toLowerCase();
  if (!['unseen', 'learned', 'remembered', 'mastered'].includes(status)) {
    if (state === 'new') status = 'unseen';
    else if (state === 'learning' || state === 'relearning') status = 'learned';
    else status = 'remembered';
  }

  const stepIndex = Math.max(0, Number.parseInt(raw.step_index ?? 0, 10) || 0);
  const interval = Math.max(0, Number.parseInt(raw.interval ?? 0, 10) || 0);
  let learningMinutes = Math.max(
    0,
    Number.parseInt(raw.learning_minutes ?? 0, 10) || 0
  );
  if (learningMinutes <= 0) {
    if (state === 'relearning') {
      const steps = ANKI_DEFAULT_CONFIG.relearningStepsMinutes;
      learningMinutes = steps[Math.min(stepIndex, steps.length - 1)] || 10;
    } else if (state === 'learning') {
      const steps = ANKI_DEFAULT_CONFIG.learningStepsMinutes;
      learningMinutes = steps[Math.min(stepIndex, steps.length - 1)] || 1;
    }
  }

  let easeFactor = Number.parseFloat(
    raw.ease_factor ?? ANKI_DEFAULT_CONFIG.startingEase
  );
  if (!Number.isFinite(easeFactor)) {
    easeFactor = ANKI_DEFAULT_CONFIG.startingEase;
  }
  easeFactor = Math.max(
    ANKI_DEFAULT_CONFIG.minimumEase,
    Math.round(easeFactor * 10000) / 10000
  );

  const repetitions = Math.max(
    0,
    Number.parseInt(raw.repetitions ?? 0, 10) || 0
  );
  const lapses = Math.max(0, Number.parseInt(raw.lapses ?? 0, 10) || 0);

  const dueDate = toDate(raw.due_at);
  const lastReviewedDate = toDate(raw.last_reviewed_at);
  const lastRating = [1, 2, 3, 4].includes(Number(raw.last_rating))
    ? Number(raw.last_rating)
    : null;

  return {
    state,
    status,
    step_index: stepIndex,
    interval,
    learning_minutes: learningMinutes,
    ease_factor: easeFactor,
    repetitions,
    lapses,
    due_at: dueDate ? dueDate.toISOString() : null,
    last_reviewed_at: lastReviewedDate ? lastReviewedDate.toISOString() : null,
    last_rating: lastRating,
  };
}

export function formatIntervalVi(state, intervalDays, learningMinutes) {
  if (
    state === 'learning' ||
    state === 'relearning' ||
    (Number(intervalDays) <= 0 && Number(learningMinutes) > 0)
  ) {
    const mins = Math.max(1, Math.round(Number(learningMinutes) || 1));
    if (mins < 60) {
      return `${mins} phút`;
    }
    const hours = Math.round((mins / 60) * 10) / 10;
    return `${hours} giờ`;
  }

  const days = Math.max(1, Math.round(Number(intervalDays) || 1));
  if (days < 30) {
    return `${days} ngày`;
  }
  if (days < 365) {
    const months = Math.round((days / 30) * 10) / 10;
    return `${months} tháng`;
  }
  const years = Math.round((days / 365) * 10) / 10;
  return `${years} năm`;
}

export function scheduleCardReview(currentRaw, rating, now = new Date()) {
  const ratingNum = normalizeRating(rating);
  if (ratingNum === 0) {
    return {
      ...defaultSrsState(),
      is_due: false,
      interval_display: 'Chưa học',
    };
  }

  const nowDt = toDate(now) || new Date();
  const cur = normalizeSrsState(currentRaw);
  const cfg = ANKI_DEFAULT_CONFIG;

  const state = cur.state;
  const stepIndex = cur.step_index;
  const interval = cur.interval;
  let easeFactor = cur.ease_factor;
  const repetitions = cur.repetitions + 1;
  let lapses = cur.lapses;
  const learningSteps = cfg.learningStepsMinutes;
  const relearningSteps = cfg.relearningStepsMinutes;

  let nextState = 'learning';
  let nextStatus = 'learned';
  let nextStep = 0;
  let nextInterval = 0;
  let nextLearningMins = 0;
  let dueAt = nowDt;

  if (state === 'new' || state === 'learning') {
    if (ratingNum === 1) {
      nextState = 'learning';
      nextStep = 0;
      nextLearningMins = learningSteps[0];
      nextInterval = 0;
      dueAt = new Date(nowDt.getTime() + nextLearningMins * 60000);
      nextStatus = 'learned';
    } else if (ratingNum === 2) {
      nextState = 'learning';
      nextStep = stepIndex;
      if (stepIndex === 0 && learningSteps.length >= 2) {
        nextLearningMins = Math.round(
          (learningSteps[0] + learningSteps[1]) / 2
        );
      } else if (stepIndex === 0 && learningSteps.length === 1) {
        nextLearningMins = Math.max(1, Math.round(learningSteps[0] * 1.5));
      } else {
        const idx = Math.min(stepIndex, learningSteps.length - 1);
        nextLearningMins = learningSteps[idx];
      }
      nextInterval = 0;
      dueAt = new Date(nowDt.getTime() + nextLearningMins * 60000);
      nextStatus = 'learned';
    } else if (ratingNum === 3) {
      const nextStepCandidate = stepIndex + 1;
      if (nextStepCandidate < learningSteps.length) {
        nextState = 'learning';
        nextStep = nextStepCandidate;
        nextLearningMins = learningSteps[nextStep];
        nextInterval = 0;
        dueAt = new Date(nowDt.getTime() + nextLearningMins * 60000);
        nextStatus = 'remembered';
      } else {
        nextState = 'review';
        nextStep = 0;
        nextLearningMins = 0;
        nextInterval = cfg.graduatingIntervalDays;
        dueAt = new Date(nowDt.getTime() + nextInterval * 86400000);
        nextStatus = 'remembered';
      }
    } else {
      // 4 = Easy
      nextState = 'review';
      nextStep = 0;
      nextLearningMins = 0;
      nextInterval = cfg.easyIntervalDays;
      dueAt = new Date(nowDt.getTime() + nextInterval * 86400000);
      nextStatus = 'mastered';
    }
  } else if (state === 'relearning') {
    if (ratingNum === 1) {
      nextState = 'relearning';
      nextStep = 0;
      nextLearningMins = relearningSteps[0];
      nextInterval = Math.max(cfg.minimumLapseIntervalDays, interval);
      dueAt = new Date(nowDt.getTime() + nextLearningMins * 60000);
      nextStatus = 'learned';
    } else if (ratingNum === 2) {
      nextState = 'relearning';
      nextStep = stepIndex;
      if (stepIndex === 0 && relearningSteps.length >= 2) {
        nextLearningMins = Math.round(
          (relearningSteps[0] + relearningSteps[1]) / 2
        );
      } else if (stepIndex === 0 && relearningSteps.length === 1) {
        nextLearningMins = Math.max(1, Math.round(relearningSteps[0] * 1.5));
      } else {
        const idx = Math.min(stepIndex, relearningSteps.length - 1);
        nextLearningMins = relearningSteps[idx];
      }
      nextInterval = Math.max(cfg.minimumLapseIntervalDays, interval);
      dueAt = new Date(nowDt.getTime() + nextLearningMins * 60000);
      nextStatus = 'learned';
    } else if (ratingNum === 3) {
      const nextStepCandidate = stepIndex + 1;
      if (nextStepCandidate < relearningSteps.length) {
        nextState = 'relearning';
        nextStep = nextStepCandidate;
        nextLearningMins = relearningSteps[nextStep];
        nextInterval = Math.max(cfg.minimumLapseIntervalDays, interval);
        dueAt = new Date(nowDt.getTime() + nextLearningMins * 60000);
        nextStatus = 'remembered';
      } else {
        nextState = 'review';
        nextStep = 0;
        nextLearningMins = 0;
        nextInterval = Math.max(cfg.minimumLapseIntervalDays, interval);
        dueAt = new Date(nowDt.getTime() + nextInterval * 86400000);
        nextStatus =
          nextInterval >= cfg.matureIntervalDays ? 'mastered' : 'remembered';
      }
    } else {
      // 4 = Easy
      nextState = 'review';
      nextStep = 0;
      nextLearningMins = 0;
      nextInterval = Math.min(
        cfg.maxIntervalDays,
        Math.max(cfg.easyIntervalDays, interval + 1)
      );
      dueAt = new Date(nowDt.getTime() + nextInterval * 86400000);
      nextStatus = 'mastered';
    }
  } else {
    // state === 'review'
    const prevIvl = Math.max(1, interval);
    let daysLate = 0;
    const prevDue = toDate(cur.due_at);
    if (prevDue && nowDt.getTime() > prevDue.getTime()) {
      daysLate = Math.max(
        0,
        (nowDt.getTime() - prevDue.getTime()) / 86400000
      );
    }

    if (ratingNum === 1) {
      nextState = 'relearning';
      nextStep = 0;
      lapses += 1;
      easeFactor = Math.max(
        cfg.minimumEase,
        Math.round((easeFactor - 0.2) * 10000) / 10000
      );
      nextInterval = Math.max(
        cfg.minimumLapseIntervalDays,
        Math.round(prevIvl * cfg.lapseNewIntervalFactor)
      );
      nextLearningMins = relearningSteps[0];
      dueAt = new Date(nowDt.getTime() + nextLearningMins * 60000);
      nextStatus = 'learned';
    } else if (ratingNum === 2) {
      nextState = 'review';
      nextStep = 0;
      nextLearningMins = 0;
      easeFactor = Math.max(
        cfg.minimumEase,
        Math.round((easeFactor - 0.15) * 10000) / 10000
      );
      const hardIvl = Math.max(
        prevIvl + 1,
        Math.round(prevIvl * cfg.hardFactor)
      );
      nextInterval = Math.min(cfg.maxIntervalDays, hardIvl);
      dueAt = new Date(nowDt.getTime() + nextInterval * 86400000);
      nextStatus = 'learned';
    } else if (ratingNum === 3) {
      nextState = 'review';
      nextStep = 0;
      nextLearningMins = 0;
      const hardIvl = Math.max(
        prevIvl + 1,
        Math.round(prevIvl * cfg.hardFactor)
      );
      const goodIvl = Math.max(
        hardIvl,
        Math.round((prevIvl + daysLate / 2) * easeFactor)
      );
      nextInterval = Math.min(cfg.maxIntervalDays, goodIvl);
      dueAt = new Date(nowDt.getTime() + nextInterval * 86400000);
      nextStatus =
        nextInterval >= cfg.matureIntervalDays ? 'mastered' : 'remembered';
    } else {
      // 4 = Easy
      nextState = 'review';
      nextStep = 0;
      nextLearningMins = 0;
      const oldEase = easeFactor;
      easeFactor = Math.max(
        cfg.minimumEase,
        Math.round((easeFactor + 0.15) * 10000) / 10000
      );
      const hardIvl = Math.max(
        prevIvl + 1,
        Math.round(prevIvl * cfg.hardFactor)
      );
      const goodIvl = Math.max(
        hardIvl,
        Math.round((prevIvl + daysLate / 2) * oldEase)
      );
      const easyIvl = Math.max(
        goodIvl + 1,
        Math.round((prevIvl + daysLate) * easeFactor * cfg.easyBonus)
      );
      nextInterval = Math.min(cfg.maxIntervalDays, easyIvl);
      dueAt = new Date(nowDt.getTime() + nextInterval * 86400000);
      nextStatus = 'mastered';
    }
  }

  return {
    state: nextState,
    status: nextStatus,
    step_index: nextStep,
    interval: nextInterval,
    learning_minutes: nextLearningMins,
    ease_factor: Math.round(easeFactor * 10000) / 10000,
    repetitions,
    lapses,
    due_at: dueAt.toISOString(),
    last_reviewed_at: nowDt.toISOString(),
    last_rating: ratingNum,
    is_due: false,
    interval_display: formatIntervalVi(
      nextState,
      nextInterval,
      nextLearningMins
    ),
  };
}

export function getIntervalPreviews(currentRaw, now = new Date()) {
  const nowDt = toDate(now) || new Date();
  const againRes = scheduleCardReview(currentRaw, 1, nowDt);
  const hardRes = scheduleCardReview(currentRaw, 2, nowDt);
  const goodRes = scheduleCardReview(currentRaw, 3, nowDt);
  const easyRes = scheduleCardReview(currentRaw, 4, nowDt);

  return {
    again: againRes.interval_display,
    hard: hardRes.interval_display,
    good: goodRes.interval_display,
    easy: easyRes.interval_display,
    learned: hardRes.interval_display,
    remembered: goodRes.interval_display,
    mastered: easyRes.interval_display,
  };
}

export function isCardDue(srsRaw, now = new Date()) {
  if (!srsRaw || typeof srsRaw !== 'object') return false;
  const cur = normalizeSrsState(srsRaw);
  if (cur.state === 'new') return false;
  if (!cur.due_at) return true;
  const dueDt = toDate(cur.due_at);
  if (!dueDt) return true;
  const nowDt = toDate(now) || new Date();
  return dueDt.getTime() <= nowDt.getTime();
}

export function serializeSrsState(srsRaw, now = new Date()) {
  const nowDt = toDate(now) || new Date();
  const cur = normalizeSrsState(srsRaw);
  const due = isCardDue(cur, nowDt);
  const intervalDisplay =
    cur.state === 'new'
      ? 'Chưa học'
      : formatIntervalVi(cur.state, cur.interval, cur.learning_minutes);

  return {
    ...cur,
    is_due: due,
    interval_display: intervalDisplay,
    next_intervals: getIntervalPreviews(cur, nowDt),
  };
}

export function computeAnkiQueueSummary(cardIds = [], srsMap = {}, now = new Date()) {
  const nowDt = toDate(now) || new Date();
  let newCount = 0;
  let learningCount = 0;
  let dueCount = 0;
  let reviewCount = 0;

  for (const cid of cardIds) {
    const raw = srsMap[cid] || srsMap[String(cid)];
    if (!raw || typeof raw !== 'object') {
      newCount += 1;
      continue;
    }
    const cur = normalizeSrsState(raw);
    if (cur.state === 'new') {
      newCount += 1;
    } else if (cur.state === 'learning' || cur.state === 'relearning') {
      learningCount += 1;
      if (isCardDue(cur, nowDt)) {
        dueCount += 1;
      }
    } else if (cur.state === 'review') {
      reviewCount += 1;
      if (isCardDue(cur, nowDt)) {
        dueCount += 1;
      }
    }
  }

  return {
    new_count: newCount,
    learning_count: learningCount,
    due_count: dueCount,
    review_count: reviewCount,
  };
}

export function isValidStudyRating(rating) {
  try {
    const num = normalizeRating(rating);
    return num >= 1 && num <= 4;
  } catch {
    return false;
  }
}

export function getActiveSessionCutoffMs(srsMap = {}, now = new Date()) {
  if (!srsMap || typeof srsMap !== 'object') return null;
  const nowDt = toDate(now) || new Date();
  const nowMs = nowDt.getTime();
  const MAX_IDLE_SINCE_LAST_REVIEW_MS = 30 * 60 * 1000;
  const SESSION_GAP_MS = 15 * 60 * 1000;

  const reviewedTimes = [];
  for (const raw of Object.values(srsMap)) {
    if (!raw || typeof raw !== 'object') continue;
    const revDt = toDate(raw.last_reviewed_at);
    if (revDt) {
      const ms = revDt.getTime();
      if (Number.isFinite(ms) && ms <= nowMs + 60000) {
        reviewedTimes.push(ms);
      }
    }
  }

  if (reviewedTimes.length === 0) return null;
  reviewedTimes.sort((a, b) => b - a);

  if (nowMs - reviewedTimes[0] > MAX_IDLE_SINCE_LAST_REVIEW_MS) {
    return null;
  }

  let cutoffMs = reviewedTimes[0];
  for (let i = 1; i < reviewedTimes.length; i += 1) {
    if (cutoffMs - reviewedTimes[i] <= SESSION_GAP_MS) {
      cutoffMs = reviewedTimes[i];
    } else {
      break;
    }
  }
  return cutoffMs;
}

function isCardInActiveSession(srs, cutoffMs) {
  if (cutoffMs === null || !srs) return false;
  const revMs = toDate(srs.last_reviewed_at)?.getTime() ?? 0;
  const dueMs = toDate(srs.due_at)?.getTime() ?? 0;
  return revMs >= cutoffMs - 1000 || dueMs >= cutoffMs - 1000;
}

export function sortCardsByAnkiPriority(cards = [], srsMap = {}, now = new Date()) {
  const nowDt = toDate(now) || new Date();
  const cutoffMs = getActiveSessionCutoffMs(srsMap, nowDt);
  const getPriorityBucket = (card) => {
    const raw = srsMap[card.id] || srsMap[String(card.id)];
    if (!raw) return { bucket: 3, sessionTier: 1, subBucket: 0, dueTime: 0 };
    const cur = normalizeSrsState(raw);
    const due = isCardDue(cur, nowDt);
    const dueTime = cur.due_at ? new Date(cur.due_at).getTime() : 0;
    const isAgain = cur.state === 'relearning' || Number(cur.last_rating) === 1;
    const sessionTier = isCardInActiveSession(cur, cutoffMs) ? 0 : 1;

    if ((cur.state === 'learning' || cur.state === 'relearning') && due) {
      return { bucket: 0, sessionTier, subBucket: isAgain ? 0 : 1, dueTime };
    }
    if (cur.state === 'review' && due) {
      return { bucket: 1, sessionTier: 1, subBucket: 0, dueTime };
    }
    if (cur.state === 'learning' || cur.state === 'relearning') {
      return { bucket: 2, sessionTier, subBucket: isAgain ? 0 : 1, dueTime };
    }
    if (cur.state === 'new') {
      return { bucket: 3, sessionTier: 1, subBucket: 0, dueTime: 0 };
    }
    return { bucket: 4, sessionTier: 1, subBucket: 0, dueTime };
  };

  return [...cards].sort((a, b) => {
    const pa = getPriorityBucket(a);
    const pb = getPriorityBucket(b);
    if (pa.bucket !== pb.bucket) return pa.bucket - pb.bucket;
    if (pa.sessionTier !== pb.sessionTier) return pa.sessionTier - pb.sessionTier;
    if (pa.subBucket !== pb.subBucket) return pa.subBucket - pb.subBucket;
    if (pa.dueTime !== pb.dueTime) return pa.dueTime - pb.dueTime;
    return (a.id || 0) - (b.id || 0);
  });
}

export function getEarliestUpcomingDueTime(
  srsMap = {},
  now = new Date(),
  cardIds = null
) {
  if (!srsMap || typeof srsMap !== 'object') return null;
  const nowDt = toDate(now) || new Date();
  const nowMs = nowDt.getTime();
  let minDueMs = null;

  const entries = Array.isArray(cardIds)
    ? cardIds.map((cid) => srsMap[cid] || srsMap[String(cid)])
    : Object.values(srsMap);

  for (const raw of entries) {
    if (!raw || typeof raw !== 'object') continue;
    const cur = normalizeSrsState(raw);
    if (cur.state === 'new' || !cur.due_at) continue;
    const dueDt = toDate(cur.due_at);
    if (!dueDt) continue;
    const dueMs = dueDt.getTime();

    if (!raw.is_due && dueMs <= nowMs) {
      return nowMs;
    }
    if (dueMs > nowMs && (minDueMs === null || dueMs < minDueMs)) {
      minDueMs = dueMs;
    }
  }

  return minDueMs;
}

export function refreshSrsMapDueStates(srsMap = {}, now = new Date()) {
  if (!srsMap || typeof srsMap !== 'object') {
    return { changed: false, srsMap: {}, newlyDueCardIds: [] };
  }
  const nowDt = toDate(now) || new Date();
  let changed = false;
  const nextMap = { ...srsMap };
  const newlyDueCardIds = [];

  for (const [cid, raw] of Object.entries(srsMap)) {
    if (!raw || typeof raw !== 'object') continue;
    const due = isCardDue(raw, nowDt);
    if (Boolean(raw.is_due) !== due) {
      nextMap[cid] = serializeSrsState(raw, nowDt);
      changed = true;
      if (due) {
        newlyDueCardIds.push(String(cid));
      }
    }
  }

  return {
    changed,
    srsMap: changed ? nextMap : srsMap,
    newlyDueCardIds,
  };
}

export function getNextStudyCardIndex(
  cards = [],
  srsMap = {},
  currentIndex = 0,
  currentCardId = null,
  options = {}
) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return {
      nextIndex: 0,
      nextCardId: null,
      isDueInterruption: false,
      hasDueLearningCard: false,
      resumeCardId: null,
    };
  }

  const {
    returnCardId = null,
    isCurrentCardUnrated = false,
    isManualNavigation = false,
    excludedDueCardIds = null,
    now = new Date(),
  } = options;
  const nowDt = toDate(now) || new Date();
  const cutoffMs = getActiveSessionCutoffMs(srsMap, nowDt);
  const excludedSet =
    excludedDueCardIds instanceof Set
      ? excludedDueCardIds
      : Array.isArray(excludedDueCardIds)
        ? new Set(excludedDueCardIds.map(String))
        : null;

  let resolvedCurrentIdx = -1;
  if (currentCardId != null) {
    resolvedCurrentIdx = cards.findIndex(
      (c) => String(c.id) === String(currentCardId)
    );
  }
  if (resolvedCurrentIdx < 0) {
    resolvedCurrentIdx = Math.max(0, Math.min(currentIndex, cards.length - 1));
  }

  const currentCard = cards[resolvedCurrentIdx];
  const currentLesson = currentCard?.lesson || '';

  const getCardSrs = (card) => {
    if (!card) return null;
    const raw = srsMap[card.id] || srsMap[String(card.id)];
    return raw && typeof raw === 'object' ? normalizeSrsState(raw) : null;
  };

  const isUnseen = (card) => {
    const s = getCardSrs(card);
    return !s || s.state === 'new' || s.status === 'unseen';
  };

  const isUnseenOrDue = (card) => {
    if (isUnseen(card)) return true;
    if (excludedSet && excludedSet.has(String(card?.id))) return false;
    const s = getCardSrs(card);
    return isCardDue(s, nowDt);
  };

  // 1. Compute normal sequential progression target (skipping already-studied non-due cards)
  let normalNextIndex = -1;
  if (
    returnCardId != null &&
    String(returnCardId) !== String(currentCard?.id)
  ) {
    const retIdx = cards.findIndex(
      (c) => String(c.id) === String(returnCardId)
    );
    if (retIdx >= 0) {
      if (isUnseenOrDue(cards[retIdx])) {
        normalNextIndex = retIdx;
      } else {
        for (let offset = 1; offset < cards.length; offset += 1) {
          const idx = (retIdx + offset) % cards.length;
          if (idx !== resolvedCurrentIdx && isUnseenOrDue(cards[idx])) {
            normalNextIndex = idx;
            break;
          }
        }
      }
    }
  }

  if (normalNextIndex < 0) {
    for (let offset = 1; offset < cards.length; offset += 1) {
      const idx = (resolvedCurrentIdx + offset) % cards.length;
      if (isUnseenOrDue(cards[idx])) {
        normalNextIndex = idx;
        break;
      }
    }
  }

  // When no unseen/due cards remain, surface pending learning/relearning cards by earliest due_at before wrapping to graduated review cards
  if (normalNextIndex < 0) {
    const pendingLearning = [];
    for (let idx = 0; idx < cards.length; idx += 1) {
      const s = getCardSrs(cards[idx]);
      if (
        s &&
        (s.state === 'learning' || s.state === 'relearning') &&
        !isCardDue(s, nowDt)
      ) {
        pendingLearning.push({
          idx,
          isAgain: s.state === 'relearning' || Number(s.last_rating) === 1,
          dueMs: toDate(s.due_at)?.getTime() ?? Number.MAX_SAFE_INTEGER,
        });
      }
    }

    const otherPending = pendingLearning.filter(
      (item) => item.idx !== resolvedCurrentIdx
    );
    const pool =
      otherPending.length > 0
        ? otherPending
        : !isManualNavigation
          ? pendingLearning
          : [];

    if (pool.length > 0) {
      pool.sort((a, b) => {
        if (a.isAgain !== b.isAgain) return a.isAgain ? -1 : 1;
        if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
        return a.idx - b.idx;
      });
      normalNextIndex = pool[0].idx;
    }
  }

  if (normalNextIndex < 0) {
    normalNextIndex = (resolvedCurrentIdx + 1) % cards.length;
  }

  // 2. Check for due cards: learning/relearning ("Học lại" / "Đang học") first, then due review ("Đến hạn ôn")
  const dueCandidates = [];
  for (let idx = 0; idx < cards.length; idx += 1) {
    if (cards.length > 1 && idx === resolvedCurrentIdx) {
      continue;
    }
    const card = cards[idx];
    if (excludedSet && excludedSet.has(String(card?.id))) {
      continue;
    }
    const s = getCardSrs(card);
    if (!s || s.state === 'new' || !isCardDue(s, nowDt)) continue;

    const isLearningTier =
      s.state === 'learning' || s.state === 'relearning';
    dueCandidates.push({
      idx,
      card,
      isLearningTier,
      isActiveSession: isLearningTier && isCardInActiveSession(s, cutoffMs),
      sameLesson: (card.lesson || '') === currentLesson,
      isAgain: s.state === 'relearning' || Number(s.last_rating) === 1,
      dueMs: toDate(s.due_at)?.getTime() ?? 0,
    });
  }

  if (dueCandidates.length > 0) {
    dueCandidates.sort((a, b) => {
      if (a.isLearningTier !== b.isLearningTier) {
        return a.isLearningTier ? -1 : 1;
      }
      if (a.isActiveSession !== b.isActiveSession) {
        return a.isActiveSession ? -1 : 1;
      }
      if (a.sameLesson !== b.sameLesson) return a.sameLesson ? -1 : 1;
      if (a.isAgain !== b.isAgain) return a.isAgain ? -1 : 1;
      if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
      return a.idx - b.idx;
    });

    const topDue = dueCandidates[0];

    let fallbackResumeId = isCurrentCardUnrated
      ? currentCard?.id ?? null
      : cards[normalNextIndex]?.id ?? null;

    if (
      fallbackResumeId != null &&
      String(fallbackResumeId) === String(topDue.card.id)
    ) {
      for (let offset = 1; offset < cards.length; offset += 1) {
        const idx = (resolvedCurrentIdx + offset) % cards.length;
        if (idx !== topDue.idx && isUnseen(cards[idx])) {
          fallbackResumeId = cards[idx].id;
          break;
        }
      }
    }

    const resumeCardId =
      returnCardId != null && String(returnCardId) !== String(topDue.card.id)
        ? returnCardId
        : fallbackResumeId && String(fallbackResumeId) !== String(topDue.card.id)
          ? fallbackResumeId
          : null;

    return {
      nextIndex: topDue.idx,
      nextCardId: topDue.card.id,
      isDueInterruption: topDue.idx !== normalNextIndex,
      hasDueLearningCard: topDue.isLearningTier,
      resumeCardId,
    };
  }

  return {
    nextIndex: normalNextIndex,
    nextCardId: cards[normalNextIndex]?.id ?? null,
    isDueInterruption: false,
    hasDueLearningCard: false,
    resumeCardId: null,
  };
}

function normalizeExcludedIds(excludedDueCardIds) {
  if (!excludedDueCardIds) return [];
  if (excludedDueCardIds instanceof Set) {
    return Array.from(excludedDueCardIds, String);
  }
  if (Array.isArray(excludedDueCardIds)) {
    return excludedDueCardIds.map(String);
  }
  return [];
}

export function precomputeNextStudyPlan(
  cards = [],
  srsMap = {},
  currentIndex = 0,
  currentCardId = null,
  options = {}
) {
  const nowDt = toDate(options.now) || new Date();
  const returnCardId = options.returnCardId ?? null;
  const rawExcluded = normalizeExcludedIds(options.excludedDueCardIds);
  const inputExcludedKey = rawExcluded.join(',');

  if (!Array.isArray(cards) || cards.length === 0) {
    return {
      currentCardId: null,
      currentIndex: 0,
      returnCardId,
      inputExcludedKey,
      rateIndex: 0,
      rateCardId: null,
      rateResumeCardId: null,
      rateIsDueInterruption: false,
      rateHasDueLearningCard: false,
      nextIndex: 0,
      nextCardId: null,
      prevIndex: 0,
      prevCardId: null,
      shuffleIndex: 0,
      shuffleCardId: null,
      isDueInterruption: false,
      hasDueLearningCard: false,
      resumeCardId: null,
      nextSkippedDueIds: [],
      computedAtMs: nowDt.getTime(),
      earliestUpcomingDueMs: null,
    };
  }

  let resolvedCurrentIdx = -1;
  if (currentCardId != null) {
    resolvedCurrentIdx = cards.findIndex(
      (c) => String(c.id) === String(currentCardId)
    );
  }
  if (resolvedCurrentIdx < 0) {
    resolvedCurrentIdx = Math.max(0, Math.min(currentIndex, cards.length - 1));
  }
  const resolvedCardId = cards[resolvedCurrentIdx]?.id ?? null;

  const curRawSrs =
    resolvedCardId != null
      ? srsMap[resolvedCardId] || srsMap[String(resolvedCardId)]
      : null;
  const curNormSrs =
    curRawSrs && typeof curRawSrs === 'object'
      ? normalizeSrsState(curRawSrs)
      : null;
  const isCurDue = Boolean(
    curNormSrs &&
      curNormSrs.state !== 'new' &&
      isCardDue(curNormSrs, nowDt)
  );

  const manualExcludedDueIds =
    isCurDue &&
    resolvedCardId != null &&
    !rawExcluded.includes(String(resolvedCardId))
      ? [...rawExcluded, String(resolvedCardId)]
      : rawExcluded;

  // Pre-compute target when user rates the current card with one of the 4 study statuses
  const rateStudyNext = getNextStudyCardIndex(
    cards,
    srsMap,
    resolvedCurrentIdx,
    resolvedCardId,
    {
      ...options,
      returnCardId,
      excludedDueCardIds: [],
      isCurrentCardUnrated: false,
      isManualNavigation: false,
      now: nowDt,
    }
  );

  // Pre-compute target when user clicks manual navigation buttons (Next / Prev / Shuffle)
  const manualStudyNext = getNextStudyCardIndex(
    cards,
    srsMap,
    resolvedCurrentIdx,
    resolvedCardId,
    {
      ...options,
      returnCardId,
      excludedDueCardIds: manualExcludedDueIds,
      isCurrentCardUnrated: false,
      isManualNavigation: true,
      now: nowDt,
    }
  );

  const sequentialPrevIdx =
    resolvedCurrentIdx - 1 >= 0 ? resolvedCurrentIdx - 1 : cards.length - 1;

  let randomIdx = resolvedCurrentIdx;
  if (cards.length > 1) {
    const offset = 1 + Math.floor(Math.random() * (cards.length - 1));
    randomIdx = (resolvedCurrentIdx + offset) % cards.length;
  }

  const prevIndex = manualStudyNext.hasDueLearningCard
    ? manualStudyNext.nextIndex
    : sequentialPrevIdx;
  const prevCardId = cards[prevIndex]?.id ?? null;

  const shuffleIndex = manualStudyNext.hasDueLearningCard
    ? manualStudyNext.nextIndex
    : randomIdx;
  const shuffleCardId = cards[shuffleIndex]?.id ?? null;

  return {
    currentCardId: resolvedCardId,
    currentIndex: resolvedCurrentIdx,
    returnCardId,
    inputExcludedKey,
    rateIndex: rateStudyNext.nextIndex,
    rateCardId: rateStudyNext.nextCardId,
    rateResumeCardId: rateStudyNext.resumeCardId,
    rateIsDueInterruption: rateStudyNext.isDueInterruption,
    rateHasDueLearningCard: rateStudyNext.hasDueLearningCard,
    nextIndex: manualStudyNext.nextIndex,
    nextCardId: manualStudyNext.nextCardId,
    prevIndex,
    prevCardId,
    shuffleIndex,
    shuffleCardId,
    isDueInterruption: manualStudyNext.isDueInterruption,
    hasDueLearningCard: manualStudyNext.hasDueLearningCard,
    resumeCardId: manualStudyNext.resumeCardId,
    nextSkippedDueIds: manualExcludedDueIds,
    computedAtMs: nowDt.getTime(),
    earliestUpcomingDueMs: getEarliestUpcomingDueTime(srsMap, nowDt),
  };
}

export function resolveStudyTransition(
  precomputedPlan,
  actionType = 'next',
  cards = [],
  srsMap = {},
  currentIndex = 0,
  currentCardId = null,
  options = {}
) {
  const nowDt = toDate(options.now) || new Date();
  const nowMs = nowDt.getTime();
  const hasNewlyArrivedDue =
    precomputedPlan?.earliestUpcomingDueMs != null &&
    nowMs >= precomputedPlan.earliestUpcomingDueMs;
  const returnCardMismatch =
    options.returnCardId !== undefined &&
    String(precomputedPlan?.returnCardId ?? '') !==
      String(options.returnCardId ?? '');
  const excludedMismatch =
    actionType !== 'rate' &&
    options.excludedDueCardIds !== undefined &&
    precomputedPlan?.inputExcludedKey !== undefined &&
    normalizeExcludedIds(options.excludedDueCardIds).join(',') !==
      precomputedPlan.inputExcludedKey;

  const isPlanStale =
    actionType === 'rate' ||
    !precomputedPlan ||
    String(precomputedPlan.currentCardId ?? '') !==
      String(currentCardId ?? '') ||
    returnCardMismatch ||
    excludedMismatch ||
    hasNewlyArrivedDue;

  const plan = isPlanStale
    ? precomputeNextStudyPlan(cards, srsMap, currentIndex, currentCardId, {
        ...options,
        now: new Date(nowMs),
      })
    : precomputedPlan;

  if (actionType === 'rate') {
    return {
      targetIndex: plan.rateIndex ?? plan.nextIndex,
      targetCardId: plan.rateCardId ?? plan.nextCardId,
      resumeCardId:
        plan.rateResumeCardId !== undefined
          ? plan.rateResumeCardId
          : plan.resumeCardId,
      isDueInterruption:
        plan.rateIsDueInterruption !== undefined
          ? plan.rateIsDueInterruption
          : plan.isDueInterruption,
      hasDueLearningCard:
        plan.rateHasDueLearningCard !== undefined
          ? plan.rateHasDueLearningCard
          : plan.hasDueLearningCard,
      nextSkippedDueIds: [],
    };
  }

  if (actionType === 'prev') {
    return {
      targetIndex: plan.prevIndex,
      targetCardId: plan.prevCardId,
      resumeCardId: plan.hasDueLearningCard ? plan.resumeCardId : null,
      isDueInterruption: plan.hasDueLearningCard
        ? plan.isDueInterruption
        : false,
      hasDueLearningCard: plan.hasDueLearningCard,
      nextSkippedDueIds: plan.nextSkippedDueIds ?? [],
    };
  }

  if (actionType === 'shuffle') {
    return {
      targetIndex: plan.shuffleIndex,
      targetCardId: plan.shuffleCardId,
      resumeCardId: plan.hasDueLearningCard ? plan.resumeCardId : null,
      isDueInterruption: plan.hasDueLearningCard
        ? plan.isDueInterruption
        : false,
      hasDueLearningCard: plan.hasDueLearningCard,
      nextSkippedDueIds: plan.nextSkippedDueIds ?? [],
    };
  }

  return {
    targetIndex: plan.nextIndex,
    targetCardId: plan.nextCardId,
    resumeCardId: plan.resumeCardId,
    isDueInterruption: plan.isDueInterruption,
    hasDueLearningCard: plan.hasDueLearningCard,
    nextSkippedDueIds: plan.nextSkippedDueIds ?? [],
  };
}

export function findInitialDueStudyIndex(
  cards = [],
  srsMap = {},
  savedCardId = null,
  now = new Date(),
  savedReturnCardId = null
) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return { index: 0, returnCardId: null };
  }

  const nowDt = toDate(now) || new Date();
  const cutoffMs = getActiveSessionCutoffMs(srsMap, nowDt);
  const savedIdx =
    savedCardId != null
      ? cards.findIndex((c) => String(c.id) === String(savedCardId))
      : -1;
  const savedReturnIdx =
    savedReturnCardId != null
      ? cards.findIndex((c) => String(c.id) === String(savedReturnCardId))
      : -1;
  const savedLesson = savedIdx >= 0 ? cards[savedIdx]?.lesson || '' : '';

  const getCardSrs = (card) => {
    if (!card) return null;
    const raw = srsMap[card.id] || srsMap[String(card.id)];
    return raw && typeof raw === 'object' ? normalizeSrsState(raw) : null;
  };

  const isUnseen = (card) => {
    const s = getCardSrs(card);
    return !s || s.state === 'new' || s.status === 'unseen';
  };

  const dueCandidates = [];
  for (let idx = 0; idx < cards.length; idx += 1) {
    const card = cards[idx];
    const s = getCardSrs(card);
    if (!s || s.state === 'new' || !isCardDue(s, nowDt)) continue;

    const isLearningTier =
      s.state === 'learning' || s.state === 'relearning';
    dueCandidates.push({
      idx,
      card,
      isLearningTier,
      isActiveSession: isLearningTier && isCardInActiveSession(s, cutoffMs),
      sameLesson: savedLesson ? (card.lesson || '') === savedLesson : true,
      isAgain: s.state === 'relearning' || Number(s.last_rating) === 1,
      dueMs: toDate(s.due_at)?.getTime() ?? 0,
    });
  }

  if (dueCandidates.length > 0) {
    dueCandidates.sort((a, b) => {
      if (a.isLearningTier !== b.isLearningTier) {
        return a.isLearningTier ? -1 : 1;
      }
      if (a.isActiveSession !== b.isActiveSession) {
        return a.isActiveSession ? -1 : 1;
      }
      if (a.sameLesson !== b.sameLesson) return a.sameLesson ? -1 : 1;
      if (a.isAgain !== b.isAgain) return a.isAgain ? -1 : 1;
      if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
      return a.idx - b.idx;
    });

    const top = dueCandidates[0];
    let resumeId = null;

    if (
      savedReturnIdx >= 0 &&
      savedReturnIdx !== top.idx &&
      isUnseen(cards[savedReturnIdx])
    ) {
      resumeId = cards[savedReturnIdx].id;
    } else if (savedIdx >= 0 && savedIdx !== top.idx) {
      if (isUnseen(cards[savedIdx])) {
        resumeId = cards[savedIdx].id;
      } else {
        for (let offset = 1; offset < cards.length; offset += 1) {
          const idx = (savedIdx + offset) % cards.length;
          if (idx !== top.idx && isUnseen(cards[idx])) {
            resumeId = cards[idx].id;
            break;
          }
        }
      }
    } else {
      for (let idx = 0; idx < cards.length; idx += 1) {
        if (idx !== top.idx && isUnseen(cards[idx])) {
          resumeId = cards[idx].id;
          break;
        }
      }
    }

    return {
      index: top.idx,
      returnCardId: resumeId,
    };
  }

  // No due cards right now: resume at saved unseen card, or advance to the next unseen card
  if (savedIdx >= 0 && isUnseen(cards[savedIdx])) {
    return { index: savedIdx, returnCardId: null };
  }
  if (savedReturnIdx >= 0 && isUnseen(cards[savedReturnIdx])) {
    return { index: savedReturnIdx, returnCardId: null };
  }

  const scanBase = savedIdx >= 0 ? savedIdx : -1;
  for (let offset = 1; offset <= cards.length; offset += 1) {
    const idx = (scanBase + offset) % cards.length;
    if (isUnseen(cards[idx])) {
      return { index: idx, returnCardId: null };
    }
  }

  // All unseen cards finished: prefer pending learning/relearning cards before graduated review cards
  const pendingLearning = [];
  for (let idx = 0; idx < cards.length; idx += 1) {
    const s = getCardSrs(cards[idx]);
    if (s && (s.state === 'learning' || s.state === 'relearning')) {
      pendingLearning.push({
        idx,
        isAgain: s.state === 'relearning' || Number(s.last_rating) === 1,
        dueMs: toDate(s.due_at)?.getTime() ?? Number.MAX_SAFE_INTEGER,
      });
    }
  }
  if (pendingLearning.length > 0) {
    pendingLearning.sort((a, b) => {
      if (a.isAgain !== b.isAgain) return a.isAgain ? -1 : 1;
      if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
      return a.idx - b.idx;
    });
    return { index: pendingLearning[0].idx, returnCardId: null };
  }

  return {
    index: savedIdx >= 0 ? savedIdx : 0,
    returnCardId: null,
  };
}


