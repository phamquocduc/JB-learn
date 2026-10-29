import logging
import re
from urllib.parse import parse_qs, urlparse

from django.conf import settings
import pykakasi
from youtube_transcript_api import (
    NoTranscriptFound,
    TranscriptsDisabled,
    YouTubeTranscriptApi,
)

logger = logging.getLogger(__name__)

KANJI_CHAR = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\U00020000-\U0002ebbf々ヶ]")
RUBY_PATTERN = re.compile(r"([一-龯々ヶ\u3400-\u4dbf\U00020000-\U0002ebbf]+)\s*[（(]([ぁ-んァ-ンー・]+)[）)]")

_whisper_model = None
_kakasi_instance = None


def get_kakasi():
    """Lazy singleton for pykakasi converter."""
    global _kakasi_instance
    if _kakasi_instance is None:
        _kakasi_instance = pykakasi.kakasi()
    return _kakasi_instance


def get_whisper_model(model_size: str = "base"):
    """
    Lazy singleton for faster-whisper WhisperModel running on CPU with 8-bit quantization.
    PyAV built-in demuxing allows processing without requiring a system ffmpeg binary.
    """
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        cache_dir = getattr(
            settings,
            "WHISPER_CACHE_DIR",
            settings.BASE_DIR / ".cache" / "whisper",
        )
        cache_dir.mkdir(parents=True, exist_ok=True)
        _whisper_model = WhisperModel(
            model_size_or_path=model_size,
            device="cpu",
            compute_type="int8",
            cpu_threads=4,
            download_root=str(cache_dir),
        )
    return _whisper_model


def _align_kanji_reading(orig: str, hira: str) -> str:
    """
    Splits an individual word token into alternating Kanji and Kana runs,
    aligning reading so that each Kanji block is followed by brackets (かんじ).
    This ensures complete compatibility with RubyText.jsx's regex:
    /([一-龯々ヶ]+)\s*[（(]([ぁ-んァ-ンー・]+)[）)]/g
    """
    if not orig:
        return ""
    if not any(KANJI_CHAR.match(c) for c in orig):
        return orig
    if all(KANJI_CHAR.match(c) for c in orig):
        return f"{orig}({hira})"

    # Group characters into alternating kanji vs non-kanji blocks
    runs = []
    curr_is_kanji = bool(KANJI_CHAR.match(orig[0]))
    curr_str = orig[0]
    for c in orig[1:]:
        is_k = bool(KANJI_CHAR.match(c))
        if is_k == curr_is_kanji:
            curr_str += c
        else:
            runs.append((curr_is_kanji, curr_str))
            curr_is_kanji = is_k
            curr_str = c
    runs.append((curr_is_kanji, curr_str))

    result = []
    hira_pos = 0
    for idx, (is_k, text) in enumerate(runs):
        if not is_k:
            result.append(text)
            k_idx = hira.find(text, hira_pos)
            if k_idx != -1:
                hira_pos = k_idx + len(text)
        else:
            if idx + 1 < len(runs) and not runs[idx + 1][0]:
                next_kana = runs[idx + 1][1]
                next_pos = hira.find(next_kana, hira_pos)
                if next_pos != -1:
                    reading = hira[hira_pos:next_pos]
                    result.append(f"{text}({reading})")
                    hira_pos = next_pos
                else:
                    reading = hira[hira_pos:]
                    result.append(f"{text}({reading})")
                    hira_pos = len(hira)
            else:
                reading = hira[hira_pos:]
                result.append(f"{text}({reading})")
                hira_pos = len(hira)
    return "".join(result)


