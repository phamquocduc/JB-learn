import logging
import os
from pathlib import Path
import tempfile
from typing import Optional

from django.conf import settings
from django.utils.translation import gettext as _
import requests

logger = logging.getLogger(__name__)

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
DEFAULT_GROQ_MODEL = "whisper-large-v3-turbo"


def get_groq_api_key() -> str:
    """Retrieves the configured Groq API Key."""
    key = getattr(settings, "GROQ_API_KEY", "") or os.environ.get("GROQ_API_KEY", "")
    return str(key).strip()


def is_groq_configured() -> bool:
    """Checks if a non-placeholder Groq API key is present."""
    key = get_groq_api_key()
    if not key or len(key) < 10:
        return False
    if any(placeholder in key.lower() for placeholder in ("your-", "<your", "placeholder", "xxx")):
        return False
    return True


def get_groq_model() -> str:
    """Retrieves the configured Groq Whisper model."""
    model = (
        getattr(settings, "GROQ_WHISPER_MODEL", "")
        or os.environ.get("GROQ_WHISPER_MODEL", "")
    )
    return str(model).strip() or DEFAULT_GROQ_MODEL


def extract_audio_to_compact_mp3(
    input_path: str,
    output_path: Optional[str] = None,
    bitrate: int = 64000,
) -> str:
    """
    Extracts the first audio stream from any video/audio container into a lightweight
    16kHz mono MP3 using PyAV. Eliminates high RAM usage and avoids external ffmpeg binaries.
    """
    import av

    if not output_path:
        fd, output_path = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)

    try:
        with av.open(input_path) as in_container:
            if not in_container.streams.audio:
                raise ValueError(
                    _(
                        "Tệp media không chứa luồng âm thanh hợp lệ (hoặc video không có tiếng). "
                        "Vui lòng chọn tệp video/âm thanh có tiếng để trích xuất phụ đề."
                    )
                )
            in_stream = in_container.streams.audio[0]

            with av.open(output_path, mode="w", format="mp3") as out_container:
                out_stream = out_container.add_stream("mp3", rate=16000)
                out_stream.bit_rate = bitrate
                resampler = av.AudioResampler(format="s16p", layout="mono", rate=16000)

                for frame in in_container.decode(in_stream):
                    for resampled_frame in resampler.resample(frame):
                        for packet in out_stream.encode(resampled_frame):
                            out_container.mux(packet)

                for packet in out_stream.encode():
                    out_container.mux(packet)

        return output_path
    except (av.FFmpegError, ValueError) as av_err:
        Path(output_path).unlink(missing_ok=True)
        raise ValueError(
            _("Không thể giải mã dữ liệu âm thanh từ tệp media: %(err)s") % {"err": str(av_err)}
        ) from av_err
    except Exception:
        Path(output_path).unlink(missing_ok=True)
        raise


def transcribe_with_groq(file_path_or_buffer, model: Optional[str] = None) -> list:
    """
    Transcribes audio using Groq Whisper Cloud API (Whisper Large v3 / Large v3 Turbo).
    Consumes zero local server RAM and returns structured segments with Furigana.
    """
    from .transcription import format_furigana, tokenize_words

    api_key = get_groq_api_key()
    if not api_key:
        raise ValueError(
            _("Chưa cấu hình GROQ_API_KEY trên máy chủ. Vui lòng thêm biến môi trường GROQ_API_KEY.")
        )

    chosen_model = model or get_groq_model()
    temp_mp3_path = None
    file_to_send_path = None

    # Determine input path or write buffer to temporary file
    if isinstance(file_path_or_buffer, (str, Path)):
        source_path = str(file_path_or_buffer)
        should_clean_source = False
    else:
        fd, source_path = tempfile.mkstemp(suffix=".tmp")
        os.close(fd)
        should_clean_source = True
        with open(source_path, "wb") as f:
            if hasattr(file_path_or_buffer, "read"):
                file_path_or_buffer.seek(0)
                f.write(file_path_or_buffer.read())
            elif isinstance(file_path_or_buffer, bytes):
                f.write(file_path_or_buffer)

    try:
        # Pre-validate audio track and extract lightweight MP3 if needed
        file_size = os.path.getsize(source_path)
        file_ext = Path(source_path).suffix.lower()

        # If it's already an audio file and under 20MB, send directly
        if file_ext in (".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac") and file_size <= 20 * 1024 * 1024:
            file_to_send_path = source_path
        else:
            # Extract to 16kHz mono MP3 to keep payload < 5MB and bypass Groq 25MB limit
            logger.info("Extracting compact MP3 audio for Groq transcription from %s (size %d bytes)...", source_path, file_size)
            temp_mp3_path = extract_audio_to_compact_mp3(source_path)
            file_to_send_path = temp_mp3_path

        send_size = os.path.getsize(file_to_send_path)
        logger.info(
            "Sending %d bytes to Groq Whisper API (model=%s, lang=ja)...",
            send_size,
            chosen_model,
        )

        with open(file_to_send_path, "rb") as audio_file:
            response = requests.post(
                GROQ_TRANSCRIPTION_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                files={
                    "file": (
                        Path(file_to_send_path).name or "audio.mp3",
                        audio_file,
                        "audio/mpeg",
                    )
                },
                data={
                    "model": chosen_model,
                    "response_format": "verbose_json",
                    "language": "ja",
                    "temperature": "0.0",
                },
                timeout=120,
            )

        if response.status_code == 401:
            raise ValueError(
                _("GROQ_API_KEY không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại cấu hình trên Render.")
            )
        elif response.status_code == 413:
            raise ValueError(
                _("Tệp âm thanh tải lên vượt quá giới hạn 25MB của Groq API. Vui lòng cắt ngắn tệp hoặc nén nhỏ hơn.")
            )
        elif response.status_code == 429:
            raise ValueError(
                _("Hệ thống đã đạt giới hạn gọi Groq API trong phút. Vui lòng đợi khoảng 1 phút rồi thử lại.")
            )
        elif response.status_code != 200:
            err_text = response.text[:300]
            try:
                err_json = response.json()
                err_text = err_json.get("error", {}).get("message", err_text)
            except Exception:
                pass
            raise ValueError(
                _("Groq Whisper API trả về lỗi (HTTP %(code)s): %(detail)s")
                % {"code": response.status_code, "detail": err_text}
            )

        data = response.json()
        raw_segments = data.get("segments") or []

        # If verbose_json did not return segments array, synthesize from full text
        if not raw_segments and data.get("text"):
            full_text = str(data["text"]).strip()
            if full_text:
                raw_segments = [
                    {
                        "id": 1,
                        "start": 0.0,
                        "end": float(data.get("duration", 5.0) or 5.0),
                        "text": full_text,
                    }
                ]

        segments = []
        for idx, seg in enumerate(raw_segments):
            text = str(seg.get("text", "")).strip()
            if not text:
                continue
            start = round(float(seg.get("start", 0.0)), 2)
            end = round(max(start + 0.1, float(seg.get("end", start + 1.0))), 2)
            ruby = format_furigana(text)
            words = tokenize_words(text)
            segments.append(
                {
                    "id": idx + 1,
                    "start": start,
                    "end": end,
                    "text": text,
                    "ruby_text": ruby,
                    "meaning": "",
                    "words": words,
                }
            )

        logger.info("Groq transcription successful: %d segments extracted.", len(segments))
        return segments

    finally:
        if temp_mp3_path:
            Path(temp_mp3_path).unlink(missing_ok=True)
        if should_clean_source:
            Path(source_path).unlink(missing_ok=True)
