import csv
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
        "Tổng hợp Từ vựng JLPT N3",
        "Bộ thẻ từ vựng JLPT N3 trọng tâm.",
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


def convert_pdfs_to_csv() -> int:
    """Parse source Shinkanzen N3 PDF files and Kanji N3 data and export CSV outputs."""
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
    return len(records)


def sync_cards_from_csv(
    csv_path: Path,
    card_type: str = Card.CardType.GRAMMAR,
    level: str = Card.JLPTLevel.N3,
) -> int:
    """Read study cards from CSV, attach to default Course, and atomically replace system records for (card_type, level)."""
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

    cards: list[Card] = []
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

            reading = (row.get("Từ Vựng") or "").strip() if row.get("Hán Tự") else ""
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

            cards.append(
                Card(
                    course=default_course,
                    created_by=None,
                    is_public=True,
                    card_type=card_type,
                    level=level,
                    lesson=(row.get("Bài") or "").strip(),
                    display_order=display_order,
                    front_text=front_text,
                    meaning=(row.get("Ý Nghĩa") or "").strip(),
                    conjugation=conjugation,
                    usage_notes=usage_notes,
                    examples=(row.get("Ví Dụ Minh Họa") or "").strip(),
                    extra_data=extra_data,
                    source=(row.get("Nguồn") or "").strip(),
                )
            )

    with transaction.atomic():
        Card.objects.filter(
            card_type=card_type, level=level, created_by__isnull=True
        ).delete()
        Card.objects.bulk_create(cards, batch_size=500)

    return len(cards)