def format_furigana(text: str) -> str:
    """
    Transforms Japanese text into bracketed Furigana format: 漢字(かんじ).
    Non-kanji characters (Hiragana, Katakana, punctuation, Latin, emojis) are preserved untouched.
    Handles 4-byte astral characters (rare kanji e.g. 𠮷, emojis 🇯🇵🎧✨) and pre-bracketed text.
    """
    if not text:
        return ""

    # If the text already has rubies matching RUBY_PATTERN throughout and no unbracketed kanji
    if RUBY_PATTERN.search(text) and not KANJI_CHAR.search(RUBY_PATTERN.sub("", text)):
        return text

    # Step 1: Protect pre-existing rubies from double-bracketing
    saved_rubies = []

    def _ruby_sub(match):
        idx = len(saved_rubies)
        saved_rubies.append(match.group(0))
        return f"__RUBY_PH_{idx}__"

    masked = RUBY_PATTERN.sub(_ruby_sub, text)

    # Step 2: Split text around astral characters (> 0xFFFF: emojis, flags, astral kanji)
    # pykakasi corrupts or drops 4-byte astral code points, so we isolate them
    kks = get_kakasi()
    pieces = re.split(r"([^\u0000-\uFFFF]+)", masked)
    chunks = []
    for piece in pieces:
        if not piece:
            continue
        if re.match(r"^[^\u0000-\uFFFF]+$", piece):
            # Astral characters: preserved directly without passing to pykakasi
            chunks.append(piece)
        else:
            tokens = kks.convert(piece)
            for t in tokens:
                orig = t.get("orig", "")
                hira = t.get("hira", "")
                chunks.append(_align_kanji_reading(orig, hira))

    result = "".join(chunks)

    # Step 3: Restore saved rubies
    for idx, orig_ruby in enumerate(saved_rubies):
        result = result.replace(f"__RUBY_PH_{idx}__", orig_ruby)

    return result


def tokenize_words(text: str) -> list:
    """
    Extracts word tokens with token, text, reading, romaji, and is_kanji flag.
    Punctuation marks and whitespace are filtered out.
    Handles 4-byte astral characters and preserves both 'token' and 'text' keys.
    """
    if not text:
        return []
    kks = get_kakasi()
    ignored = {"、", "。", "！", "？", "!", "?", " ", "　", "\n", "\t", "（", "）", "(", ")"}
    pieces = re.split(r"([^\u0000-\uFFFF]+)", text)
    words = []

    for piece in pieces:
        if not piece:
            continue
        if re.match(r"^[^\u0000-\uFFFF]+$", piece):
            for ch in piece:
                ch_stripped = ch.strip()
                if not ch_stripped or ch_stripped in ignored:
                    continue
                words.append(
                    {
                        "token": ch_stripped,
                        "text": ch_stripped,
                        "reading": ch_stripped,
                        "romaji": "",
                        "meaning": "",
                        "is_kanji": bool(KANJI_CHAR.search(ch_stripped)),
                    }
                )
        else:
            tokens = kks.convert(piece)
            for t in tokens:
                orig = t.get("orig", "").strip()
                if not orig or orig in ignored:
                    continue
                words.append(
                    {
                        "token": orig,
                        "text": orig,
                        "reading": t.get("hira", orig),
                        "romaji": t.get("hepburn", ""),
                        "meaning": "",
                        "is_kanji": bool(KANJI_CHAR.search(orig)),
                    }
                )
    return words


# Alias export for backward and test contract compatibility
extract_word_tokens = tokenize_words


def extract_youtube_id(url_or_id: str) -> str:
    """
    Extracts YouTube 11-character video ID from varied URL formats or returns the ID as-is.
    Supports youtu.be, youtube.com/watch?v=, youtube.com/embed/, etc.
    """
    if not url_or_id:
        return ""
    val = url_or_id.strip()
    if len(val) == 11 and re.match(r"^[A-Za-z0-9_-]{11}$", val):
        return val

    parsed = urlparse(val)
    if parsed.netloc in ("youtu.be", "www.youtu.be"):
        return parsed.path.lstrip("/").split("/")[0][:11]
    if "youtube.com" in parsed.netloc:
        if parsed.path.startswith("/embed/"):
            return parsed.path.replace("/embed/", "").split("/")[0][:11]
        qs = parse_qs(parsed.query)
        if "v" in qs and qs["v"]:
            return qs["v"][0][:11]
    # Fallback regex search
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", val)
    if match:
        return match.group(1)
    return val


