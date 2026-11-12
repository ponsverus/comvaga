import { useEffect, useState } from 'react';

export default function DashboardAnnouncementBar({ announcements }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = announcements.length;

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % count);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  const announcement = announcements[activeIndex % count];
  if (!announcement) return null;
  const toneClass = announcement.tone === 'danger'
    ? 'border-red-500/30 bg-[#1a0b0b] text-red-100'
    : announcement.id === 'clock'
      ? 'border-primary/25 bg-[#151106] text-white'
      : 'border-primary/25 bg-[#151106] text-primary';
  const actionLabel = announcement.actionLabel || 'VER PLANOS';
  const canAct = typeof announcement.onAction === 'function' && !announcement.hideAction;

  return (
    <div
      role={count === 1 && announcement.id === 'clock' ? 'alert' : undefined}
      className={`border-b ${toneClass}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-xs sm:text-sm font-normal">
        <div className="flex flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
          <span>{announcement.text}</span>
          {canAct ? (
            <button
              type="button"
              onClick={announcement.onAction}
              disabled={announcement.actionLoading}
              className="inline-flex items-center justify-center font-normal uppercase text-primary transition-colors hover:text-primary/80 disabled:cursor-wait disabled:opacity-60"
            >
              {announcement.actionLoading ? 'VERIFICANDO...' : actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
