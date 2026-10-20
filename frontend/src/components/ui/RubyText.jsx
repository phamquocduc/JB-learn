import React from 'react';

const RUBY_PATTERN = /([一-龯々ヶ]+)\s*[（(]([ぁ-んァ-ンー・]+)[）)]/g;

export default function RubyText({ text = '', reading = '', className = '' }) {
  if (!text) return null;

  const matches = Array.from(text.matchAll(RUBY_PATTERN));

  // If explicit reading is provided for a standalone word without inline brackets
  if (reading && matches.length === 0) {
    return (
      <ruby className={`font-jp ${className}`}>
        {text}
        <rt>{reading}</rt>
      </ruby>
    );
  }

  if (matches.length === 0) {
    return <span className={`font-jp ${className}`}>{text}</span>;
  }

  const parts = [];
  let lastIdx = 0;

  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIdx) {
      parts.push(text.slice(lastIdx, matchIndex));
    }
    parts.push(
      <ruby key={`${matchIndex}-${match[1]}`} className="mx-0.5">
        {match[1]}
        <rt>{match[2]}</rt>
      </ruby>
    );
    lastIdx = matchIndex + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return <span className={`font-jp ${className}`}>{parts}</span>;
}