def extract_youtube_transcript(youtube_url_or_id: str) -> list:
    """
    Fetches transcript for a YouTube video using youtube-transcript-api,
    formats each snippet into structured segments with Furigana and tokenized words.
    """
    video_id = extract_youtube_id(youtube_url_or_id)
    if not video_id:
        raise ValueError("Không thể nhận diện YouTube Video ID hợp lệ.")

    ytt = YouTubeTranscriptApi()
    try:
        fetched = ytt.fetch(video_id, languages=["ja", "ja-JP", "en"])
        raw_snippets = fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else list(fetched)
    except (NoTranscriptFound, TranscriptsDisabled):
        # Try listing transcripts to search for any available or auto-generated transcript
        try:
            transcript_list = ytt.list(video_id)
            transcript = transcript_list.find_transcript(["ja", "ja-JP", "en"])
            fetched_fallback = transcript.fetch()
            raw_snippets = (
                fetched_fallback.to_raw_data()
                if hasattr(fetched_fallback, "to_raw_data")
                else list(fetched_fallback)
            )
        except Exception as exc:
            logger.warning("YouTube transcript lookup failed for %s: %s", video_id, exc)
            raise ValueError(f"Không tìm thấy phụ đề tiếng Nhật cho video YouTube {video_id}.") from exc
    except Exception as exc:
        logger.warning("YouTube transcript fetch error for %s: %s", video_id, exc)
        raise ValueError(f"Lỗi khi trích xuất phụ đề YouTube: {exc}") from exc

    segments = []
    for idx, item in enumerate(raw_snippets):
        text_val = item.get("text", "") if isinstance(item, dict) else getattr(item, "text", "")
        raw_text = str(text_val).replace("\n", " ").strip()
        if not raw_text:
            continue
        start_val = item.get("start", 0.0) if isinstance(item, dict) else getattr(item, "start", 0.0)
        dur_val = item.get("duration", 2.0) if isinstance(item, dict) else getattr(item, "duration", 2.0)
        start = round(float(start_val), 2)
        duration = max(0.1, float(dur_val))
        end = round(start + duration, 2)
        ruby = format_furigana(raw_text)
        words = tokenize_words(raw_text)
        segments.append(
            {
                "id": len(segments) + 1,
                "start": start,
                "end": end,
                "text": raw_text,
                "ruby_text": ruby,
                "meaning": "",
                "words": words,
            }
        )
    return segments


def transcribe_audio_offline(file_path_or_buffer) -> list:
    """
    Transcribes audio/video file offline using faster-whisper on CPU with int8 quantization.
    Decodes audio via built-in PyAV with zero external ffmpeg binary dependency.
    Returns structured list of segments with Furigana and tokenized words.
    """
    model = get_whisper_model(model_size=getattr(settings, "WHISPER_MODEL_SIZE", "base"))
    segments_gen, info = model.transcribe(
        file_path_or_buffer,
        language="ja",
        task="transcribe",
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=200),
        word_timestamps=True,
        condition_on_previous_text=False,
    )

    segments = []
    for seg in segments_gen:
        text = seg.text.strip()
        if not text:
            continue
        start = round(float(seg.start), 2)
        end = round(max(start + 0.1, float(seg.end)), 2)
        ruby = format_furigana(text)
        words = tokenize_words(text)
        segments.append(
            {
                "id": len(segments) + 1,
                "start": start,
                "end": end,
                "text": text,
                "ruby_text": ruby,
                "meaning": "",
                "words": words,
            }
        )
    return segments


