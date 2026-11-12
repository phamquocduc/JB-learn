from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.translation import gettext as _

ANKI_DEFAULT_CONFIG = {
    "learning_steps_minutes": (1, 10),
    "relearning_steps_minutes": (10,),
    "graduating_interval_days": 1,
    "easy_interval_days": 4,
    "starting_ease": 2.5,
    "minimum_ease": 1.3,
    "easy_bonus": 1.3,
    "hard_factor": 1.2,
    "lapse_new_interval_factor": 0.5,
    "minimum_lapse_interval_days": 1,
    "max_interval_days": 36500,
    "mature_interval_days": 21,
}

RATING_MAP = {
    0: 0,
    "0": 0,
    "unseen": 0,
    "reset": 0,
    1: 1,
    "1": 1,
    "again": 1,
    2: 2,
    "2": 2,
    "hard": 2,
    "learned": 2,
    3: 3,
    "3": 3,
    "good": 3,
    "remembered": 3,
    4: 4,
    "4": 4,
    "easy": 4,
    "mastered": 4,
}


def normalize_rating(rating: Any) -> int:
    """Convert numeric (0-4), Anki ('again'|'hard'|'good'|'easy'), or JB status ('learned'|'remembered'|'mastered'|'unseen') into 0..4."""
    if isinstance(rating, bool) or rating is None:
        raise ValueError(_("Giá trị đánh giá (rating) không hợp lệ."))
    if isinstance(rating, str):
        key = rating.strip().lower()
    else:
        key = rating
    if key not in RATING_MAP:
        raise ValueError(
            _(
                "Giá trị rating không hợp lệ. Chấp nhận: 1-4, 'again', 'hard', 'good', 'easy', 'learned', 'remembered', 'mastered', 'unseen'."
            )
        )
    return RATING_MAP[key]


def default_srs_state() -> dict[str, Any]:
    """Return initial Anki state for an unseen card."""
    return {
        "state": "new",
        "status": "unseen",
        "step_index": 0,
        "interval": 0,
        "learning_minutes": 0,
        "ease_factor": ANKI_DEFAULT_CONFIG["starting_ease"],
        "repetitions": 0,
        "lapses": 0,
        "due_at": None,
        "last_reviewed_at": None,
        "last_rating": None,
    }


def _ensure_datetime(val: Any) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        if timezone.is_naive(val):
            return timezone.make_aware(val)
        return val
    if isinstance(val, (int, float)):
        # Support epoch milliseconds or seconds
        ts = val / 1000.0 if val > 1e11 else float(val)
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return None
        parsed = parse_datetime(s)
        if parsed is not None:
            if timezone.is_naive(parsed):
                return timezone.make_aware(parsed)
            return parsed
    return None


