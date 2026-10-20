from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("cards", "0002_card_created_by_card_is_public_course_card_course"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE cards_course CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            ALTER TABLE cards_card CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            """,
            reverse_sql="""
            ALTER TABLE cards_course CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;
            ALTER TABLE cards_card CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;
            """,
        ),
    ]
