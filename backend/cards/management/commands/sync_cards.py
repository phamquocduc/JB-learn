from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from cards.models import Card
from cards.services import (
    DEFAULT_COURSE_META,
    convert_pdfs_to_csv,
    export_expanded_grammar_to_csv,
    export_kanji_n3_to_csv,
    export_onomatopoeia_n3_to_csv,
    export_synonyms_n3_to_csv,
    export_vocab_n3_to_csv,
    export_word_usage_n3_to_csv,
    sync_cards_from_csv,
)
from shadowing.services.seeding import sync_shadowing_seed_videos


class Command(BaseCommand):
    help = "Parse PDFs (optional) and sync study cards and shadowing videos from CSV into the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--from-pdf",
            action="store_true",
            help="Re-parse source PDFs into CSV files before syncing to database.",
        )
        parser.add_argument(
            "--csv",
            type=str,
            default=str(settings.GRAMMAR_CSV_PATH),
            help="Path to the CSV file to import.",
        )
        parser.add_argument(
            "--type",
            type=str,
            default=Card.CardType.GRAMMAR,
            choices=Card.CardType.values,
            help="Card type to assign to imported records.",
        )
        parser.add_argument(
            "--level",
            type=str,
            default=Card.JLPTLevel.N3,
            choices=Card.JLPTLevel.values,
            help="JLPT level to assign to imported records.",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv"])
        card_type = options["type"]
        level = options["level"]

        try:
            if options["from_pdf"] or not csv_path.exists():
                extracted = convert_pdfs_to_csv()
                self.stdout.write(
                    f"Đã trích xuất {extracted} mục từ PDF sang CSV tại {settings.PDF_OUTPUT_DIR}."
                )

            kanji_count = 0
            vocab_count = 0
            ono_count = 0
            syn_count = 0
            wu_count = 0
            if (
                csv_path.resolve() == settings.GRAMMAR_CSV_PATH.resolve()
                and card_type == Card.CardType.GRAMMAR
            ):
                export_expanded_grammar_to_csv()
                grammar_meta = DEFAULT_COURSE_META[Card.CardType.GRAMMAR]
                count = sync_cards_from_csv(
                    csv_path=csv_path,
                    card_type=card_type,
                    level=level,
                    course_title=grammar_meta[0],
                    course_desc=grammar_meta[1],
                )
                if not settings.KANJI_CSV_PATH.exists():
                    export_kanji_n3_to_csv()
                kanji_meta = DEFAULT_COURSE_META[Card.CardType.KANJI]
                kanji_count = sync_cards_from_csv(
                    csv_path=settings.KANJI_CSV_PATH,
                    card_type=Card.CardType.KANJI,
                    level=level,
                    course_title=kanji_meta[0],
                    course_desc=kanji_meta[1],
                )
                if not settings.VOCAB_CSV_PATH.exists():
                    export_vocab_n3_to_csv()
                vocab_meta = DEFAULT_COURSE_META[Card.CardType.VOCABULARY]
                vocab_count = sync_cards_from_csv(
                    csv_path=settings.VOCAB_CSV_PATH,
                    card_type=Card.CardType.VOCABULARY,
                    level=level,
                    course_title=vocab_meta[0],
                    course_desc=vocab_meta[1],
                )

                export_onomatopoeia_n3_to_csv()
                ono_meta = DEFAULT_COURSE_META["onomatopoeia"]
                ono_count = sync_cards_from_csv(
                    csv_path=settings.ONOMATOPOEIA_CSV_PATH,
                    card_type=Card.CardType.VOCABULARY,
                    level=level,
                    course_title=ono_meta[0],
                    course_desc=ono_meta[1],
                )

                export_synonyms_n3_to_csv()
                syn_meta = DEFAULT_COURSE_META["synonyms"]
                syn_count = sync_cards_from_csv(
                    csv_path=settings.SYNONYMS_CSV_PATH,
                    card_type=Card.CardType.VOCABULARY,
                    level=level,
                    course_title=syn_meta[0],
                    course_desc=syn_meta[1],
                )

                export_word_usage_n3_to_csv()
                wu_meta = DEFAULT_COURSE_META["word_usage"]
                wu_count = sync_cards_from_csv(
                    csv_path=settings.WORD_USAGE_CSV_PATH,
                    card_type=Card.CardType.VOCABULARY,
                    level=level,
                    course_title=wu_meta[0],
                    course_desc=wu_meta[1],
                )
            else:
                count = sync_cards_from_csv(
                    csv_path=csv_path,
                    card_type=card_type,
                    level=level,
                )
            shadowing_count = sync_shadowing_seed_videos()
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc

        kanji_msg = f", {kanji_count} thẻ Kanji N3" if kanji_count else ""
        vocab_msg = f", {vocab_count} thẻ Từ vựng N3" if vocab_count else ""
        ono_msg = f", {ono_count} thẻ Từ tượng thanh/hình N3" if ono_count else ""
        syn_msg = f", {syn_count} thẻ Từ đồng nghĩa N3" if syn_count else ""
        wu_msg = f", {wu_count} thẻ Cách sử dụng từ N3" if wu_count else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"Đã đồng bộ {count} thẻ ({card_type} - {level}){kanji_msg}{vocab_msg}{ono_msg}{syn_msg}{wu_msg} và {shadowing_count} video Shadowing mẫu vào cơ sở dữ liệu."
            )
        )
