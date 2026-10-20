import React from 'react';
import { Link } from 'react-router-dom';
import {
  PlayIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { YouTubeLogoSvg } from '../ui/SvgIcons';

const TOPIC_LABELS = {
  life: 'Đời sống',
  conversation: 'Hội thoại',
  business: 'Công việc',
  news: 'Tin tức',
  culture: 'Văn hóa',
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
  if (!video) return null;

  const totalSegments = video.total_segments || video.segments?.length || 0;
  const progressPercent =
    totalSegments > 0
      ? Math.min(100, Math.round((studiedSegmentsCount / totalSegments) * 100))
      : 0;

  const topicLabel = TOPIC_LABELS[video.topic] || video.topic || 'Chủ đề chung';
  const isYouTube = video.media_source === 'youtube' || Boolean(video.youtube_id);
  const thumbnailUrl = video.youtube_id
    ? `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`
    : video.thumbnail_url || null;

  return (
    <Link
      to={`/shadowing/${video.id}`}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 rounded-2xl"
    >
      <Card
        rounded="2xl"
        className="overflow-hidden flex flex-col h-full bg-white border border-slate-200 group-hover:border-sky-300 transition-colors duration-150 shadow-sm"
      >
        {/* Thumbnail Stage (16:9) */}
        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
              <PlayIcon className="w-12 h-12 text-slate-500" aria-hidden="true" />
            </div>
          )}

          {/* Source Badge (top right) */}
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-slate-900/80 backdrop-blur-xs text-white text-xs px-2 py-0.5 rounded-md font-medium">
            {isYouTube ? (
              <>
                <YouTubeLogoSvg className="w-3.5 h-3.5 text-red-500" />
                <span>YouTube</span>
              </>
            ) : (
              <span>File tải lên</span>
            )}
          </div>

          {/* Duration Badge (bottom right) */}
          {(video.duration_seconds || video.duration) > 0 && (
            <div className="absolute bottom-2.5 right-2.5 z-10 bg-slate-900/80 text-white text-xs px-2 py-0.5 rounded font-mono font-medium">
              {formatDuration(video.duration_seconds || video.duration)}
            </div>
          )}

          {/* Hover Play Overlay */}
          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-md">
              <PlayIcon className="w-6 h-6 ml-0.5" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div className="flex flex-col gap-2">
            {/* Level & Topic Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="level">{video.level || 'N3'}</Badge>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {topicLabel}
              </span>
            </div>

            {/* Video Title */}
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-2 leading-snug">
              {video.title}
            </h3>
          </div>

          {/* Bottom Stats & Progress */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 mt-auto">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1">
                <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {totalSegments} câu
              </span>
              {progressPercent > 0 ? (
                <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                  <CheckCircleIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  {progressPercent}%
                </span>
              ) : (
                <span className="text-slate-400">Chưa luyện</span>
              )}
            </div>

            <ProgressBar value={progressPercent} max={100} className="h-1.5" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