def generate_exercises_from_segments(segments: list) -> list:
    """
    Generates interactive listening cloze and comprehension exercises derived
    from transcript segments.
    """
    if not segments:
        return []

    exercises = []
    exercise_id = 1

    # Find kanji words to build vocabulary cloze exercises
    for seg in segments:
        words = seg.get("words", [])
        kanji_words = [
            w
            for w in words
            if w.get("is_kanji") and len(str(w.get("text", "")).strip()) >= 2
        ]
        if not kanji_words:
            continue

        target = kanji_words[0]
        full_text = str(seg.get("text", "")).strip()
        target_text = str(target.get("text", "")).strip()
        reading = str(target.get("reading") or target_text).strip()
        if not full_text or not target_text or not reading:
            continue

        # 1. Reading question
        options = [reading]
        if reading.endswith("い") and len(reading) > 1:
            distractors = [reading[:-1] + "る", reading[:-1] + "た", reading + "ます"]
        elif reading.endswith("る") and len(reading) > 1:
            distractors = [reading[:-1] + "す", reading[:-1] + "た", reading[:-1] + "ない"]
        else:
            distractors = [reading + "かた", reading + "どう", reading + "せい"]

        for d in distractors:
            if len(options) >= 4:
                break
            d_clean = str(d).strip()
            if d_clean and d_clean != reading and d_clean not in options:
                options.append(d_clean)
        while len(options) < 4:
            options.append(f"{reading}{len(options)}")
        options = options[:4]

        exercises.append(
            {
                "id": exercise_id,
                "type": "vocabulary",
                "segment_id": seg.get("id", 1),
                "question": f"Từ「{target_text}」trong câu sau có cách đọc Furigana đúng là gì?\n「{full_text}」",
                "options": options,
                "correct_index": 0,
                "explanation": f"「{target_text}」được đọc là「{reading}」trong ngữ cảnh này.",
            }
        )
        exercise_id += 1

        # 2. Fill-in-the-blank listening cloze question
        cloze_sentence = full_text.replace(target_text, " [ _____ ] ", 1)
        cloze_options = [target_text]
        other_tokens = [
            str(w.get("text", "")).strip()
            for w in words
            if str(w.get("text", "")).strip() != target_text
            and len(str(w.get("text", "")).strip()) >= 2
        ]
        for token in other_tokens:
            if len(cloze_options) >= 4:
                break
            if token and token not in cloze_options:
                cloze_options.append(token)
        fallback_tokens = ["考え方", "時間", "生活", "日本"]
        for fb in fallback_tokens:
            if len(cloze_options) >= 4:
                break
            if fb != target_text and fb not in cloze_options:
                cloze_options.append(fb)
        cloze_options = cloze_options[:4]

        exercises.append(
            {
                "id": exercise_id,
                "type": "cloze",
                "segment_id": seg.get("id", 1),
                "question": f"Lắng nghe đoạn âm thanh và điền từ thích hợp vào chỗ trống:\n「{cloze_sentence}」",
                "options": cloze_options,
                "correct_index": 0,
                "explanation": f"Đáp án chính xác là「{target_text}」({reading}).",
            }
        )
        exercise_id += 1
        if len(exercises) >= 4:
            break

    # If no kanji words found, generate a general listening comprehension exercise
    if not exercises and segments:
        first_seg = segments[0]
        exercises.append(
            {
                "id": 1,
                "type": "comprehension",
                "segment_id": first_seg.get("id", 1),
                "question": f"Nội dung của câu mở đầu「{first_seg.get('text')}」là gì?",
                "options": [
                    "Lời chào hỏi và giới thiệu mở đầu bài học",
                    "Đưa ra kết luận của bài giảng",
                    "Đặt câu hỏi kiểm tra ngữ pháp",
                    "Tạm biệt người nghe",
                ],
                "correct_index": 0,
                "explanation": "Câu mở đầu dùng để chào hỏi và bắt đầu chủ đề buổi nói chuyện.",
            }
        )
    return exercises
