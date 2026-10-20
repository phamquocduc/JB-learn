import re
from .jp_examples_data import BAN_1_JAPANESE_EXAMPLES

class TextCleaner:
    """
    Utility class to clean and format text extracted from Shinkanzen Master N3 PDFs.
    """

    @staticmethod
    def clean_general(text: str) -> str:
        if not text:
            return ""
        # Strip trailing/leading spaces on lines
        lines = [line.strip() for line in text.split("\n")]
        # Remove empty lines
        lines = [l for l in lines if l]
        cleaned = "\n".join(lines)
        # Normalize multiple spaces inside line
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        return cleaned.strip()

    @staticmethod
    def clean_grammar(grammar: str) -> str:
        text = TextCleaner.clean_general(grammar)
        # Replace line breaks in grammar points with slash or space if short
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        return " / ".join(lines)

    @staticmethod
    def clean_meaning(meaning: str) -> str:
        text = TextCleaner.clean_general(meaning)
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        return " / ".join(lines)

    @staticmethod
    def get_enriched_examples(record: dict) -> str:
        raw_ex = TextCleaner.clean_general(record.get("examples", ""))
        src = record.get("source_file", "")
        # Only Bản 1 needs enrichment (Bản 2 already has Japanese sentences for all records)
        if "bản 1" not in src.lower():
            return raw_ex
            
        g_clean = TextCleaner.clean_grammar(record.get("grammar", ""))
        m_clean = TextCleaner.clean_meaning(record.get("meaning", ""))
        
        # Skip ところ because it already has 4 Japanese sentences in the original PDF
        if "ところ" in g_clean:
            return raw_ex
            
        # Disambiguate によって by meaning
        if "によって" in g_clean:
            if "tùy thuộc" in m_clean.lower():
                jp_text = BAN_1_JAPANESE_EXAMPLES.get("~によって / ~によっては", "")
                return (jp_text + raw_ex).strip()
            elif "do a" in m_clean.lower():
                jp_text = BAN_1_JAPANESE_EXAMPLES.get("(A) によって (B) / (A )による＋Ｎ(B) [Do A ...nên B]", "")
                return (jp_text + raw_ex).strip()
            elif "bằng cách" in m_clean.lower():
                jp_text = BAN_1_JAPANESE_EXAMPLES.get("(A) によって (B) / (A )による＋Ｎ(B) [Bằng cách, nhờ có]", "")
                return (jp_text + raw_ex).strip()

        # Exact match
        if g_clean in BAN_1_JAPANESE_EXAMPLES:
            return (BAN_1_JAPANESE_EXAMPLES[g_clean] + raw_ex).strip()
            
        # First token match
        for k, jp_text in BAN_1_JAPANESE_EXAMPLES.items():
            if k.split(" / ")[0] == g_clean.split(" / ")[0]:
                return (jp_text + raw_ex).strip()
                
        # Substring match
        for k, jp_text in BAN_1_JAPANESE_EXAMPLES.items():
            if k in g_clean or g_clean in k:
                return (jp_text + raw_ex).strip()
                    
        return raw_ex

    @staticmethod
    def format_html_back(record: dict) -> str:
        """
        Creates a clean, styled HTML back for standard Anki cards.
        """
        html_parts = []
        
        # Meaning (Highlight badge)
        if record.get("meaning"):
            html_parts.append(
                f'<div style="font-size: 1.05em; font-weight: bold; color: #2b6cb0; margin-bottom: 6px;">'
                f'🎯 {record["meaning"]}</div>'
            )
            
        # Conjugation / Connection
        if record.get("conjugation"):
            conj_html = record["conjugation"].replace("\n", "<br>")
            html_parts.append(
                f'<div style="background-color: #f7fafc; border-left: 3px solid #4299e1; padding: 6px 10px; margin-bottom: 8px; font-size: 0.88em; line-height: 1.45;">'
                f'<b>🔗 Cách nối / Chia thể:</b><br>{conj_html}</div>'
            )
            
        # Usage and Notes
        if record.get("usage"):
            usage_html = record["usage"].replace("\n", "<br>")
            html_parts.append(
                f'<div style="background-color: #fffaf0; border-left: 3px solid #ed8936; padding: 6px 10px; margin-bottom: 8px; font-size: 0.88em; line-height: 1.45;">'
                f'<b>💡 Phạm vi sử dụng & Chú ý:</b><br>{usage_html}</div>'
            )
            
        # Examples
        ex_text = TextCleaner.get_enriched_examples(record)
        if ex_text:
            examples_html = ex_text.replace("\n", "<br>")
            html_parts.append(
                f'<div style="background-color: #f0fff4; border-left: 3px solid #48bb78; padding: 6px 10px; margin-bottom: 6px; font-size: 0.88em; line-height: 1.45;">'
                f'<b>📝 Ví dụ minh họa:</b><br>{examples_html}</div>'
            )
            
        # Footer / Lesson tag
        lesson = record.get("lesson", "")
        if lesson:
            html_parts.append(
                f'<div style="text-align: right; color: #a0aec0; font-size: 0.75em; margin-top: 4px;">'
                f'📚 Shinkanzen Master N3 - {lesson}</div>'
            )
            
        return "".join(html_parts)
