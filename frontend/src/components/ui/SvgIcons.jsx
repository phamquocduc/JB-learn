import React from 'react';

export function BotanicalLeavesSvg({ className = 'w-10 h-12 text-sky-600' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M22 44C22 44 6 32 8 14C10 4 20 8 22 24C24 40 22 44 22 44Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      <path
        d="M24 44C24 44 36 30 32 16C29 6 21 14 22 28"
        fill="#0284c7"
        fillOpacity="0.55"
      />
    </svg>
  );
}

export function MountFujiSvg({ className = 'w-full h-16 text-sky-600' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 144 64"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 64L38 26L56 18L74 18L92 26L144 64H0Z"
        fill="#38bdf8"
        fillOpacity="0.35"
      />
      <path d="M16 64L54 20H82L128 64H16Z" fill="#0284c7" />
      <path
        d="M54 20H82L88 28L76 26L68 31L60 26L48 28L54 20Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function JlptStepsCloudsSvg({ className = 'w-full h-full' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 260 200"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 175C35 140 65 135 95 145C120 110 165 105 195 125C218 118 240 132 250 155V190H15V175Z"
        fill="#e0f2fe"
      />
      <path
        d="M35 190C58 158 95 152 130 162C158 135 205 135 235 165V190H35Z"
        fill="#bae6fd"
        fillOpacity="0.65"
      />
      <path
        d="M52 188C58 164 82 156 108 146C128 138 116 118 138 108C156 100 152 82 168 72"
        stroke="#ffffff"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect x="136" y="68" width="44" height="8" rx="4" fill="#bae6fd" />
      <rect x="122" y="96" width="40" height="8" rx="4" fill="#bae6fd" />
      <rect x="102" y="126" width="44" height="8" rx="4" fill="#bae6fd" />
      <rect x="78" y="156" width="48" height="8" rx="4" fill="#bae6fd" />
    </svg>
  );
}

export function GoogleLogoSvg({ className = 'w-4 h-4 shrink-0' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path
        fill="#34A853"
        d="M3.6 7.4l3.2 2.4C7.7 7.5 9.7 5.9 12 5.9c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 8.3 2.5 5.1 4.6 3.6 7.4z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.5c2.5 0 4.7-.8 6.3-2.3l-2.9-2.4c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1l-3.2 2.5c1.5 3.1 4.9 5.3 8.8 5.3z"
      />
      <path
        fill="#4285F4"
        d="M21.1 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.3-1 2.4-2.1 3.1l2.9 2.4c1.7-1.6 2.8-4 2.8-7.8z"
      />
    </svg>
  );
}

export function AppleLogoSvg({
  className = 'w-4 h-4 shrink-0 text-slate-900',
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
    </svg>
  );
}

export function YouTubeLogoSvg({ className = 'w-5 h-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function BilingualIconSvg({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 18h4" />
      <path d="M4 14h4" />
      <path d="M3.5 18 6 6l2.5 12" />
      <path d="M14 6h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4V6z" />
      <path d="M14 12h4.5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H14v-6z" />
    </svg>
  );
}

