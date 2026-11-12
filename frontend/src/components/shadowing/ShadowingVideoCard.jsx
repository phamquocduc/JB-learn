import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlayIcon } from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { YouTubeLogoSvg } from '../ui/SvgIcons';
import { formatNumber } from '../../utils/formatters';

const TOPIC_LABEL_KEYS = {
  life: 'shadowing:topics.life',
  conversation: 'shadowing:topics.conversation',
  business: 'shadowing:topics.business',
  news: 'shadowing:topics.news',
  culture: 'shadowing:topics.culture',
};

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * ShadowingVideoCard
 * Responsive video card representing a shadowing study session
 * with thumbnail, title, level/topic badges, segment count, duration, and progress bar.
 */
export default function ShadowingVideoCard({
  video,
  studiedSegmentsCount = 0,
}) {
  const { t } = useTranslation('shadowing');
  if (!video) return null;

  const totalSegments = video.total_segments || video.segments?.length || 0;
  const progressPercent =
    totalSegments > 0
      ? Math.min(100, Math.round((studiedSegmentsCount / totalSegments) * 100))
      : 0;

  const topicLabel = TOPIC_LABEL_KEYS[video.topic]
    ? t(TOPIC_LABEL_KEYS[video.topic])
    : video.topic || t('shadowing:topics.general');
  const isYouTube = video.media_source === 'youtube' || Boolean(video.youtube_id);
  const thumbnailUrl = video.youtube_id
    ? `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`
    : video.thumbnail_url || null;

  return (
    <Link
      to={`/shadowing/${video.id}`}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-surface"
    >
      <Card className="overflow-hidden flex flex-col h-full group-hover:border-sky-300 transition-colors duration-150">
        {/* Thumbnail Stage (16:9) */}
        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
              <PlayIcon className="w-5 h-5 text-slate-500" aria-hidden="true" />
            </div>
          )}

          {/* Source Badge (top right) */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-slate-900/85 text-white text-[11px] px-2 py-0.5 rounded-badge font-medium">
            {isYouTube ? (
              <>
                <YouTubeLogoSvg className="w-4 h-4 text-red-500" />
                <span>YouTube</span>
              </>
            ) : (
              <span>{t('sources.upload')}</span>
            )}
          </div>

          {/* Duration Badge (bottom right) */}
          {(video.duration_seconds || video.duration) > 0 && (
            <div className="absolute bottom-2 right-2 z-10 bg-slate-900/85 text-white text-[11px] px-2 py-0.5 rounded-badge font-medium tabular-nums">
              {formatDuration(video.duration_seconds || video.duration)}
            </div>
          )}

          {/* Hover Play Overlay */}
          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-sky-700 text-white flex items-center justify-center">
              <PlayIcon className="w-5 h-5 ml-0.5" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div className="flex flex-col gap-2">
            {/* Level & Topic Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="level">{video.level || 'N3'}</Badge>
              <Badge variant="secondary">{topicLabel}</Badge>
            </div>

            {/* Video Title */}
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-2 leading-snug">
              {video.title}
            </h3>
          </div>

          {/* Bottom Stats & Progress */}
          <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-100 mt-auto">
            <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
              <span>
                {t('videoCard.segmentsCount', {
                  count: formatNumber(totalSegments),
                })}
              </span>
              {progressPercent > 0 ? (
                <span className="text-sky-700 font-medium">
                  {progressPercent}%
                </span>
              ) : (
                <span className="text-slate-400">
                  {t('videoCard.notPracticed')}
                </span>
              )}
            </div>

            <div
              className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('videoCard.progressAria', {
                percent: progressPercent,
              })}
            >
              <div
                className="h-full bg-sky-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
