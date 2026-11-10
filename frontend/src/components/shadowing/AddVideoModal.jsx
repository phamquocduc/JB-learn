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
import Dropdown from '../ui/Dropdown';
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
    if (isExtracting || isSubmitting) return;
    resetForm();
    onClose?.();
  };

  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.defaultPrevented ||
        document.querySelector('[data-dropdown-open="true"]')
      ) {
        return;
      }
      if (e.key === 'Escape' && isOpen && !isExtracting && !isSubmitting) {
        resetForm();
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
        err.message || 'Quá trình trích xuất phụ đề tự động gặp lỗi.'
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
      resetForm();
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 animate-backdrop-in"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[92dvh] sm:max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-lg flex flex-col animate-popup-in"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-b border-slate-200 rounded-t-2xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <VideoCameraIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2
              id="add-video-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 truncate"
            >
              Thêm bài học Shadowing mới
            </h2>
          </div>
          <Button
            variant="secondary"
            size="icon"
            disabled={isExtracting || isSubmitting}
            onClick={handleClose}
            aria-label="Đóng biểu mẫu"
            className="shrink-0"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto flex flex-col gap-4">
          {/* Source Switcher Tabs */}
          <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setSourceType('youtube');
                setExtractedData(null);
              }}
              className={`flex-1 min-h-9 flex items-center justify-center gap-2 rounded-md text-xs sm:text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                sourceType === 'youtube'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <YouTubeLogoSvg className="w-4 h-4 text-red-600" />
              <span>Đường dẫn YouTube</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceType('upload');
                setExtractedData(null);
              }}
              className={`flex-1 min-h-9 flex items-center justify-center gap-2 rounded-md text-xs sm:text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                sourceType === 'upload'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
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
              className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs sm:text-sm text-red-800"
            >
              <ExclamationCircleIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Step 1: Input & Extract */}
          <form onSubmit={handleExtractTranscript} className="flex flex-col gap-4">
            {sourceType === 'youtube' ? (
              <div>
                <label
                  htmlFor="youtube-url-input"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Đường dẫn video YouTube
                </label>
                <input
                  id="youtube-url-input"
                  name="youtube_url"
                  type="url"
                  required
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    if (extractedData) setExtractedData(null);
                  }}
                  className="w-full min-h-10 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm transition-colors duration-150 focus:bg-white focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="media-file-input"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Tệp âm thanh hoặc video
                </label>
                <input
                  id="media-file-input"
                  name="media_file"
                  type="file"
                  accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a"
                  required
                  onChange={(e) => {
                    setMediaFile(e.target.files[0] || null);
                    if (extractedData) setExtractedData(null);
                  }}
                  className="w-full min-h-10 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
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
            <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>
                  Đã trích xuất {extractedData.total_segments ?? extractedData.segments?.length ?? 0} câu phụ đề & {extractedData.total_exercises ?? extractedData.exercises?.length ?? 0} bài tập
                </span>
              </div>

              {/* Video Title */}
              <div>
                <label
                  htmlFor="video-title-input"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Tiêu đề bài học *
                </label>
                <input
                  id="video-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full min-h-10 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
              </div>

              {/* Topic & Level Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="topic-select"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Chủ đề
                  </label>
                  <Dropdown
                    id="topic-select"
                    value={topic}
                    onChange={setTopic}
                    options={TOPIC_CHOICES}
                    triggerClassName="bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="level-select"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Trình độ JLPT
                  </label>
                  <Dropdown
                    id="level-select"
                    value={level}
                    onChange={setLevel}
                    options={LEVEL_CHOICES}
                    triggerClassName="bg-white"
                  />
                </div>
              </div>

              {/* Public/Private toggle if authenticated */}
              {currentUser && (
                <div>
                  <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quyền hiển thị
                  </span>
                  <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-1 gap-1">
                    <button
                      type="button"
                      aria-pressed={Boolean(isPublic)}
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 min-h-9 text-xs sm:text-sm font-semibold rounded-md transition-colors duration-150 cursor-pointer ${
                        isPublic
                          ? 'bg-sky-700 text-white shadow-sm'
                          : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      Công khai
                    </button>
                    <button
                      type="button"
                      aria-pressed={!isPublic}
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 min-h-9 text-xs sm:text-sm font-semibold rounded-md transition-colors duration-150 cursor-pointer ${
                        !isPublic
                          ? 'bg-sky-700 text-white shadow-sm'
                          : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      Riêng tư
                    </button>
                  </div>
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
    </div>
  );
}
