import os
import csv
from typing import List, Dict, Any
from .text_cleaner import TextCleaner

class AnkiExporter:
    """
    Exports parsed grammar records into standard Anki CSV files and Excel-friendly formats.
    """

    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def export_all(self, records: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        Exports all 3 CSV formats and returns their output paths.
        """
        basic_path = self.export_basic_cards(records)
        detailed_path = self.export_detailed_cards(records)
        table_path = self.export_table_csv(records)
        
        return {
            "basic_anki": basic_path,
            "detailed_anki": detailed_path,
            "table_csv": table_path
        }

    def export_basic_cards(self, records: List[Dict[str, Any]], filename: str = "shinkanzen_n3_anki_basic.csv") -> str:
        """
        Export standard 2-field Anki card (Front, Back, Tags).
        Front: Grammar Structure
        Back: HTML formatted card with Meaning, Conjugation, Usage notes, and Examples.
        """
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, mode="w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f, quoting=csv.QUOTE_ALL)
            # Anki header
            writer.writerow(["Front", "Back", "Tags"])
            
            for r in records:
                grammar_clean = TextCleaner.clean_grammar(r.get("grammar", ""))
                if not grammar_clean:
                    continue
                    
                lesson_tag = r.get("lesson", "").replace(" ", "_").replace("-", "_")
                tag_str = f"JLPT_N3 Shinkanzen_N3 {lesson_tag}"
                
                front_html = (
                    f'<div style="font-size: 1.2em; font-weight: bold; text-align: center; color: #1a202c; padding: 6px;">'
                    f'{grammar_clean}'
                    f'</div>'
                    f'<div style="text-align: center; color: #718096; font-size: 0.8em;">'
                    f'[{r.get("lesson", "")}]'
                    f'</div>'
                )
                
                back_html = TextCleaner.format_html_back(r)
                writer.writerow([front_html, back_html, tag_str])
                
        return filepath

    def export_detailed_cards(self, records: List[Dict[str, Any]], filename: str = "shinkanzen_n3_anki_detailed.csv") -> str:
        """
        Export multi-field Anki card:
        Fields: Lesson, Grammar, Meaning, Conjugation, Usage, Examples, Tags
        """
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, mode="w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f, quoting=csv.QUOTE_ALL)
            writer.writerow(["Lesson", "Grammar", "Meaning", "Conjugation", "Usage_Notes", "Examples", "Tags"])
            
            for r in records:
                grammar_clean = TextCleaner.clean_grammar(r.get("grammar", ""))
                meaning_clean = TextCleaner.clean_meaning(r.get("meaning", ""))
                conj_clean = TextCleaner.clean_general(r.get("conjugation", "")).replace("\n", "<br>")
                usage_clean = TextCleaner.clean_usage(r).replace("\n", "<br>")
                ex_clean = TextCleaner.get_enriched_examples(r).replace("\n", "<br>")
                
                lesson_tag = r.get("lesson", "").replace(" ", "_").replace("-", "_")
                tag_str = f"JLPT_N3 Shinkanzen_N3 {lesson_tag}"
                
                writer.writerow([
                    r.get("lesson", ""),
                    grammar_clean,
                    meaning_clean,
                    conj_clean,
                    usage_clean,
                    ex_clean,
                    tag_str
                ])
                
        return filepath

    def export_table_csv(self, records: List[Dict[str, Any]], filename: str = "shinkanzen_n3_grammar_table.csv") -> str:
        """
        Export clean plain-text CSV table for viewing in Excel, Google Sheets, Numbers.
        """
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, mode="w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f, quoting=csv.QUOTE_ALL)
            writer.writerow(["STT", "Bài", "Cấu Trúc Ngữ Pháp", "Ý Nghĩa", "Cách Chia / Nối Thể", "Phạm Vi Sử Dụng & Chú Ý", "Ví Dụ Minh Họa", "Nguồn"])
            
            for idx, r in enumerate(records, start=1):
                writer.writerow([
                    idx,
                    r.get("lesson", ""),
                    TextCleaner.clean_grammar(r.get("grammar", "")),
                    TextCleaner.clean_meaning(r.get("meaning", "")),
                    TextCleaner.clean_general(r.get("conjugation", "")),
                    TextCleaner.clean_usage(r),
                    TextCleaner.get_enriched_examples(r),
                    f"{r.get('source_file', '')} (Trang {r.get('page', '')})"
                ])
                
        return filepath
