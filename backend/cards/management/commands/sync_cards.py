from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from cards.models import Card
from cards.services import convert_pdfs_to_csv, sync_cards_from_csv
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

            count = sync_cards_from_csv(
                csv_path=csv_path,
                card_type=card_type,
                level=level,
            )
            shadowing_count = sync_shadowing_seed_videos()
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Đã đồng bộ {count} thẻ ({card_type} - {level}) và {shadowing_count} video Shadowing mẫu vào cơ sở dữ liệu."
            )
        )
