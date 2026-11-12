from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from cards.models import Card, Course
from core.i18n import DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, normalize_language_code
from shadowing.models import ShadowingVideo


class Command(BaseCommand):
    help = (
        "Export or import structured translations for Courses, Cards, and ShadowingVideos "
        "without altering original Japanese fields."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "mode",
            choices=["export", "import"],
            help="Export missing/existing translation templates or import translated JSON.",
        )
        parser.add_argument(
            "--lang",
            default="en",
            help="Target non-default language code (e.g. en).",
        )
        parser.add_argument(
            "--file",
            required=True,
            help="JSON file path to write (export) or read (import).",
        )
        parser.add_argument(
            "--missing-only",
            action="store_true",
            help="During export, include only records without a translation for --lang.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="During import, validate and report counts without modifying the database.",
        )

    def handle(self, *args, **options):
        lang = normalize_language_code(options["lang"])
        if not lang or lang not in SUPPORTED_LANGUAGES or lang == DEFAULT_LANGUAGE:
            raise CommandError(
                f"Target --lang must be a supported secondary language (got {options['lang']!r})."
            )

        file_path = Path(options["file"])
        if options["mode"] == "export":
            self._export_bundle(lang, file_path, missing_only=options["missing_only"])
        else:
            self._import_bundle(lang, file_path, dry_run=options["dry_run"])

    def _export_bundle(self, lang: str, file_path: Path, *, missing_only: bool) -> None:
        courses_out = []
        for c in Course.objects.order_by("id"):
            existing = (c.translations or {}).get(lang) or {}
            if missing_only and existing.get("title"):
                continue
            courses_out.append(
                {
                    "id": c.id,
                    "source": {"title": c.title, "description": c.description},
                    "translation": {
                        "title": existing.get("title", ""),
                        "description": existing.get("description", ""),
                    },
                }
            )

        cards_out = []
        for card in Card.objects.order_by("id"):
            existing = (card.translations or {}).get(lang) or {}
            if missing_only and existing.get("meaning"):
                continue
            cards_out.append(
                {
                    "id": card.id,
                    "front_text": card.front_text,
                    "source": {
                        "meaning": card.meaning,
                        "conjugation": card.conjugation,
                        "usage_notes": card.usage_notes,
                        "examples": card.examples,
                    },
                    "translation": {
                        "meaning": existing.get("meaning", ""),
                        "conjugation": existing.get("conjugation", ""),
                        "usage_notes": existing.get("usage_notes", ""),
                        "examples": existing.get("examples", ""),
                    },
                }
            )

        videos_out = []
        for video in ShadowingVideo.objects.order_by("id"):
            existing = (video.translations or {}).get(lang) or {}
            if missing_only and existing.get("title"):
                continue
            seg_trans = existing.get("segments") if isinstance(existing.get("segments"), dict) else {}
            ex_trans = existing.get("exercises") if isinstance(existing.get("exercises"), dict) else {}
            videos_out.append(
                {
                    "id": video.id,
                    "source": {
                        "title": video.title,
                        "description": video.description,
                        "segments": [
                            {"id": s.get("id"), "text": s.get("text", ""), "meaning": s.get("meaning", "")}
                            for s in (video.segments or [])
                            if isinstance(s, dict) and s.get("id") is not None
                        ],
                        "exercises": [
                            {
                                "id": e.get("id"),
                                "question": e.get("question", ""),
                                "options": e.get("options", []),
                                "explanation": e.get("explanation", ""),
                            }
                            for e in (video.exercises or [])
                            if isinstance(e, dict) and e.get("id") is not None
                        ],
                    },
                    "translation": {
                        "title": existing.get("title", ""),
                        "description": existing.get("description", ""),
                        "segments": {
                            str(s.get("id")): {
                                "meaning": (seg_trans.get(str(s.get("id"))) or {}).get("meaning", "")
                            }
                            for s in (video.segments or [])
                            if isinstance(s, dict) and s.get("id") is not None
                        },
                        "exercises": {
                            str(e.get("id")): {
                                "question": (ex_trans.get(str(e.get("id"))) or {}).get("question", ""),
                                "options": (ex_trans.get(str(e.get("id"))) or {}).get("options", []),
                                "explanation": (ex_trans.get(str(e.get("id"))) or {}).get("explanation", ""),
                            }
                            for e in (video.exercises or [])
                            if isinstance(e, dict) and e.get("id") is not None
                        },
                    },
                }
            )

        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(
            json.dumps(
                {
                    "language": lang,
                    "courses": courses_out,
                    "cards": cards_out,
                    "videos": videos_out,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Exported {len(courses_out)} courses, {len(cards_out)} cards, {len(videos_out)} videos -> {file_path}"
            )
        )

    def _clean_text_fields(self, raw: Any, keys: tuple[str, ...]) -> dict[str, str]:
        if not isinstance(raw, dict):
            return {}
        return {
            k: str(raw[k]).strip()
            for k in keys
            if isinstance(raw.get(k), str) and raw[k].strip()
        }

    def _import_bundle(self, lang: str, file_path: Path, *, dry_run: bool) -> None:
        if not file_path.is_file():
            raise CommandError(f"Translation file not found: {file_path}")
        try:
            payload = json.loads(file_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON in {file_path}: {exc}") from exc
        if not isinstance(payload, dict):
            raise CommandError("Root JSON payload must be an object.")

        counts = {"courses": 0, "cards": 0, "videos": 0}
        with transaction.atomic():
            for item in payload.get("courses") or []:
                cid = item.get("id") if isinstance(item, dict) else None
                trans = self._clean_text_fields(
                    item.get("translation") if isinstance(item, dict) else None,
                    ("title", "description"),
                )
                if not cid or not trans:
                    continue
                course = Course.objects.filter(pk=cid).first()
                if not course:
                    continue
                merged = dict(course.translations or {})
                merged[lang] = {**(merged.get(lang) or {}), **trans}
                course.translations = merged
                if not dry_run:
                    course.save(update_fields=["translations", "updated_at"])
                counts["courses"] += 1

            for item in payload.get("cards") or []:
                cid = item.get("id") if isinstance(item, dict) else None
                trans = self._clean_text_fields(
                    item.get("translation") if isinstance(item, dict) else None,
                    ("meaning", "conjugation", "usage_notes", "examples"),
                )
                if not cid or not trans:
                    continue
                card = Card.objects.filter(pk=cid).first()
                if not card:
                    continue
                merged = dict(card.translations or {})
                merged[lang] = {**(merged.get(lang) or {}), **trans}
                card.translations = merged
                if not dry_run:
                    card.save(update_fields=["translations", "updated_at"])
                counts["cards"] += 1

            for item in payload.get("videos") or []:
                vid = item.get("id") if isinstance(item, dict) else None
                raw_t = item.get("translation") if isinstance(item, dict) else None
                if not vid or not isinstance(raw_t, dict):
                    continue
                video = ShadowingVideo.objects.filter(pk=vid).first()
                if not video:
                    continue
                next_entry = dict((video.translations or {}).get(lang) or {})
                for k, v in self._clean_text_fields(raw_t, ("title", "description")).items():
                    next_entry[k] = v

                if isinstance(raw_t.get("segments"), dict):
                    seg_map = dict(next_entry.get("segments") or {})
                    for sid, sdata in raw_t["segments"].items():
                        cleaned = self._clean_text_fields(sdata, ("meaning",))
                        if cleaned:
                            seg_map[str(sid)] = {**(seg_map.get(str(sid)) or {}), **cleaned}
                    if seg_map:
                        next_entry["segments"] = seg_map

                if isinstance(raw_t.get("exercises"), dict):
                    ex_map = dict(next_entry.get("exercises") or {})
                    for eid, edata in raw_t["exercises"].items():
                        if not isinstance(edata, dict):
                            continue
                        cleaned_ex = self._clean_text_fields(edata, ("question", "explanation"))
                        opts = edata.get("options")
                        if isinstance(opts, list) and any(isinstance(o, str) and o.strip() for o in opts):
                            cleaned_ex["options"] = [str(o) for o in opts]
                        if cleaned_ex:
                            ex_map[str(eid)] = {**(ex_map.get(str(eid)) or {}), **cleaned_ex}
                    if ex_map:
                        next_entry["exercises"] = ex_map

                if not next_entry:
                    continue
                merged = dict(video.translations or {})
                merged[lang] = next_entry
                video.translations = merged
                if not dry_run:
                    video.save(update_fields=["translations", "updated_at"])
                counts["videos"] += 1

            if dry_run:
                transaction.set_rollback(True)

        prefix = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"{prefix}Updated {lang} translations: {counts['courses']} courses, "
                f"{counts['cards']} cards, {counts['videos']} videos."
            )
        )
