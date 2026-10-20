import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  VideoCameraIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import { YouTubeLogoSvg } from '../ui/SvgIcons';
import { extractTranscript, createShadowingVideo } from '../../services/shadowingApi';

const TOPIC_CHOICES = [
  { value: 'life', label: 'Đời sống' },
  { value: 'conversation', label: 'Hội thoại' },
  { value: 'business', label: 'Công việc' },
  { value: 'news', label: 'Tin tức' },
  { value: 'culture', label: 'Văn hóa' },
];

const LEVEL_CHOICES = ['N5', 'N4', 'N3', 'N2', 'N1'];

/**
 * AddVideoModal
 * Modal supporting both YouTube URL transcript extraction and
 * offline faster-whisper transcription from uploaded audio/video files.
 */
export default function AddVideoModal({
  isOpen,
  onClose,
  onSuccess,
  currentUser = null,
}) {
  const [sourceType, setSourceType] = useState('youtube'); // 'youtube' | 'upload'
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('life');
  const [level, setLevel] = useState('N3');
  const [isPublic, setIsPublic] = useState(true);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resetForm = () => {
    setYoutubeUrl('');
    setMediaFile(null);
    setTitle('');
    setTopic('life');
    setLevel('N3');
    setIsPublic(true);
    setExtractedData(null);
    setErrorMessage('');
    setIsExtracting(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isExtracting && !isSubmitting) {
        onClose?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExtracting, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Step 1: Automatic transcript extraction
  const handleExtractTranscript = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsExtracting(true);

    try {
      let payload;
      if (sourceType === 'youtube') {
        if (!youtubeUrl.trim()) {
          throw new Error('Vui lòng nhập đường dẫn YouTube.');
        }
        payload = {
          source_type: 'youtube',
          youtube_url: youtubeUrl.trim(),
        };
      } else {
        if (!mediaFile) {
          throw new Error('Vui lòng chọn tệp âm thanh hoặc video để tải lên.');
        }
        const formData = new FormData();
        formData.append('media_file', mediaFile);
        formData.append('source_type', 'upload');
        payload = formData;
      }

      // Explicitly calls extract_transcript endpoint
      const result = await extractTranscript(payload);
      setExtractedData(result);

      if (!title && sourceType === 'upload' && mediaFile) {
        setTitle(mediaFile.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Quá trình trích xuất phụ đề tự động (extract_transcript) gặp lỗi.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  // Step 2: Final video creation
  const handleCreateVideo = async () => {
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề cho bài học Shadowing.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const normalizedExercises = (extractedData?.exercises || []).map((ex) => ({
        ...ex,
        options: Array.isArray(ex.options) ? ex.options.slice(0, 6) : [],
      }));

      let payload;
      if (sourceType === 'youtube') {
        payload = {
          title: title.trim(),
          topic,
          level,
          media_source: 'youtube',
          youtube_url: youtubeUrl.trim(),
          youtube_id: extractedData?.youtube_id || '',
          duration_seconds: extractedData?.duration_seconds || 0,
          is_public: isPublic,
          segments: extractedData?.segments || [],
          exercises: normalizedExercises,
        };
      } else {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('topic', topic);
        formData.append('level', level);
        formData.append('media_source', 'upload');
        formData.append('media_file', mediaFile);
        formData.append('is_public', isPublic ? 'true' : 'false');
        if (extractedData?.duration_seconds) {
          formData.append('duration_seconds', String(extractedData.duration_seconds));
        }
        if (extractedData?.segments) {
          formData.append('segments', JSON.stringify(extractedData.segments));
        }
        formData.append('exercises', JSON.stringify(normalizedExercises));
        payload = formData;
      }

      const created = await createShadowingVideo(payload);
      onSuccess?.(created);
      onClose?.();
    } catch (err) {
      setErrorMessage(err.message || 'Không thể tạo video bài học.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-video-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-lg flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <VideoCameraIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2
              id="add-video-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 leading-snug"
            >
              Thêm bài học Shadowing mới
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng cửa sổ"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Source Switcher Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setSourceType('youtube');
              setExtractedData(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              sourceType === 'youtube'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <YouTubeLogoSvg className="w-4 h-4 text-red-600" />
            <span>YouTube URL</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceType('upload');
              setExtractedData(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              sourceType === 'upload'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpTrayIcon className="w-4 h-4 text-sky-700" aria-hidden="true" />
            <span>Tải tệp lên</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800"
          >
            <ExclamationCircleIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Step 1: Input & Extract */}
        <form onSubmit={handleExtractTranscript} className="flex flex-col gap-4">
          {sourceType === 'youtube' ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="youtube-url-input" className="text-xs font-bold text-slate-700">
                Đường dẫn video YouTube
              </label>
              <input
                id="youtube-url-input"
                name="youtube_url"
                type="url"
                required
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-sky-600"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="media-file-input" className="text-xs font-bold text-slate-700">
                Tệp âm thanh hoặc video
              </label>
              <input
                id="media-file-input"
                name="media_file"
                type="file"
                accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a"
                required
                onChange={(e) => setMediaFile(e.target.files[0] || null)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
              />
            </div>
          )}

          {!extractedData && (
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isExtracting}
              className="justify-center"
            >
              <SparklesIcon className="w-4 h-4" aria-hidden="true" />
              <span>
                {isExtracting
                  ? 'Đang trích xuất phụ đề...'
                  : 'Trích xuất phụ đề tự động'}
              </span>
            </Button>
          )}
        </form>

        {/* Step 2: Extracted preview & metadata */}
        {extractedData && (
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>
                Đã trích xuất {extractedData.total_segments ?? extractedData.segments?.length ?? 0} câu phụ đề & {extractedData.total_exercises ?? extractedData.exercises?.length ?? 0} bài tập
              </span>
            </div>

            {/* Video Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="video-title-input" className="text-xs font-bold text-slate-700">
                Tiêu đề bài học
              </label>
              <input
                id="video-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề tiếng Nhật hoặc tiếng Việt..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-2 focus:outline-sky-600 bg-white"
              />
            </div>

            {/* Topic & Level Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="topic-select" className="text-xs font-bold text-slate-700">
                  Chủ đề
                </label>
                <select
                  id="topic-select"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-2 focus:outline-sky-600 cursor-pointer"
                >
                  {TOPIC_CHOICES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="level-select" className="text-xs font-bold text-slate-700">
                  Trình độ
                </label>
                <select
                  id="level-select"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-2 focus:outline-sky-600 cursor-pointer"
                >
                  {LEVEL_CHOICES.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Public/Private toggle if authenticated */}
            {currentUser && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="is-public-toggle"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <label htmlFor="is-public-toggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Công khai cho mọi người cùng học
                </label>
              </div>
            )}

            {/* Submit Action */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              onClick={handleCreateVideo}
              className="justify-center font-bold mt-1"
            >
              <CheckCircleIcon className="w-5 h-5" aria-hidden="true" />
              <span>{isSubmitting ? 'Đang lưu bài học...' : 'Lưu và bắt đầu học ngay'}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
