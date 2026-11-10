import csv
from collections import defaultdict, deque
from pathlib import Path

from django.conf import settings
from django.db import transaction

from .models import Card, Course

DEFAULT_COURSE_META = {
    Card.CardType.GRAMMAR: (
        "Shinkanzen Master N3 - Ngữ pháp",
        "54 cấu trúc ngữ pháp JLPT N3 trọng tâm từ Shinkanzen Master.",
    ),
    Card.CardType.KANJI: (
        "Tổng hợp Hán tự & Từ vựng Kanji N3",
        "227 từ vựng Hán tự (Kanji) JLPT N3 trọng tâm kèm cách đọc Hiragana, âm Hán Việt và ý nghĩa.",
    ),
    Card.CardType.VOCABULARY: (
        "Từ vựng N3 JLPT",
        "350 từ vựng JLPT N3 trọng tâm qua các đề thi thực tế kèm cách đọc, từ đồng nghĩa và ý nghĩa.",
    ),
}


def export_kanji_n3_to_csv() -> int:
    """Export Kanji N3 dataset into CSV files in PDF_OUTPUT_DIR."""
    from module_pdf_to_csv_fit_anki.src.anki_exporter import AnkiExporter
    from module_pdf_to_csv_fit_anki.src.kanji_n3_data import get_kanji_n3_records

    kanji_records = get_kanji_n3_records(deduplicate=False)
    exporter = AnkiExporter(output_dir=str(settings.PDF_OUTPUT_DIR))
    exporter.export_kanji_all(kanji_records)
    return len(kanji_records)


def export_vocab_n3_to_csv() -> int:
    """Export Vocabulary N3 dataset into CSV files in PDF_OUTPUT_DIR."""
    from module_pdf_to_csv_fit_anki.src.anki_exporter import AnkiExporter
    from module_pdf_to_csv_fit_anki.src.vocab_n3_data import get_vocab_n3_records

    vocab_records = get_vocab_n3_records(deduplicate=False)
    exporter = AnkiExporter(output_dir=str(settings.PDF_OUTPUT_DIR))
    exporter.export_vocab_all(vocab_records)
    return len(vocab_records)


def convert_pdfs_to_csv() -> int:
    """Parse source Shinkanzen N3 PDF files and Kanji/Vocab N3 data and export CSV outputs."""
    from module_pdf_to_csv_fit_anki.src.anki_exporter import AnkiExporter
    from module_pdf_to_csv_fit_anki.src.pdf_parser import ShinkanzenN3PdfParser

    f1 = settings.PDF_UPLOAD_DIR / "tổng hợp ngữ pháp Shin N3 (bản 1).pdf"
    f2 = settings.PDF_UPLOAD_DIR / "tổng hợp ngữ pháp Shin N3 (bản 2) .pdf"

    parser = ShinkanzenN3PdfParser()
    records = []
    if f1.exists():
        records.extend(parser.parse_pdf(str(f1), default_start_lesson="Bài 1"))
    if f2.exists():
        records.extend(parser.parse_pdf(str(f2), default_start_lesson="Bài 6"))

    if not records:
        raise FileNotFoundError(
            f"Không tìm thấy dữ liệu PDF hợp lệ trong {settings.PDF_UPLOAD_DIR}"
        )

    exporter = AnkiExporter(output_dir=str(settings.PDF_OUTPUT_DIR))
    exporter.export_all(records)
    export_kanji_n3_to_csv()
    export_vocab_n3_to_csv()
    return len(records)