def normalize_srs_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Sanitize a raw SRS dictionary or model state into canonical fields."""
    base = default_srs_state()
    if not raw or not isinstance(raw, dict):
        return base

    state = str(raw.get("state") or "new").strip().lower()
    if state not in ("new", "learning", "review", "relearning"):
        state = "new"

    status = str(raw.get("status") or "unseen").strip().lower()
    if status not in ("unseen", "learned", "remembered", "mastered"):
        if state == "new":
            status = "unseen"
        elif state in ("learning", "relearning"):
            status = "learned"
        else:
            status = "remembered"

    try:
        step_index = max(0, int(raw.get("step_index") or 0))
    except (ValueError, TypeError):
        step_index = 0

    try:
        interval = max(0, int(raw.get("interval") or 0))
    except (ValueError, TypeError):
        interval = 0

    try:
        learning_minutes = max(0, int(raw.get("learning_minutes") or 0))
    except (ValueError, TypeError):
        learning_minutes = 0
    if learning_minutes <= 0:
        if state == "relearning":
            relearn_steps = ANKI_DEFAULT_CONFIG["relearning_steps_minutes"]
            learning_minutes = relearn_steps[min(step_index, len(relearn_steps) - 1)]
        elif state == "learning":
            learn_steps = ANKI_DEFAULT_CONFIG["learning_steps_minutes"]
            learning_minutes = learn_steps[min(step_index, len(learn_steps) - 1)]

    try:
        ease_factor = float(
            raw.get("ease_factor") or ANKI_DEFAULT_CONFIG["starting_ease"]
        )
        ease_factor = max(ANKI_DEFAULT_CONFIG["minimum_ease"], ease_factor)
    except (ValueError, TypeError):
        ease_factor = ANKI_DEFAULT_CONFIG["starting_ease"]

    try:
        repetitions = max(0, int(raw.get("repetitions") or 0))
    except (ValueError, TypeError):
        repetitions = 0

    try:
        lapses = max(0, int(raw.get("lapses") or 0))
    except (ValueError, TypeError):
        lapses = 0

    due_at = _ensure_datetime(raw.get("due_at"))
    last_reviewed_at = _ensure_datetime(raw.get("last_reviewed_at"))
    last_rating = raw.get("last_rating")
    if last_rating not in (1, 2, 3, 4):
        last_rating = None

    return {
        "state": state,
        "status": status,
        "step_index": step_index,
        "interval": interval,
        "learning_minutes": learning_minutes,
        "ease_factor": round(ease_factor, 4),
        "repetitions": repetitions,
        "lapses": lapses,
        "due_at": due_at,
        "last_reviewed_at": last_reviewed_at,
        "last_rating": last_rating,
    }


def format_interval_vi(state: str, interval_days: int, learning_minutes: int) -> str:
    """Format an Anki interval into the active language (Vietnamese by default)."""
    if state in ("learning", "relearning") or (interval_days <= 0 and learning_minutes > 0):
        mins = max(1, int(learning_minutes or 1))
        if mins < 60:
            return _("%(count)s phút") % {"count": mins}
        hours = round(mins / 60, 1)
        return _("%(count)s giờ") % {"count": f"{hours:g}"}

    days = max(1, int(interval_days or 1))
    if days < 30:
        return _("%(count)s ngày") % {"count": days}
    if days < 365:
        months = round(days / 30.0, 1)
        return _("%(count)s tháng") % {"count": f"{months:g}"}
    years = round(days / 365.0, 1)
    return _("%(count)s năm") % {"count": f"{years:g}"}


def schedule_card_review(
    current_raw: dict[str, Any] | None,
    rating: Any,
    now: datetime | None = None,
) -> dict[str, Any]:
    """
    Execute one step of Anki's Spaced Repetition Algorithm (SM-2 + Learning/Relearning steps).

    Returns updated SRS state dictionary with `due_at` as timezone-aware datetime.
    """
    rating_num = normalize_rating(rating)
    if rating_num == 0:
        return default_srs_state()

    now_dt = _ensure_datetime(now) or timezone.now()
    cur = normalize_srs_state(current_raw)
    cfg = ANKI_DEFAULT_CONFIG

    state = cur["state"]
    step_index = cur["step_index"]
    interval = cur["interval"]
    ease_factor = cur["ease_factor"]
    repetitions = cur["repetitions"] + 1
    lapses = cur["lapses"]
    learning_steps = cfg["learning_steps_minutes"]
    relearning_steps = cfg["relearning_steps_minutes"]

    if state in ("new", "learning"):
        if rating_num == 1:  # Again (Học lại)
            next_state = "learning"
            next_step = 0
            next_learning_mins = learning_steps[0]
            next_interval = 0
            due_at = now_dt + timedelta(minutes=next_learning_mins)
            next_status = "learned"
        elif rating_num == 2:  # Hard (Khó / Đã học)
            next_state = "learning"
            next_step = step_index
            if step_index == 0 and len(learning_steps) >= 2:
                next_learning_mins = int(round((learning_steps[0] + learning_steps[1]) / 2.0))
            elif step_index == 0 and len(learning_steps) == 1:
                next_learning_mins = max(1, int(round(learning_steps[0] * 1.5)))
            else:
                idx = min(step_index, len(learning_steps) - 1)
                next_learning_mins = learning_steps[idx]
            next_interval = 0
            due_at = now_dt + timedelta(minutes=next_learning_mins)
            next_status = "learned"
        elif rating_num == 3:  # Good (Tốt / Đã nhớ)
            next_step_candidate = step_index + 1
            if next_step_candidate < len(learning_steps):
                next_state = "learning"
                next_step = next_step_candidate
                next_learning_mins = learning_steps[next_step]
                next_interval = 0
                due_at = now_dt + timedelta(minutes=next_learning_mins)
                next_status = "remembered"
            else:
                # Graduate to review
                next_state = "review"
                next_step = 0
                next_learning_mins = 0
                next_interval = cfg["graduating_interval_days"]
                due_at = now_dt + timedelta(days=next_interval)
                next_status = "remembered"
        else:  # 4 = Easy (Dễ / Thành thạo)
            next_state = "review"
            next_step = 0
            next_learning_mins = 0
            next_interval = cfg["easy_interval_days"]
            due_at = now_dt + timedelta(days=next_interval)
            next_status = "mastered"

    elif state == "relearning":
        if rating_num == 1:  # Again
            next_state = "relearning"
            next_step = 0
            next_learning_mins = relearning_steps[0]
            next_interval = max(cfg["minimum_lapse_interval_days"], interval)
            due_at = now_dt + timedelta(minutes=next_learning_mins)
            next_status = "learned"
        elif rating_num == 2:  # Hard
            next_state = "relearning"
            next_step = step_index
            if step_index == 0 and len(relearning_steps) >= 2:
                next_learning_mins = int(round((relearning_steps[0] + relearning_steps[1]) / 2.0))
            elif step_index == 0 and len(relearning_steps) == 1:
                next_learning_mins = max(1, int(round(relearning_steps[0] * 1.5)))
            else:
                idx = min(step_index, len(relearning_steps) - 1)
                next_learning_mins = relearning_steps[idx]
            next_interval = max(cfg["minimum_lapse_interval_days"], interval)
            due_at = now_dt + timedelta(minutes=next_learning_mins)
            next_status = "learned"
        elif rating_num == 3:  # Good -> graduate back to review
            next_step_candidate = step_index + 1
            if next_step_candidate < len(relearning_steps):
                next_state = "relearning"
                next_step = next_step_candidate
                next_learning_mins = relearning_steps[next_step]
                next_interval = max(cfg["minimum_lapse_interval_days"], interval)
                due_at = now_dt + timedelta(minutes=next_learning_mins)
                next_status = "remembered"
            else:
                next_state = "review"
                next_step = 0
                next_learning_mins = 0
                next_interval = max(cfg["minimum_lapse_interval_days"], interval)
                due_at = now_dt + timedelta(days=next_interval)
                next_status = (
                    "mastered"
                    if next_interval >= cfg["mature_interval_days"]
                    else "remembered"
                )
        else:  # 4 = Easy
            next_state = "review"
            next_step = 0
            next_learning_mins = 0
            next_interval = min(
                cfg["max_interval_days"],
                max(cfg["easy_interval_days"], interval + 1),
            )
            due_at = now_dt + timedelta(days=next_interval)
            next_status = "mastered"

    else:  # state == "review"
        prev_ivl = max(1, interval)
        days_late = 0.0
        if cur["due_at"] is not None and now_dt > cur["due_at"]:
            days_late = max(0.0, (now_dt - cur["due_at"]).total_seconds() / 86400.0)

        if rating_num == 1:  # Again (Lapse)
            next_state = "relearning"
            next_step = 0
            lapses += 1
            ease_factor = max(cfg["minimum_ease"], round(ease_factor - 0.20, 4))
            next_interval = max(
                cfg["minimum_lapse_interval_days"],
                int(round(prev_ivl * cfg["lapse_new_interval_factor"])),
            )
            next_learning_mins = relearning_steps[0]
            due_at = now_dt + timedelta(minutes=next_learning_mins)
            next_status = "learned"
        elif rating_num == 2:  # Hard
            next_state = "review"
            next_step = 0
            next_learning_mins = 0
            ease_factor = max(cfg["minimum_ease"], round(ease_factor - 0.15, 4))
            hard_ivl = max(prev_ivl + 1, int(round(prev_ivl * cfg["hard_factor"])))
            next_interval = min(cfg["max_interval_days"], hard_ivl)
            due_at = now_dt + timedelta(days=next_interval)
            next_status = "learned"
        elif rating_num == 3:  # Good
            next_state = "review"
            next_step = 0
            next_learning_mins = 0
            hard_ivl = max(prev_ivl + 1, int(round(prev_ivl * cfg["hard_factor"])))
            good_ivl = max(
                hard_ivl,
                int(round((prev_ivl + days_late / 2.0) * ease_factor)),
            )
            next_interval = min(cfg["max_interval_days"], good_ivl)
            due_at = now_dt + timedelta(days=next_interval)
            next_status = (
                "mastered"
                if next_interval >= cfg["mature_interval_days"]
                else "remembered"
            )
        else:  # 4 = Easy
            next_state = "review"
            next_step = 0
            next_learning_mins = 0
            old_ease = ease_factor
            ease_factor = max(cfg["minimum_ease"], round(ease_factor + 0.15, 4))
            hard_ivl = max(prev_ivl + 1, int(round(prev_ivl * cfg["hard_factor"])))
            good_ivl = max(
                hard_ivl,
                int(round((prev_ivl + days_late / 2.0) * old_ease)),
            )
            easy_ivl = max(
                good_ivl + 1,
                int(round((prev_ivl + days_late) * ease_factor * cfg["easy_bonus"])),
            )
            next_interval = min(cfg["max_interval_days"], easy_ivl)
            due_at = now_dt + timedelta(days=next_interval)
            next_status = "mastered"

    return {
        "state": next_state,
        "status": next_status,
        "step_index": next_step,
        "interval": next_interval,
        "learning_minutes": next_learning_mins,
        "ease_factor": round(ease_factor, 4),
        "repetitions": repetitions,
        "lapses": lapses,
        "due_at": due_at,
        "last_reviewed_at": now_dt,
        "last_rating": rating_num,
        "interval_display": format_interval_vi(
            next_state, next_interval, next_learning_mins
        ),
    }


def get_interval_previews(
    current_raw: dict[str, Any] | None,
    now: datetime | None = None,
) -> dict[str, str]:
    """Compute human-readable next interval labels for all 4 Anki ratings."""
    now_dt = _ensure_datetime(now) or timezone.now()
    again_res = schedule_card_review(current_raw, 1, now=now_dt)
    hard_res = schedule_card_review(current_raw, 2, now=now_dt)
    good_res = schedule_card_review(current_raw, 3, now=now_dt)
    easy_res = schedule_card_review(current_raw, 4, now=now_dt)
    return {
        "again": again_res["interval_display"],
        "hard": hard_res["interval_display"],
        "good": good_res["interval_display"],
        "easy": easy_res["interval_display"],
        "learned": hard_res["interval_display"],
        "remembered": good_res["interval_display"],
        "mastered": easy_res["interval_display"],
    }


def is_card_due(srs_raw: dict[str, Any] | None, now: datetime | None = None) -> bool:
    """Return True if a studied card is currently due for review."""
    if not srs_raw:
        return False
    cur = normalize_srs_state(srs_raw)
    if cur["state"] == "new":
        return False
    now_dt = _ensure_datetime(now) or timezone.now()
    if cur["due_at"] is None:
        return True
    return cur["due_at"] <= now_dt


def serialize_srs_state(
    srs_raw: dict[str, Any] | None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Format an SRS state dictionary for JSON API responses including interval previews."""
    now_dt = _ensure_datetime(now) or timezone.now()
    cur = normalize_srs_state(srs_raw)
    due = is_card_due(cur, now=now_dt)
    interval_display = (
        _("Chưa học")
        if cur["state"] == "new"
        else format_interval_vi(cur["state"], cur["interval"], cur["learning_minutes"])
    )
    return {
        "state": cur["state"],
        "status": cur["status"],
        "step_index": cur["step_index"],
        "interval": cur["interval"],
        "learning_minutes": cur["learning_minutes"],
        "ease_factor": cur["ease_factor"],
        "repetitions": cur["repetitions"],
        "lapses": cur["lapses"],
        "due_at": cur["due_at"].isoformat() if cur["due_at"] else None,
        "last_reviewed_at": (
            cur["last_reviewed_at"].isoformat() if cur["last_reviewed_at"] else None
        ),
        "last_rating": cur["last_rating"],
        "is_due": due,
        "interval_display": interval_display,
        "next_intervals": get_interval_previews(cur, now=now_dt),
    }


def compute_anki_queue_summary(
    card_ids: list[int],
    srs_map: dict[int, dict[str, Any]],
    now: datetime | None = None,
) -> dict[str, int]:
    """Calculate Anki's 3-queue counters (New, Learning, Review Due) across a set of cards."""
    now_dt = _ensure_datetime(now) or timezone.now()
    new_count = 0
    learning_count = 0
    review_due_count = 0
    graduated_count = 0

    for cid in card_ids:
        raw = srs_map.get(cid) or srs_map.get(str(cid))
        if not raw:
            new_count += 1
            continue
        cur = normalize_srs_state(raw)
        st = cur["state"]
        if st == "new":
            new_count += 1
        elif st in ("learning", "relearning"):
            learning_count += 1
            if is_card_due(cur, now=now_dt):
                review_due_count += 1
        elif st == "review":
            graduated_count += 1
            if is_card_due(cur, now=now_dt):
                review_due_count += 1

    return {
        "new_count": new_count,
        "learning_count": learning_count,
        "due_count": review_due_count,
        "review_count": graduated_count,
    }
