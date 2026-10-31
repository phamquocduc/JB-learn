import re
from .jp_examples_data import BAN_1_JAPANESE_EXAMPLES, BAN_2_CLEAN_EXAMPLES

JP_CHAR_RE = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]")
DIEN_GIAI_SPLIT_RE = re.compile(r"(?:^|\n)\s*Di[ễế]n\s*gi\s*ải\s*[:：]\s*", re.IGNORECASE)
VD_SPLIT_RE = re.compile(r"(?:^|\n)\s*VD\d*\s*[:：]\s*", re.IGNORECASE)

# Fix common split Vietnamese vowel-consonant pairs caused by PDF font kerning in Bản 2
VI_BROKEN_VOWEL_RE = re.compile(
    r"\b([bBcCdĐđgGhHkKlLmMnNpPqQrRsStTvVxX]|ch|Ch|gh|Gh|gi|Gi|kh|Kh|nh|Nh|ng|Ng|ngh|Ngh|ph|Ph|qu|Qu|th|Th|tr|Tr)"
    r"(ư|ơ|ă|â|ê|ô)?\s+"
    r"([àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ][a-zA-Zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]*)\b"
)


class TextCleaner:
    """
    Utility class to clean and format text extracted from Shinkanzen Master N3 PDFs.
    """

    @staticmethod
    def fix_vietnamese_spacing(text: str) -> str:
        if not text:
            return ""
        # Repeatedly merge split Vietnamese syllables like "trư ờng", "đư ợc", "th ế", "v ừa"
        prev = None
        curr = text
        while prev != curr:
            prev = curr
            curr = VI_BROKEN_VOWEL_RE.sub(
                lambda m: f"{m.group(1)}{m.group(2) or ''}{m.group(3)}", curr
            )
        curr = re.sub(r"\s+([,.;:!?])", r"\1", curr)
        return re.sub(r"[ \t]+", " ", curr).strip()

    @staticmethod
    def clean_general(text: str) -> str:
        if not text:
            return ""
        lines = [line.strip() for line in text.split("\n")]
        lines = [l for l in lines if l]
        cleaned = "\n".join(lines)
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        return TextCleaner.fix_vietnamese_spacing(cleaned)

    @staticmethod
    def clean_grammar(grammar: str) -> str:
        text = TextCleaner.clean_general(grammar)
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        joined = " / ".join(lines)
        # Rejoin grammar tokens broken across lines in PDF (e.g., "Ｖてからでなけれ / ば。" -> "Ｖてからでなければ。")
        joined = joined.replace(" / ば。", "ば。").replace(" / ない", "ない").replace(" / る。", "る。")
        return joined

    @staticmethod
    def clean_meaning(meaning: str) -> str:
        text = TextCleaner.clean_general(meaning)
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        return " / ".join(lines)

    @staticmethod
    def extract_explanation(raw_ex: str) -> str:
        if not raw_ex:
            return ""
        parts = DIEN_GIAI_SPLIT_RE.split(raw_ex, maxsplit=1)
        if len(parts) < 2:
            return ""
        exp_lines = [l.strip() for l in parts[1].splitlines() if l.strip()]
        exp_text = TextCleaner.fix_vietnamese_spacing(" ".join(exp_lines))
        return f"Diễn giải: {exp_text}" if exp_text else ""

    @staticmethod
    def clean_usage(record: dict) -> str:
        raw_usage = record.get("usage", "") or ""
        raw_lines = [l.strip() for l in raw_usage.splitlines() if l.strip()]
        # Stitch wrapped lines within bullet points
        paragraphs = []
        for line in raw_lines:
            if not paragraphs or re.match(r"^[-.#•]|^Chú ý|^Khi\b|^Với\b", line, re.IGNORECASE):
                paragraphs.append(line)
            else:
                paragraphs[-1] = f"{paragraphs[-1]} {line}"
        usage_clean = "\n".join(TextCleaner.fix_vietnamese_spacing(p) for p in paragraphs)

        explanation = TextCleaner.extract_explanation(record.get("examples", ""))
        if explanation:
            usage_clean = f"{usage_clean}\n{explanation}".strip() if usage_clean else explanation
        return usage_clean

    @staticmethod
    def parse_raw_examples(raw_ex: str) -> str:
        """
        General algorithmic parser that groups wrapped Japanese lines and wrapped Vietnamese
        translation lines of each VD block into a single line: '<Japanese> — <Vietnamese>'.
        """
        if not raw_ex:
            return ""
        without_exp = DIEN_GIAI_SPLIT_RE.split(raw_ex, maxsplit=1)[0].strip()
        if not without_exp:
            return ""

        blocks = [b.strip() for b in VD_SPLIT_RE.split(without_exp) if b.strip()]
        formatted_examples = []

        for block in blocks:
            # Handle inline parenthesized translation: "社長はもうお帰りになりました。(Giám đốc đã về rồi.)"
            inline_match = re.match(r"^(.+?[。！？!?])\s*[（(](.+)[）)]\s*$", block)
            if inline_match and JP_CHAR_RE.search(inline_match.group(1)):
                jp = re.sub(r"\s+", "", inline_match.group(1))
                vi = TextCleaner.fix_vietnamese_spacing(inline_match.group(2))
                formatted_examples.append(f"{jp} — {vi}")
                continue

            jp_parts = []
            vi_parts = []
            for raw_line in block.splitlines():
                line = raw_line.strip()
                if not line:
                    continue
                # If line starts with Japanese or is predominantly Japanese before any Vietnamese
                if JP_CHAR_RE.search(line) and not vi_parts:
                    jp_parts.append(re.sub(r"\s+", "", line))
                else:
                    vi_parts.append(line.strip("()（） "))

            jp_sentence = "".join(jp_parts).strip()
            vi_sentence = TextCleaner.fix_vietnamese_spacing(" ".join(vi_parts))

            if jp_sentence and vi_sentence:
                formatted_examples.append(f"{jp_sentence} — {vi_sentence}")
            elif jp_sentence:
                formatted_examples.append(jp_sentence)
            elif vi_sentence:
                formatted_examples.append(vi_sentence)

        return "\n".join(formatted_examples)

    @staticmethod
    def get_enriched_examples(record: dict) -> str:
        raw_ex = record.get("examples", "") or ""
        src = (record.get("source_file", "") or "").lower()
        g_raw = TextCleaner.clean_general(record.get("grammar", ""))
        g_key = " / ".join(l.strip() for l in g_raw.split("\n") if l.strip())
        g_clean = TextCleaner.clean_grammar(record.get("grammar", ""))
        m_clean = TextCleaner.clean_meaning(record.get("meaning", ""))

        if "bản 1" in src:
            if "によって" in g_key:
                if "tùy thuộc" in m_clean.lower():
                    return BAN_1_JAPANESE_EXAMPLES["~によって / ~によっては"]
                if "do a" in m_clean.lower():
                    return BAN_1_JAPANESE_EXAMPLES["(A) によって (B) / (A )による＋Ｎ(B) [Do A ...nên B]"]
                if "bằng cách" in m_clean.lower():
                    return BAN_1_JAPANESE_EXAMPLES["(A) によって (B) / (A )による＋Ｎ(B) [Bằng cách, nhờ có]"]

            for candidate in (g_key, g_clean):
                if candidate in BAN_1_JAPANESE_EXAMPLES:
                    return BAN_1_JAPANESE_EXAMPLES[candidate]

            for k, ex_val in BAN_1_JAPANESE_EXAMPLES.items():
                if k.split(" / ")[0] == g_key.split(" / ")[0] or k in g_key or g_key in k:
                    return ex_val

        if "bản 2" in src:
            if "もらいたい" in g_key:
                if "cho / phép" in m_clean.lower() or "cho phép" in m_clean.lower():
                    return BAN_2_CLEAN_EXAMPLES["～もらいたい / ～いただきたい / ～欲しい [Mong muốn được cho phép]"]
                return BAN_2_CLEAN_EXAMPLES["～もらいたい / ～いただきたい / ～欲しい [Muốn ai đó làm]"]
            if g_key == "～いい":
                if "mong" in m_clean.lower() or "ước" in m_clean.lower():
                    return BAN_2_CLEAN_EXAMPLES["～いい [Mong rằng]"]
                return BAN_2_CLEAN_EXAMPLES["～いい [Nên]"]

            for candidate in (g_key, g_clean):
                if candidate in BAN_2_CLEAN_EXAMPLES:
                    return BAN_2_CLEAN_EXAMPLES[candidate]

        return TextCleaner.parse_raw_examples(raw_ex)

    @staticmethod
    def format_html_back(record: dict) -> str:
        """
        Creates a clean, styled HTML back for standard Anki cards.
        """
        html_parts = []

        meaning = TextCleaner.clean_meaning(record.get("meaning", ""))
        if meaning:
            html_parts.append(
                f'<div style="font-size: 1.05em; font-weight: bold; color: #2b6cb0; margin-bottom: 6px;">'
                f'🎯 {meaning}</div>'
            )

        conj = TextCleaner.clean_general(record.get("conjugation", ""))
        if conj:
            conj_html = conj.replace("\n", "<br>")
            html_parts.append(
                f'<div style="background-color: #f7fafc; border-left: 3px solid #4299e1; padding: 6px 10px; margin-bottom: 8px; font-size: 0.88em; line-height: 1.45;">'
                f'<b>🔗 Cách nối / Chia thể:</b><br>{conj_html}</div>'
            )

        usage = TextCleaner.clean_usage(record)
        if usage:
            usage_html = usage.replace("\n", "<br>")
            html_parts.append(
                f'<div style="background-color: #fffaf0; border-left: 3px solid #ed8936; padding: 6px 10px; margin-bottom: 8px; font-size: 0.88em; line-height: 1.45;">'
                f'<b>💡 Phạm vi sử dụng & Chú ý:</b><br>{usage_html}</div>'
            )

        ex_text = TextCleaner.get_enriched_examples(record)
        if ex_text:
            examples_html = ex_text.replace("\n", "<br>")
            html_parts.append(
                f'<div style="background-color: #f0fff4; border-left: 3px solid #48bb78; padding: 6px 10px; margin-bottom: 6px; font-size: 0.88em; line-height: 1.45;">'
                f'<b>📝 Ví dụ minh họa:</b><br>{examples_html}</div>'
            )

        lesson = record.get("lesson", "")
        if lesson:
            html_parts.append(
                f'<div style="text-align: right; color: #a0aec0; font-size: 0.75em; margin-top: 4px;">'
                f'📚 Shinkanzen Master N3 - {lesson}</div>'
            )

        return "".join(html_parts)
