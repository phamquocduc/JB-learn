import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayIcon,
  ClockIcon,
  AcademicCapIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { getLastShadowingSession } from '../../services/shadowingProgress';

/**
 * ShadowingResumeHero
 * Prominent hero card allowing both Guests and Authenticated Users (via currentUser)
 * to immediately resume practicing at the exact video and sentence where they left off,
 * while housing the primary page actions ("Thêm Video / Audio" & mobile sidebar trigger).
 */
export default function ShadowingResumeHero({
  currentUser = null,
  fallbackVideo = null,
  onOpenAddVideo,
  onOpenSidebar,
}) {
  const navigate = useNavigate();
  const session = getLastShadowingSession(currentUser);

  const hasSavedSession = Boolean(session && session.videoId);
  const targetVideoId = hasSavedSession ? session.videoId : fallbackVideo?.id;

  const segmentNum = hasSavedSession ? (session.segmentIndex ?? 0) + 1 : 1;
  const videoTitle = hasSavedSession
    ? session.videoTitle || 'Bài luyện Shadowing gần nhất'
    : fallbackVideo?.title || 'Chưa có bài học Shadowing';
  const level = hasSavedSession
    ? session.level || 'N3'
    : fallbackVideo?.level || 'N3';
  const mode = hasSavedSession ? session.mode || 'Shadowing' : 'Shadowing';

  const handleResume = () => {
    if (!targetVideoId) {
      onOpenAddVideo?.();
      return;
    }
    const params = new URLSearchParams();
    if (hasSavedSession && session.mode) params.append('mode', session.mode);
    if (hasSavedSession && session.segmentIndex !== undefined) {
      params.append('seg', String(session.segmentIndex));
    }
    navigate(
      `/shadowing/${targetVideoId}${params.toString() ? `?${params.toString()}` : ''}`
    );
  };

  return (
    <Card
      rounded="2xl"
      className="p-4 sm:p-5 flex flex-col gap-3.5 bg-white border border-sky-200/90 shadow-sm"
    >
      {/* Top Meta & Action Line */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2 w-2 rounded-full bg-sky-600 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-sky-800 uppercase tracking-wider truncate">
            Tiếp tục tiến độ học tập
          </span>
          {targetVideoId && (
            <div className="hidden sm:flex items-center gap-1.5 ml-1 shrink-0">
              <Badge variant="level">{level}</Badge>
              <Badge variant="secondary">{mode}</Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenAddVideo && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenAddVideo}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-semibold"
            >
              <PlusIcon className="w-4 h-4" aria-hidden="true" />
              <span>Thêm Video / Audio</span>
            </Button>
          )}

          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              aria-label="Mở menu điều hướng"
              className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shrink-0">
          <PlayIcon className="w-7 h-7" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
            {videoTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-slate-500 font-medium">
            {targetVideoId && (
              <span className="inline-flex sm:hidden items-center gap-1">
                <Badge variant="level">{level}</Badge>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <AcademicCapIcon className="w-3.5 h-3.5" aria-hidden="true" />
              Đoạn số {segmentNum}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {hasSavedSession ? 'Đang học dở' : 'Sẵn sàng luyện tập'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Resume CTA */}
      <Button
        variant="primary"
        size="lg"
        onClick={handleResume}
        className="w-full justify-center text-sm sm:text-base font-bold shadow-sm"
      >
        <PlayIcon className="w-5 h-5" aria-hidden="true" />
        <span>Tiếp tục Shadowing</span>
      </Button>
    </Card>
  );
}
