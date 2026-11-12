import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlayIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { getLastShadowingSession } from '../../services/shadowingProgress';
import { formatNumber } from '../../utils/formatters';

const MODE_LABEL_KEYS = {
  Shadowing: 'shadowing:modes.shadowing',
  'Phát âm': 'shadowing:modes.pronunciation',
  'Luyện nghe': 'shadowing:modes.listening',
  'Bài tập': 'shadowing:modes.exercise',
};

/**
 * ShadowingResumeHero
 * Prominent hero card allowing both Guests and Authenticated Users (via currentUser)
 * to immediately resume practicing at the exact video and sentence where they left off,
 * while housing the primary page actions & mobile sidebar trigger.
 */
export default function ShadowingResumeHero({
  currentUser = null,
  fallbackVideo = null,
  onOpenAddVideo,
  onOpenSidebar,
}) {
  const { t } = useTranslation(['shadowing', 'common']);
  const navigate = useNavigate();
  const session = getLastShadowingSession(currentUser);

  const hasSavedSession = Boolean(session && session.videoId);
  const targetVideoId = hasSavedSession ? session.videoId : fallbackVideo?.id;

  const segmentNum = hasSavedSession ? (session.segmentIndex ?? 0) + 1 : 1;
  const videoTitle = hasSavedSession
    ? (fallbackVideo && String(fallbackVideo.id) === String(session.videoId)
        ? fallbackVideo.title
        : session.videoTitle) || t('shadowing:hero.latestFallback')
    : fallbackVideo?.title || t('shadowing:hero.emptyTitle');
  const level = hasSavedSession
    ? session.level || 'N3'
    : fallbackVideo?.level || 'N3';
  const mode = hasSavedSession ? session.mode || 'Shadowing' : 'Shadowing';
  const modeLabel = t(MODE_LABEL_KEYS[mode] || 'shadowing:modes.shadowing');

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
    <Card className="p-4 sm:p-5 flex flex-col gap-3.5 border-sky-200">
      {/* Top Meta & Action Line */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2 w-2 rounded-full bg-sky-600 shrink-0" />
          <span className="text-xs font-semibold text-sky-800 truncate">
            {t('shadowing:hero.continueHeading')}
          </span>
          {targetVideoId && (
            <div className="hidden sm:flex items-center gap-1.5 ml-1 shrink-0">
              <Badge variant="level">{level}</Badge>
              <Badge variant="secondary">{modeLabel}</Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenAddVideo && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenAddVideo}
              aria-label={t('shadowing:hero.addAria')}
            >
              <PlusIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="sm:hidden">{t('shadowing:hero.addShort')}</span>
              <span className="hidden sm:inline">{t('shadowing:hero.addFull')}</span>
            </Button>
          )}

          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              aria-label={t('common:nav.openMenu')}
              className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-control border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div className="w-12 h-12 rounded-surface bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
          <PlayIcon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 line-clamp-2 sm:truncate leading-snug">
            {videoTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
            {targetVideoId && (
              <span className="inline-flex sm:hidden items-center">
                <Badge variant="level">{level}</Badge>
              </span>
            )}
            <span>
              {t('shadowing:hero.segmentStatus', {
                num: formatNumber(segmentNum),
                status: hasSavedSession
                  ? t('shadowing:hero.inProgress')
                  : t('shadowing:hero.ready'),
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Resume CTA */}
      <Button
        variant="primary"
        size="md"
        onClick={handleResume}
        className="w-full justify-center"
      >
        <span>{t('shadowing:hero.resumeCta')}</span>
      </Button>
    </Card>
  );
}