def sync_cards_from_csv(
    csv_path: Path,
    card_type: str = Card.CardType.GRAMMAR,
    level: str = Card.JLPTLevel.N3,
) -> int:
    """Read study cards from CSV, attach to default Course, and atomically upsert system records while preserving Card IDs and CardReview rows."""
    if not csv_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file CSV tại: {csv_path}")

    course_title, course_desc = DEFAULT_COURSE_META.get(
        card_type, DEFAULT_COURSE_META[Card.CardType.GRAMMAR]
    )
    default_course, _ = Course.objects.get_or_create(
        title=course_title,
        defaults={
            "description": course_desc,
            "level": level,
            "card_type": card_type,
            "is_public": True,
            "created_by": None,
        },
    )

    parsed_rows: list[dict] = []
    with csv_path.open(mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            raw_order = (row.get("STT") or "").strip()
            display_order = int(raw_order) if raw_order.isdigit() else idx
            front_text = (
                row.get("Cấu Trúc Ngữ Pháp")
                or row.get("Hán Tự")
                or row.get("Từ Vựng")
                or ""
            ).strip()
            if not front_text:
                continue

            reading = (
                (row.get("Từ Vựng") or "").strip()
                if row.get("Hán Tự")
                else (row.get("Cách Đọc") or "").strip()
            )
            if reading == front_text:
                reading = ""
            han_viet = (row.get("Hán Việt") or "").strip()
            conjugation = (
                row.get("Cách Chia / Nối Thể")
                or row.get("Cách Đọc / Âm Hán Việt")
                or ""
            ).strip()
            if not conjugation and (reading or han_viet):
                conjugation = (
                    f"{reading} • {han_viet}"
                    if reading and han_viet
                    else (reading or han_viet)
                )

            usage_notes = (
                row.get("Phạm Vi Sử Dụng & Chú Ý")
                or row.get("Ghi Chú")
                or ""
            ).strip()

            extra_data = {}
            if reading:
                extra_data["reading"] = reading
            if han_viet:
                extra_data["han_viet"] = han_viet

            parsed_rows.append(
                {
                    "course": default_course,
                    "is_public": True,
                    "card_type": card_type,
                    "level": level,
                    "lesson": (row.get("Bài") or "").strip(),
                    "display_order": display_order,
                    "front_text": front_text,
                    "meaning": (row.get("Ý Nghĩa") or "").strip(),
                    "conjugation": conjugation,
                    "usage_notes": usage_notes,
                    "examples": (row.get("Ví Dụ Minh Họa") or "").strip(),
                    "extra_data": extra_data,
                    "source": (row.get("Nguồn") or "").strip(),
                }
            )

    update_fields = [
        "course",
        "is_public",
        "lesson",
        "display_order",
        "front_text",
        "meaning",
        "conjugation",
        "usage_notes",
        "examples",
        "extra_data",
        "source",
    ]

    with transaction.atomic():
        existing_cards = list(
            Card.objects.select_for_update()
            .filter(card_type=card_type, level=level, created_by__isnull=True)
            .order_by("display_order", "id")
        )
        by_lesson_front: dict[tuple[str, str], deque[Card]] = defaultdict(deque)
        for card in existing_cards:
            by_lesson_front[(card.lesson, card.front_text)].append(card)

        matched_existing_ids: set[int] = set()
        unmatched_row_indices: list[int] = []
        to_update: list[Card] = []

        # Pass 1: exact (lesson, front_text) match preserves Card PK & CardReview FK
        for row_idx, attrs in enumerate(parsed_rows):
            bucket = by_lesson_front.get((attrs["lesson"], attrs["front_text"]))
            if bucket:
                card_obj = bucket.popleft()
                matched_existing_ids.add(card_obj.id)
                for field in update_fields:
                    setattr(card_obj, field, attrs[field])
                to_update.append(card_obj)
            else:
                unmatched_row_indices.append(row_idx)

        # Pass 2: fallback match by front_text if lesson label changed in CSV
        if unmatched_row_indices:
            by_front: dict[str, deque[Card]] = defaultdict(deque)
            for card in existing_cards:
                if card.id not in matched_existing_ids:
                    by_front[card.front_text].append(card)

            still_unmatched: list[int] = []
            for row_idx in unmatched_row_indices:
                attrs = parsed_rows[row_idx]
                bucket = by_front.get(attrs["front_text"])
                if bucket:
                    card_obj = bucket.popleft()
                    matched_existing_ids.add(card_obj.id)
                    for field in update_fields:
                        setattr(card_obj, field, attrs[field])
                    to_update.append(card_obj)
                else:
                    still_unmatched.append(row_idx)
            unmatched_row_indices = still_unmatched

        stale_ids = [
            card.id for card in existing_cards if card.id not in matched_existing_ids
        ]
        if stale_ids:
            Card.objects.filter(id__in=stale_ids).delete()
        if to_update:
            Card.objects.bulk_update(to_update, fields=update_fields, batch_size=500)
        if unmatched_row_indices:
            Card.objects.bulk_create(
                [
                    Card(created_by=None, **parsed_rows[row_idx])
                    for row_idx in unmatched_row_indices
                ],
                batch_size=500,
            )

    return len(parsed_rows)
