import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayIcon,
  ClockIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { getLastShadowingSession } from '../../services/shadowingProgress';

/**
 * ShadowingResumeHero
 * Prominent hero card allowing both Guests and Authenticated Users (via currentUser)
 * to immediately resume practicing at the exact video and sentence where they left off.
 */
export default function ShadowingResumeHero({ currentUser = null }) {
  const navigate = useNavigate();
  const session = getLastShadowingSession(currentUser);

  if (!session || !session.videoId) {
    return null;
  }

  const segmentNum = (session.segmentIndex ?? 0) + 1;
  const videoTitle = session.videoTitle || 'Bài luyện Shadowing gần nhất';
  const level = session.level || 'N3';
  const mode = session.mode || 'Shadowing';

  const handleResume = () => {
    const params = new URLSearchParams();
    if (session.mode) params.append('mode', session.mode);
    if (session.segmentIndex !== undefined) {
      params.append('seg', String(session.segmentIndex));
    }
    navigate(`/shadowing/${session.videoId}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <Card
      rounded="2xl"
      className="p-4 sm:p-5 flex flex-col gap-3.5 bg-white border border-sky-200/90 shadow-sm"
    >
      {/* Top Meta Line */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-sky-600 animate-pulse" />
          <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">
            Tiếp tục tiến độ học tập
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="level">{level}</Badge>
          <Badge variant="secondary">{mode}</Badge>
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
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1">
              <AcademicCapIcon className="w-3.5 h-3.5" aria-hidden="true" />
              Đoạn số {segmentNum}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" aria-hidden="true" />
              Đang học dở
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
