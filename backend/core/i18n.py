from __future__ import annotations

import copy
from typing import Any

from django.utils import translation

SUPPORTED_LANGUAGES = ("vi", "en")
DEFAULT_LANGUAGE = "vi"


def normalize_language_code(value: Any) -> str | None:
    """Normalize tags like 'en-US' or 'vi_VN' into a supported base language code."""
    if not isinstance(value, str):
        return None
    cleaned = value.strip().lower().replace("_", "-")
    if not cleaned:
        return None
    base = cleaned.split("-")[0]
    if base in SUPPORTED_LANGUAGES:
        return base
    return None


def resolve_request_language(request: Any = None) -> str:
    """Resolve effective UI/content language from ?lang=, Accept-Language, or Django locale."""
    if request is not None:
        query_params = getattr(request, "query_params", None) or getattr(
            request, "GET", None
        )
        if query_params is not None:
            normalized = normalize_language_code(query_params.get("lang"))
            if normalized:
                return normalized

        meta = getattr(request, "META", None) or {}
        accept_header = meta.get("HTTP_ACCEPT_LANGUAGE")
        if accept_header:
            for part in str(accept_header).split(","):
                code_part = part.split(";")[0].strip()
                normalized = normalize_language_code(code_part)
                if normalized:
                    return normalized

    active = normalize_language_code(translation.get_language())
    return active or DEFAULT_LANGUAGE


def is_raw_content_request(request: Any = None) -> bool:
    """Return True when the caller explicitly requests raw base (vi) fields without translation overlay."""
    if request is None:
        return False
    query_params = getattr(request, "query_params", None) or getattr(
        request, "GET", None
    )
    if query_params is None:
        return False
    raw_flag = str(query_params.get("raw", "")).strip().lower()
    lang_flag = str(query_params.get("lang", "")).strip().lower()
    return raw_flag in ("1", "true", "yes") or lang_flag == "raw"


def pick_translation_map(obj: Any, lang: str) -> dict[str, Any]:
    if not lang or lang == DEFAULT_LANGUAGE:
        return {}
    raw = getattr(obj, "translations", None)
    if not isinstance(raw, dict):
        return {}
    entry = raw.get(lang)
    return entry if isinstance(entry, dict) else {}


def apply_translated_fields(
    data: dict[str, Any],
    obj: Any,
    lang: str,
    field_names: tuple[str, ...],
    *,
    include_source: bool = False,
) -> dict[str, Any]:
    """
    Overlay non-empty translated strings onto `data` with fallback to original base values.
    Preserves untouched Vietnamese originals under `source_values` when `include_source=True`
    so editors working in English never accidentally overwrite Vietnamese source fields.
    """
    if lang == DEFAULT_LANGUAGE:
        return data

    trans_map = pick_translation_map(obj, lang)
    if include_source:
        data["source_values"] = {f: data.get(f, "") for f in field_names}

    for field in field_names:
        translated = trans_map.get(field)
        if isinstance(translated, str) and translated.strip():
            data[field] = translated
    return data


def merge_shadowing_translations(
    data: dict[str, Any],
    obj: Any,
    lang: str,
    *,
    include_source: bool = False,
) -> dict[str, Any]:
    """
    Apply translated title, description, segment meanings, and exercises onto Shadowing payloads
    without mutating Japanese text, ruby_text, word tokens, timestamps, or correct_index.
    """
    if lang == DEFAULT_LANGUAGE:
        return data

    trans_map = pick_translation_map(obj, lang)
    if include_source:
        source_payload: dict[str, Any] = {
            "title": data.get("title", ""),
            "description": data.get("description", ""),
        }
        if isinstance(data.get("segments"), list):
            source_payload["segments"] = {
                str(seg.get("id")): {"meaning": seg.get("meaning", "")}
                for seg in data["segments"]
                if isinstance(seg, dict) and seg.get("id") is not None
            }
        if isinstance(data.get("exercises"), list):
            source_payload["exercises"] = {
                str(ex.get("id")): {
                    "question": ex.get("question", ""),
                    "options": copy.deepcopy(ex.get("options", [])),
                    "explanation": ex.get("explanation", ""),
                }
                for ex in data["exercises"]
                if isinstance(ex, dict) and ex.get("id") is not None
            }
        data["source_values"] = source_payload

    for top_field in ("title", "description"):
        translated = trans_map.get(top_field)
        if isinstance(translated, str) and translated.strip():
            data[top_field] = translated

    seg_trans = trans_map.get("segments")
    if isinstance(data.get("segments"), list) and isinstance(seg_trans, dict):
        merged_segments = []
        for seg in data["segments"]:
            if not isinstance(seg, dict):
                merged_segments.append(seg)
                continue
            seg_copy = dict(seg)
            entry = seg_trans.get(str(seg.get("id")))
            if isinstance(entry, dict):
                meaning = entry.get("meaning")
                if isinstance(meaning, str) and meaning.strip():
                    seg_copy["meaning"] = meaning
            merged_segments.append(seg_copy)
        data["segments"] = merged_segments

    ex_trans = trans_map.get("exercises")
    if isinstance(data.get("exercises"), list) and isinstance(ex_trans, dict):
        merged_exercises = []
        for ex in data["exercises"]:
            if not isinstance(ex, dict):
                merged_exercises.append(ex)
                continue
            ex_copy = dict(ex)
            entry = ex_trans.get(str(ex.get("id")))
            if isinstance(entry, dict):
                question = entry.get("question")
                if isinstance(question, str) and question.strip():
                    ex_copy["question"] = question
                explanation = entry.get("explanation")
                if isinstance(explanation, str) and explanation.strip():
                    ex_copy["explanation"] = explanation
                opts = entry.get("options")
                orig_opts = ex.get("options") or []
                if isinstance(opts, list) and len(opts) == len(orig_opts):
                    ex_copy["options"] = [
                        str(opt) if isinstance(opt, str) and opt.strip() else str(orig)
                        for opt, orig in zip(opts, orig_opts)
                    ]
            merged_exercises.append(ex_copy)
        data["exercises"] = merged_exercises

    return data


def normalize_translations_input(value: Any) -> dict[str, Any]:
    """Validate and clean incoming `translations` JSON dictionaries cleanly."""
    if value is None or value == "":
        return {}
    if not isinstance(value, dict):
        raise ValueError("INVALID_TRANSLATIONS_TYPE")

    cleaned: dict[str, Any] = {}
    for lang_key, lang_val in value.items():
        norm_lang = normalize_language_code(str(lang_key))
        if not norm_lang or norm_lang == DEFAULT_LANGUAGE:
            continue
        if isinstance(lang_val, dict):
            cleaned[norm_lang] = copy.deepcopy(lang_val)
    return cleaned
