import csv
from collections import defaultdict, deque
from pathlib import Path
from typing import Optional

from django.conf import settings
from django.db import transaction

from .models import Card, Course

DEFAULT_COURSE_META = {
    Card.CardType.GRAMMAR: (
        "Shinkanzen Master N3 - Ngữ pháp",
        "81 cấu trúc ngữ pháp JLPT N3 trọng tâm từ Shinkanzen Master kèm chuyên đề Kính ngữ chi tiết.",
    ),
    Card.CardType.KANJI: (
        "Tổng hợp Hán tự & Từ vựng Kanji N3",
        "227 từ vựng Hán tự (Kanji) JLPT N3 trọng tâm kèm cách đọc Hiragana, âm Hán Việt và ý nghĩa.",
    ),
    Card.CardType.VOCABULARY: (
        "Từ vựng N3 JLPT",
        "350 từ vựng JLPT N3 trọng tâm qua các đề thi thực tế kèm cách đọc, từ đồng nghĩa và ý nghĩa.",
    ),
    "onomatopoeia": (
        "Từ tượng thanh & Từ tượng hình N3 (オノマトペ)",
        "40 từ tượng thanh và từ tượng hình (Onomatopoeia) trọng tâm xuất hiện trong đề thi JLPT N3 kèm giải thích ngữ cảnh và câu ví dụ minh họa.",
    ),
    "synonyms": (
        "Từ đồng nghĩa & Diễn đạt tương đương N3 (Mondai 4)",
        "35 cặp từ đồng nghĩa và cách diễn đạt tương đương (言い換え類義語) đã từng xuất hiện trong phần thi Mondai 4 đề thi JLPT N3.",
    ),
    "word_usage": (
        "Cách sử dụng từ chuẩn đề thi N3 (Mondai 5)",
        "35 từ vựng then chốt trong phần câu hỏi 'Cách sử dụng từ đúng' (Mondai 5) đề thi JLPT N3, tập trung vào ngữ cảnh kết hợp chuẩn xác (Collocation) và câu ví dụ.",
    ),
}


