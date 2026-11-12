import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
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
  { value: 'life', labelKey: 'shadowing:topics.life' },
  { value: 'conversation', labelKey: 'shadowing:topics.conversation' },
  { value: 'business', labelKey: 'shadowing:topics.business' },
  { value: 'news', labelKey: 'shadowing:topics.news' },
  { value: 'culture', labelKey: 'shadowing:topics.culture' },
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
  const { t } = useTranslation(['shadowing', 'common']);
  const [sourceType, setSourceType] = useState('youtube'); // 'youtube' | 'upload'
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [contentLang, setContentLang] = useState('vi'); // 'vi' | 'en'
  const [title, setTitle] = useState('');
  const [enTitle, setEnTitle] = useState('');
  const [topic, setTopic] = useState('life');
  const [level, setLevel] = useState('N3');
  const [isPublic, setIsPublic] = useState(true);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const topicOptions = TOPIC_CHOICES.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const resetForm = () => {
    setYoutubeUrl('');
    setMediaFile(null);
    setContentLang('vi');
    setTitle('');
    setEnTitle('');
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
          throw new Error(t('shadowing:addVideoModal.errors.missingYoutubeUrl'));
        }
        payload = {
          source_type: 'youtube',
          youtube_url: youtubeUrl.trim(),
        };
      } else {
        if (!mediaFile) {
          throw new Error(t('shadowing:addVideoModal.errors.missingMediaFile'));
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
        err.message || t('shadowing:addVideoModal.errors.extractFailed')
      );
    } finally {
      setIsExtracting(false);
    }
  };

  // Step 2: Final video creation
  const handleCreateVideo = async () => {
    if (!title.trim()) {
      setContentLang('vi');
      setErrorMessage(t('shadowing:addVideoModal.errors.missingTitle'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const normalizedExercises = (extractedData?.exercises || []).map((ex) => ({
        ...ex,
        options: Array.isArray(ex.options) ? ex.options.slice(0, 6) : [],
      }));
      const translationsPayload = enTitle.trim()
        ? { en: { title: enTitle.trim() } }
        : null;

      let payload;
      if (sourceType === 'youtube') {
        payload = {
          title: title.trim(),
          ...(translationsPayload ? { translations: translationsPayload } : {}),
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
        if (translationsPayload) {
          formData.append('translations', JSON.stringify(translationsPayload));
        }
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
      setErrorMessage(err.message || t('shadowing:addVideoModal.errors.createFailed'));
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
        className="w-full sm:max-w-xl max-h-[92dvh] sm:max-h-[90vh] bg-white rounded-t-surface sm:rounded-surface border-t sm:border border-slate-200 shadow-sm flex flex-col animate-popup-in"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 rounded-t-surface flex items-center justify-between gap-2">
          <h2
            id="add-video-modal-title"
            className="text-sm sm:text-base font-semibold text-slate-900 truncate"
          >
            {t('shadowing:addVideoModal.title')}
          </h2>
          <Button
            variant="secondary"
            size="icon"
            disabled={isExtracting || isSubmitting}
            onClick={handleClose}
            aria-label={t('shadowing:addVideoModal.closeAria')}
            className="shrink-0"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto flex flex-col gap-4">
          {/* Source Switcher Tabs */}
          <div className="flex bg-slate-100 border border-slate-200 rounded-control p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setSourceType('youtube');
                setExtractedData(null);
              }}
              className={`flex-1 min-h-9 flex items-center justify-center gap-2 rounded-control text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer ${
                sourceType === 'youtube'
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <YouTubeLogoSvg className="w-4 h-4 text-red-600" />
              <span>{t('shadowing:addVideoModal.youtubeTab')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceType('upload');
                setExtractedData(null);
              }}
              className={`flex-1 min-h-9 flex items-center justify-center gap-2 rounded-control text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer ${
                sourceType === 'upload'
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <ArrowUpTrayIcon className="w-4 h-4 text-sky-700" aria-hidden="true" />
              <span>{t('shadowing:addVideoModal.uploadTab')}</span>
            </button>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-control flex items-start gap-2.5 text-xs sm:text-sm text-red-800"
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
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t('shadowing:addVideoModal.youtubeUrlLabel')}
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
                  className="w-full min-h-10 px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="media-file-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t('shadowing:addVideoModal.mediaFileLabel')}
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
                  className="w-full min-h-10 px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-sm text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-control file:border-0 file:text-xs file:font-medium file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
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
                    ? t('shadowing:addVideoModal.extracting')
                    : t('shadowing:addVideoModal.extractAction')}
                </span>
              </Button>
            )}
          </form>

          {/* Step 2: Extracted preview & metadata */}
          {extractedData && (
            <div className="flex flex-col gap-4 p-4 rounded-surface bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 tabular-nums">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>
                  {t('shadowing:addVideoModal.extractedSummary', {
                    segments:
                      extractedData.total_segments ?? extractedData.segments?.length ?? 0,
                    exercises:
                      extractedData.total_exercises ?? extractedData.exercises?.length ?? 0,
                  })}
                </span>
              </div>

              {/* Bilingual Title Language Tabs */}
              <div
                role="tablist"
                aria-label={t('common:contentForm.languageTabsAria')}
                className="grid grid-cols-2 bg-white border border-slate-200 rounded-control p-1 gap-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentLang === 'vi'}
                  onClick={() => setContentLang('vi')}
                  className={`h-8 rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    contentLang === 'vi'
                      ? 'bg-sky-700 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {t('common:contentForm.viTab')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentLang === 'en'}
                  onClick={() => setContentLang('en')}
                  className={`h-8 rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    contentLang === 'en'
                      ? 'bg-sky-700 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {t('common:contentForm.enTab')}
                </button>
              </div>

              {/* Video Title */}
              {contentLang === 'vi' ? (
                <div>
                  <label
                    htmlFor="video-title-input"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('shadowing:addVideoModal.titleLabel')}
                  </label>
                  <input
                    id="video-title-input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full min-h-10 px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="video-title-en-input"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('shadowing:addVideoModal.titleEnLabel')}
                  </label>
                  <input
                    id="video-title-en-input"
                    type="text"
                    value={enTitle}
                    onChange={(e) => setEnTitle(e.target.value)}
                    placeholder={t('shadowing:addVideoModal.titleEnPlaceholder')}
                    className="w-full min-h-10 px-3.5 py-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                  />
                </div>
              )}

              {/* Topic & Level Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="topic-select"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('shadowing:addVideoModal.topicLabel')}
                  </label>
                  <Dropdown
                    id="topic-select"
                    value={topic}
                    onChange={setTopic}
                    options={topicOptions}
                  />
                </div>

                <div>
                  <label
                    htmlFor="level-select"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {t('shadowing:addVideoModal.levelLabel')}
                  </label>
                  <Dropdown
                    id="level-select"
                    value={level}
                    onChange={setLevel}
                    options={LEVEL_CHOICES}
                  />
                </div>
              </div>

              {/* Public/Private toggle if authenticated */}
              {currentUser && (
                <div>
                  <span className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t('shadowing:addVideoModal.visibilityLabel')}
                  </span>
                  <div className="flex bg-slate-100 border border-slate-200 rounded-control p-1 gap-1">
                    <button
                      type="button"
                      aria-pressed={Boolean(isPublic)}
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 min-h-9 text-xs sm:text-sm font-medium rounded-control transition-colors duration-150 cursor-pointer ${
                        isPublic
                          ? 'bg-sky-700 text-white'
                          : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {t('shadowing:addVideoModal.publicOption')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={!isPublic}
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 min-h-9 text-xs sm:text-sm font-medium rounded-control transition-colors duration-150 cursor-pointer ${
                        !isPublic
                          ? 'bg-sky-700 text-white'
                          : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {t('shadowing:addVideoModal.privateOption')}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Action */}
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                onClick={handleCreateVideo}
                className="justify-center mt-1"
              >
                <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
                <span>
                  {isSubmitting
                    ? t('shadowing:addVideoModal.submitting')
                    : t('shadowing:addVideoModal.submitAction')}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
