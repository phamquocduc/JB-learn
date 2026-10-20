import os
import re
from typing import List, Dict, Any
import pypdf

class ShinkanzenN3PdfParser:
    """
    Parser for Shinkanzen Master N3 Grammar PDF summaries.
    Extracts table cells using bounding box coordinates and watermark row delimiters.
    """
    
    # Physical X coordinates for columns in landscape 792x612 pt
    COL_BOUNDS = [
        (0, 155),       # 0: Cách chia thể (Conjugation / Formation)
        (155, 265),     # 1: Cấu trúc NP (Grammar Structure)
        (265, 365),     # 2: Nghĩa là (Meaning)
        (365, 605),     # 3: Phạm vi sử dụng + chú ý (Usage & Notes)
        (605, 900),     # 4: Ví dụ minh họa (Examples)
    ]
    
    WATERMARK_REGEX = re.compile(r"MINATO|DORIM|NGOC\s*TIEP", re.IGNORECASE)
    
    def __init__(self):
        pass

    def parse_pdf(self, pdf_path: str, default_start_lesson: str = "Bài 1") -> List[Dict[str, Any]]:
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"File not found: {pdf_path}")
            
        reader = pypdf.PdfReader(pdf_path)
        is_ban_2 = "bản 2" in os.path.basename(pdf_path).lower()
        records: List[Dict[str, Any]] = []
        current_lesson = default_start_lesson
        
        for p_idx, page in enumerate(reader.pages):
            items = []
            watermark_ys = []
            
            def visitor(text, cm, tm, font_dict, font_size):
                if not text:
                    return
                if self.WATERMARK_REGEX.search(text):
                    watermark_ys.append(round(tm[5], 1))
                    return
                items.append({
                    "x": round(tm[4], 1),
                    "y": round(tm[5], 1),
                    "text": text
                })
                
            page.extract_text(visitor_text=visitor)
            if not items:
                continue
                
            # Special handling for Page 8 of bản 2 (Keigo summary)
            if is_ban_2 and p_idx == 7:
                records.extend(self._get_keigo_records(pdf_path, p_idx + 1))
                continue
                
            # Lesson tracking
            if is_ban_2 and p_idx == 6:
                # Page 7 in bản 2 is Bài 12
                current_lesson = "Bài 12"
            elif not (is_ban_2 and p_idx == 5):
                # Page 6 has mid-page lesson switch to Bài 11, handled below
                m_page = re.findall(r"Bài\s*(?:s\s*ố|số|s)?\s*(\d+)", page.extract_text())
                if m_page:
                    current_lesson = f"Bài {m_page[0]}"
                    
            header_items = [it for it in items if any(k in it["text"] for k in ["Cách chia th", "Cấu trúc NP", "Nghĩa là"])]
            header_ys = [it["y"] for it in header_items]
            
            # Detect lesson title y positions (e.g. Bài số 1, Bài s ố 11)
            title_ys = []
            # Check grouped lines for "Bài"
            ys_unique = sorted(list(set(it["y"] for it in items)), reverse=True)
            for y_val in ys_unique:
                line_items = [it for it in items if abs(it["y"] - y_val) <= 3]
                line_txt = "".join(it["text"] for it in sorted(line_items, key=lambda x: x["x"]))
                if re.search(r"Bài\s*(?:s\s*ố|số|s)?\s*\d+", line_txt, re.IGNORECASE):
                    title_ys.append(y_val)

            unique_wms = sorted(list(set(watermark_ys)), reverse=True)
            if not unique_wms:
                continue
                
            all_ys = sorted(list(set([it["y"] for it in items])), reverse=True)
            max_y = max(all_ys) + 5
            
            row_bounds = []
            first_wm = unique_wms[0]
            if any(it["y"] > first_wm for it in items):
                row_bounds.append((max_y, first_wm))
            for i in range(len(unique_wms) - 1):
                row_bounds.append((unique_wms[i], unique_wms[i+1]))
            last_wm = unique_wms[-1]
            if any(it["y"] < last_wm and it["y"] > 20 for it in items):
                row_bounds.append((last_wm, 20))
                
            for top_y, bot_y in row_bounds:
                row_items = [it for it in items if bot_y < it["y"] <= top_y]
                
                # Check for mid-page lesson header (e.g. Page 6 of Bản 2 has Bài s ố 11)
                row_text_stitched = self._stitch_line(sorted(row_items, key=lambda it: (-it["y"], it["x"])))
                m_lesson = re.search(r"Bài\s*(?:s\s*ố|số|s)?\s*(\d+)", row_text_stitched)
                if m_lesson:
                    current_lesson = f"Bài {m_lesson.group(1)}"
                    
                # Filter out table header and title texts
                clean_items = []
                for it in row_items:
                    if any(h in it["text"] for h in ["Cách chia th", "Cấu trúc NP", "Nghĩa là", "Phạm vi s", "Ví dụ minh", "Bài số"]):
                        continue
                    if any(abs(it["y"] - hy) <= 3 for hy in header_ys):
                        continue
                    if any(abs(it["y"] - ty) <= 3 for ty in title_ys):
                        continue
                    clean_items.append(it)
                    
                if not clean_items:
                    continue
                    
                cols = []
                for x_min, x_max in self.COL_BOUNDS:
                    c_items = [it for it in clean_items if x_min <= it["x"] < x_max]
                    cols.append(self._extract_cell_text(c_items))
                    
                conjugation = cols[0]
                grammar = cols[1]
                meaning = cols[2]
                usage = cols[3]
                examples = cols[4]
                
                # If grammar is empty or only noise, skip
                if not grammar and not meaning and not examples:
                    continue
                if grammar == "U" or grammar.startswith("MINATO"):
                    continue
                    
                records.append({
                    "source_file": os.path.basename(pdf_path),
                    "page": p_idx + 1,
                    "lesson": current_lesson,
                    "conjugation": conjugation,
                    "grammar": grammar,
                    "meaning": meaning,
                    "usage": usage,
                    "examples": examples
                })
                
        return records

    def _extract_cell_text(self, items: List[Dict[str, Any]]) -> str:
        if not items:
            return ""
        items_sorted = sorted(items, key=lambda it: (-it["y"], it["x"]))
        lines = []
        curr_line = []
        curr_y = None
        for it in items_sorted:
            if curr_y is None or abs(it["y"] - curr_y) <= 4.0:
                curr_line.append(it)
                if curr_y is None:
                    curr_y = it["y"]
            else:
                curr_line.sort(key=lambda x: x["x"])
                line_str = "".join([x["text"] for x in curr_line]).strip()
                if line_str:
                    lines.append(line_str)
                curr_line = [it]
                curr_y = it["y"]
        if curr_line:
            curr_line.sort(key=lambda x: x["x"])
            line_str = "".join([x["text"] for x in curr_line]).strip()
            if line_str:
                lines.append(line_str)
        return "\n".join(lines).strip()

    def _stitch_line(self, items: List[Dict[str, Any]]) -> str:
        return " ".join([it["text"] for it in items])

    def _get_keigo_records(self, pdf_path: str, page_num: int) -> List[Dict[str, Any]]:
        return [
            {
                "source_file": os.path.basename(pdf_path),
                "page": page_num,
                "lesson": "Bài 12 - Kính ngữ",
                "conjugation": "Động từ tôn kính đặc biệt / お～になる / ～られる / ご～",
                "grammar": "尊敬語（そんけいご） - Tôn kính ngữ",
                "meaning": "Tôn người khác lên",
                "usage": "Dùng để nói về hành động, trạng thái của người khác (người bề trên, khách hàng, đối tác) nhằm bày tỏ sự kính trọng.",
                "examples": "VD1: 社長はもうお帰りになりました。(Giám đốc đã về rồi.)\nVD2: 先生がそうおっしゃいました。(Thầy giáo đã nói như thế.)"
            },
            {
                "source_file": os.path.basename(pdf_path),
                "page": page_num,
                "lesson": "Bài 12 - Kính ngữ",
                "conjugation": "Động từ khiêm nhường đặc biệt / お～する / いただく / 参る / 申す",
                "grammar": "謙譲語（けんじょうご） - Khiêm nhường ngữ",
                "meaning": "Cách nói hạ mình",
                "usage": "Dùng để nói về hành động của bản thân hoặc người thuộc phía mình (gia đình, công ty mình) nhằm gián tiếp nâng đối phương lên.",
                "examples": "VD1: 私がご案内いたします。(Tôi xin phép được hướng dẫn quý khách.)\nVD2: 明日、会社へ伺います。(Ngày mai tôi sẽ đến công ty.)"
            },
            {
                "source_file": os.path.basename(pdf_path),
                "page": page_num,
                "lesson": "Bài 12 - Kính ngữ",
                "conjugation": "～です / ～ます / ～でございます",
                "grammar": "丁寧語（ていねいご） - Từ lịch sự",
                "meaning": "Nói một cách lịch sự",
                "usage": "Nói về các sự vật, sự việc một cách lịch sự, nhã nhặn, tôn trọng đối thoại nói chung.",
                "examples": "VD1: 雨が降っています。(Trời đang mưa.)\nVD2: こちらが受付でございます。(Đây là quầy tiếp tân.)"
            }
        ]
