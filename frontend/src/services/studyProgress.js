import {
  normalizeSrsState,
  scheduleCardReview,
  serializeSrsState,
} from './ankiScheduler.js';

const PROGRESS_PREFIX = 'jb_study_status_v1_';
const SRS_PREFIX = 'jb_study_srs_v1_';
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

function removeGuestCardKey(keyStr) {
  try {
    for (const prefix of [SRS_PREFIX, PROGRESS_PREFIX]) {
      const gKey = `${prefix}guest`;
      const raw = localStorage.getItem(gKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && keyStr in parsed) {
        delete parsed[keyStr];
        localStorage.setItem(gKey, JSON.stringify(parsed));
      }
    }
  } catch {
    // ignore storage quota errors
  }
}

export function getCardSrsMap(user) {
  try {
    const guestRaw = localStorage.getItem(`${SRS_PREFIX}guest`);
    const guestMap = guestRaw ? JSON.parse(guestRaw) : {};
    let merged =
      guestMap && typeof guestMap === 'object' ? { ...guestMap } : {};

    if (user?.id) {
      const userKey = getStorageKey(SRS_PREFIX, user);
      const userRaw = localStorage.getItem(userKey);
      const userMap = userRaw ? JSON.parse(userRaw) : {};
      if (userMap && typeof userMap === 'object') {
        merged = { ...merged, ...userMap };
      }
    }

    // Backfill from statusMap if any legacy status exists without SRS entry
    const statusMap = getCardStatusMap(user);
    const now = new Date();
    const result = {};
    let backfilled = false;

    for (const [cid, rawSrs] of Object.entries(merged)) {
      if (rawSrs && typeof rawSrs === 'object') {
        result[String(cid)] = serializeSrsState(rawSrs, now);
      }
    }

    for (const [cid, status] of Object.entries(statusMap)) {
      const key = String(cid);
      if (
        !result[key] &&
        ['learned', 'remembered', 'mastered'].includes(status)
      ) {
        const synthesized = scheduleCardReview(null, status, now);
        synthesized.last_reviewed_at = null;
        result[key] = serializeSrsState(synthesized, now);
        backfilled = true;
      }
    }

    if (backfilled) {
      try {
        localStorage.setItem(
          getStorageKey(SRS_PREFIX, user),
          JSON.stringify(result)
        );
      } catch {
        // ignore storage quota errors
      }
    }

    return result;
  } catch {
    return {};
  }
}

export function saveCardSrsState(user, cardId, srsState) {
  if (!cardId) {
    return {
      srsMap: getCardSrsMap(user),
      statusMap: getCardStatusMap(user),
    };
  }
  const keyStr = String(cardId);
  const currentSrsMap = getCardSrsMap(user);
  const currentStatusMap = getCardStatusMap(user);
  const nextSrsMap = { ...currentSrsMap };
  const nextStatusMap = { ...currentStatusMap };

  if (
    !srsState ||
    srsState.state === 'new' ||
    srsState.status === 'unseen'
  ) {
    delete nextSrsMap[keyStr];
    delete nextStatusMap[keyStr];
  } else {
    const serialized = serializeSrsState(srsState);
    nextSrsMap[keyStr] = serialized;
    nextStatusMap[keyStr] = serialized.status;
  }

  if (user?.id) {
    removeGuestCardKey(keyStr);
  }

  try {
    localStorage.setItem(
      getStorageKey(SRS_PREFIX, user),
      JSON.stringify(nextSrsMap)
    );
    localStorage.setItem(
      getStorageKey(PROGRESS_PREFIX, user),
      JSON.stringify(nextStatusMap)
    );
  } catch {
    // ignore storage quota errors
  }

  return { srsMap: nextSrsMap, statusMap: nextStatusMap };
}

export function persistSrsMap(user, srsMap) {
  if (!srsMap || typeof srsMap !== 'object') return;
  try {
    localStorage.setItem(
      getStorageKey(SRS_PREFIX, user),
      JSON.stringify(srsMap)
    );
  } catch {
    // ignore storage quota errors
  }
}

export function reviewCardWithAnki(user, cardId, rating, now = new Date()) {
  if (!cardId) {
    return {
      srsMap: getCardSrsMap(user),
      statusMap: getCardStatusMap(user),
      cardSrs: null,
    };
  }
  const keyStr = String(cardId);
  const currentSrsMap = getCardSrsMap(user);
  const prevCardSrs = currentSrsMap[keyStr] || null;
  const nextCardSrs = serializeSrsState(
    scheduleCardReview(prevCardSrs, rating, now),
    now
  );
  const { srsMap, statusMap } = saveCardSrsState(user, cardId, nextCardSrs);
  return {
    srsMap,
    statusMap,
    cardSrs: nextCardSrs,
  };
}

export function mergeServerSrsMap(user, serverSrsMap = {}) {
  const localSrsMap = getCardSrsMap(user);
  const localStatusMap = getCardStatusMap(user);
  if (!serverSrsMap || typeof serverSrsMap !== 'object') {
    return { srsMap: localSrsMap, statusMap: localStatusMap };
  }

  const nextSrsMap = { ...localSrsMap };
  const nextStatusMap = { ...localStatusMap };
  const now = new Date();

  for (const [cid, serverRaw] of Object.entries(serverSrsMap)) {
    if (!serverRaw || typeof serverRaw !== 'object') continue;
    const key = String(cid);
    const localItem = nextSrsMap[key];
    const serverNorm = normalizeSrsState(serverRaw);

    if (localItem && localItem.last_reviewed_at && serverNorm.last_reviewed_at) {
      const localTs = new Date(localItem.last_reviewed_at).getTime();
      const serverTs = new Date(serverNorm.last_reviewed_at).getTime();
      if (Number.isFinite(localTs) && Number.isFinite(serverTs) && localTs > serverTs) {
        continue;
      }
    }

    const serialized = serializeSrsState(serverNorm, now);
    if (serialized.state === 'new' || serialized.status === 'unseen') {
      delete nextSrsMap[key];
      delete nextStatusMap[key];
      if (user?.id) {
        removeGuestCardKey(key);
      }
    } else {
      nextSrsMap[key] = serialized;
      nextStatusMap[key] = serialized.status;
    }
  }

  try {
    localStorage.setItem(
      getStorageKey(SRS_PREFIX, user),
      JSON.stringify(nextSrsMap)
    );
    localStorage.setItem(
      getStorageKey(PROGRESS_PREFIX, user),
      JSON.stringify(nextStatusMap)
    );
  } catch {
    // ignore storage quota errors
  }

  return { srsMap: nextSrsMap, statusMap: nextStatusMap };
}

export function saveCardStatus(user, cardId, status) {
  if (!cardId) return getCardStatusMap(user);
  const ratingOrStatus = !status ? 'unseen' : status;
  const { statusMap } = reviewCardWithAnki(user, cardId, ratingOrStatus);
  return statusMap;
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

