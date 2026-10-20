const PROGRESS_PREFIX = 'jb_study_status_v1_';
const SESSION_PREFIX = 'jb_last_session_v1_';

function getStorageKey(prefix, user) {
  const suffix = user?.id ? `user_${user.id}` : 'guest';
  return `${prefix}${suffix}`;
}

export function getCardStatusMap(user) {
  try {
    const guestRaw = localStorage.getItem(`${PROGRESS_PREFIX}guest`);
    const guestMap = guestRaw ? JSON.parse(guestRaw) : {};

    if (!user?.id) {
      return guestMap && typeof guestMap === 'object' ? guestMap : {};
    }

    const userKey = getStorageKey(PROGRESS_PREFIX, user);
    const userRaw = localStorage.getItem(userKey);
    const userMap = userRaw ? JSON.parse(userRaw) : {};
    return {
      ...(guestMap && typeof guestMap === 'object' ? guestMap : {}),
      ...(userMap && typeof userMap === 'object' ? userMap : {}),
    };
  } catch {
    return {};
  }
}

export function saveCardStatus(user, cardId, status) {
  if (!cardId) return getCardStatusMap(user);
  const current = getCardStatusMap(user);
  const next = { ...current };

  if (!status || status === 'unseen') {
    delete next[String(cardId)];
  } else {
    next[String(cardId)] = status;
  }

  try {
    const key = getStorageKey(PROGRESS_PREFIX, user);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }

  return next;
}

export function getLastStudySession(user) {
  try {
    const userKey = getStorageKey(SESSION_PREFIX, user);
    const raw = localStorage.getItem(userKey);
    if (raw) {
      return JSON.parse(raw);
    }
    if (user?.id) {
      const guestRaw = localStorage.getItem(`${SESSION_PREFIX}guest`);
      return guestRaw ? JSON.parse(guestRaw) : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLastStudySession(user, session) {
  if (!session || !session.cardId) return;
  const payload = {
    cardId: session.cardId,
    cardIndex: session.cardIndex ?? 0,
    frontText: session.frontText || '',
    meaning: session.meaning || '',
    lesson: session.lesson || '',
    level: session.level || '',
    cardType: session.cardType || '',
    courseId: session.courseId || '',
    activeTab: session.activeTab || 'flashcards',
    updatedAt: Date.now(),
  };

  try {
    const key = getStorageKey(SESSION_PREFIX, user);
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage quota errors
  }
}

/* ==================== Shadowing Progress & Session Helpers ==================== */

const SHADOWING_SESSION_PREFIX = 'jb_last_shadowing_session_v1_';
const SHADOWING_PROGRESS_PREFIX = 'jb_shadowing_segment_status_v1_';

export function getLastShadowingSession(user) {
  try {
    const userKey = getStorageKey(SHADOWING_SESSION_PREFIX, user);
    const raw = localStorage.getItem(userKey);
    if (raw) {
      return JSON.parse(raw);
    }
    if (user?.id) {
      const guestRaw = localStorage.getItem(`${SHADOWING_SESSION_PREFIX}guest`);
      return guestRaw ? JSON.parse(guestRaw) : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLastShadowingSession(user, session) {
  if (!session || !session.videoId) return;
  const payload = {
    videoId: session.videoId,
    segmentIndex: session.segmentIndex ?? 0,
    segmentId: session.segmentId || null,
    videoTitle: session.videoTitle || '',
    topic: session.topic || '',
    level: session.level || '',
    mode: session.mode || 'Shadowing',
    updatedAt: Date.now(),
  };

  try {
    const key = getStorageKey(SHADOWING_SESSION_PREFIX, user);
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage quota errors
  }
}

export function getShadowingStatusMap(user) {
  try {
    const guestRaw = localStorage.getItem(`${SHADOWING_PROGRESS_PREFIX}guest`);
    const guestMap = guestRaw ? JSON.parse(guestRaw) : {};

    if (!user?.id) {
      return guestMap && typeof guestMap === 'object' ? guestMap : {};
    }

    const userKey = getStorageKey(SHADOWING_PROGRESS_PREFIX, user);
    const userRaw = localStorage.getItem(userKey);
    const userMap = userRaw ? JSON.parse(userRaw) : {};
    return {
      ...(guestMap && typeof guestMap === 'object' ? guestMap : {}),
      ...(userMap && typeof userMap === 'object' ? userMap : {}),
    };
  } catch {
    return {};
  }
}

export function saveShadowingSegmentStatus(user, segmentKey, status) {
  if (!segmentKey) return getShadowingStatusMap(user);
  const current = getShadowingStatusMap(user);
  const next = { ...current };

  if (!status || status === 'unseen') {
    delete next[String(segmentKey)];
  } else {
    next[String(segmentKey)] = status;
  }

  try {
    const key = getStorageKey(SHADOWING_PROGRESS_PREFIX, user);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }

  return next;
}