def export_expanded_grammar_to_csv() -> int:
    """Exports 51 standard Shinkanzen N3 grammar points plus 30 detailed Keigo cards into table CSV."""
    from module_pdf_to_csv_fit_anki.src.n3_keigo_data import KEIGO_N3_DETAILED_RECORDS

    csv_path = settings.GRAMMAR_CSV_PATH
    orig_rows = []
    if csv_path.exists():
        with csv_path.open(mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for r in reader:
                # Keep original non-keigo rows (first 51 points up to Bài 12 ~(よ)うとする and ~つもりだ)
                lesson = (r.get("Bài") or "").strip()
                if "Kính ngữ" in lesson:
                    continue
                orig_rows.append(r)
                if len(orig_rows) >= 51:
                    break

    fields = [
        "STT",
        "Bài",
        "Cấu Trúc Ngữ Pháp",
        "Ý Nghĩa",
        "Cách Chia / Nối Thể",
        "Phạm Vi Sử Dụng & Chú Ý",
        "Ví Dụ Minh Họa",
        "Nguồn",
    ]

    all_rows = []
    for idx, r in enumerate(orig_rows, start=1):
        all_rows.append({
            "STT": idx,
            "Bài": r.get("Bài", ""),
            "Cấu Trúc Ngữ Pháp": r.get("Cấu Trúc Ngữ Pháp", ""),
            "Ý Nghĩa": r.get("Ý Nghĩa", ""),
            "Cách Chia / Nối Thể": r.get("Cách Chia / Nối Thể", ""),
            "Phạm Vi Sử Dụng & Chú Ý": r.get("Phạm Vi Sử Dụng & Chú Ý", ""),
            "Ví Dụ Minh Họa": r.get("Ví Dụ Minh Họa", ""),
            "Nguồn": r.get("Nguồn", ""),
        })

    start_stt = len(all_rows) + 1
    for offset, k_rec in enumerate(KEIGO_N3_DETAILED_RECORDS):
        all_rows.append({
            "STT": start_stt + offset,
            "Bài": k_rec[0],
            "Cấu Trúc Ngữ Pháp": k_rec[1],
            "Ý Nghĩa": k_rec[2],
            "Cách Chia / Nối Thể": k_rec[3],
            "Phạm Vi Sử Dụng & Chú Ý": k_rec[4],
            "Ví Dụ Minh Họa": k_rec[5],
            "Nguồn": k_rec[6],
        })

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open(mode="w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(all_rows)

    return len(all_rows)


def export_onomatopoeia_n3_to_csv() -> int:
    """Exports Onomatopoeia N3 dataset into table CSV in PDF_OUTPUT_DIR."""
    from module_pdf_to_csv_fit_anki.src.n3_onomatopoeia_data import ONOMATOPOEIA_N3_RECORDS

    csv_path = settings.ONOMATOPOEIA_CSV_PATH
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "STT",
        "Bài",
        "Từ Vựng",
        "Cách Đọc",
        "Ý Nghĩa",
        "Cách Chia / Nối Thể",
        "Ghi Chú",
        "Ví Dụ Minh Họa",
        "Nguồn",
    ]
    with csv_path.open(mode="w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for idx, rec in enumerate(ONOMATOPOEIA_N3_RECORDS, start=1):
            writer.writerow({
                "STT": idx,
                "Bài": rec[0],
                "Từ Vựng": rec[1],
                "Cách Đọc": rec[2],
                "Ý Nghĩa": rec[3],
                "Cách Chia / Nối Thể": rec[4],
                "Ghi Chú": rec[4],
                "Ví Dụ Minh Họa": rec[5],
                "Nguồn": rec[6],
            })
    return len(ONOMATOPOEIA_N3_RECORDS)


def export_synonyms_n3_to_csv() -> int:
    """Exports Synonyms N3 dataset into table CSV in PDF_OUTPUT_DIR."""
    from module_pdf_to_csv_fit_anki.src.n3_synonyms_data import SYNONYMS_N3_RECORDS

    csv_path = settings.SYNONYMS_CSV_PATH
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "STT",
        "Bài",
        "Từ Vựng",
        "Cách Đọc",
        "Ý Nghĩa",
        "Cách Chia / Nối Thể",
        "Ghi Chú",
        "Ví Dụ Minh Họa",
        "Nguồn",
    ]
    with csv_path.open(mode="w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for idx, rec in enumerate(SYNONYMS_N3_RECORDS, start=1):
            writer.writerow({
                "STT": idx,
                "Bài": rec[0],
                "Từ Vựng": rec[1],
                "Cách Đọc": rec[2],
                "Ý Nghĩa": rec[3],
                "Cách Chia / Nối Thể": rec[4],
                "Ghi Chú": rec[4],
                "Ví Dụ Minh Họa": rec[5],
                "Nguồn": rec[6],
            })
    return len(SYNONYMS_N3_RECORDS)


def export_word_usage_n3_to_csv() -> int:
    """Exports Word Usage N3 dataset into table CSV in PDF_OUTPUT_DIR."""
    from module_pdf_to_csv_fit_anki.src.n3_word_usage_data import WORD_USAGE_N3_RECORDS

    csv_path = settings.WORD_USAGE_CSV_PATH
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "STT",
        "Bài",
        "Từ Vựng",
        "Cách Đọc",
        "Ý Nghĩa",
        "Cách Chia / Nối Thể",
        "Ghi Chú",
        "Ví Dụ Minh Họa",
        "Nguồn",
    ]
    with csv_path.open(mode="w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for idx, rec in enumerate(WORD_USAGE_N3_RECORDS, start=1):
            writer.writerow({
                "STT": idx,
                "Bài": rec[0],
                "Từ Vựng": rec[1],
                "Cách Đọc": rec[2],
                "Ý Nghĩa": rec[3],
                "Cách Chia / Nối Thể": rec[4],
                "Ghi Chú": rec[4],
                "Ví Dụ Minh Họa": rec[5],
                "Nguồn": rec[6],
            })
    return len(WORD_USAGE_N3_RECORDS)


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
    course_title: Optional[str] = None,
    course_desc: Optional[str] = None,
) -> int:
    """Read study cards from CSV, attach to default Course, and atomically upsert system records while preserving Card IDs and CardReview rows."""
    if not csv_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file CSV tại: {csv_path}")

    is_custom_course = course_title is not None

    if not course_title:
        course_title, course_desc = DEFAULT_COURSE_META.get(
            card_type, DEFAULT_COURSE_META[Card.CardType.GRAMMAR]
        )
    elif course_desc is None:
        course_desc = ""

    default_course, created = Course.objects.get_or_create(
        title=course_title,
        defaults={
            "description": course_desc,
            "level": level,
            "card_type": card_type,
            "is_public": True,
            "created_by": None,
        },
    )
    if not created and course_desc and default_course.description != course_desc:
        default_course.description = course_desc
        default_course.save(update_fields=["description"])

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
        if is_custom_course:
            existing_cards_qs = Card.objects.select_for_update().filter(
                course=default_course, created_by__isnull=True
            )
        else:
            existing_cards_qs = Card.objects.select_for_update().filter(
                card_type=card_type, level=level, created_by__isnull=True
            )
        existing_cards = list(existing_cards_qs.order_by("display_order", "id"))
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
