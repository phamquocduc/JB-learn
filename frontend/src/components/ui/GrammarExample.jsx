import React from 'react';
import RubyText from './RubyText';
import AudioPlayer from './AudioPlayer';

export default function GrammarExample({ example = '', index }) {
  if (!example) return null;

  const cleaned = example.replace(/^VD\d*\s*[:：]\s*/i, '').trim();

  // Split Japanese sentence and optional Vietnamese translation separated by " — ", " - ", "→", or "(...)"
  let japanesePart = cleaned;
  let translationPart = '';

  const parts = cleaned.split(/\s+(?:→|—|-)\s+/);
  if (parts.length > 1) {
    japanesePart = parts[0].trim();
    translationPart = parts.slice(1).join(' — ').replace(/^[（(]|[）)]$/g, '').trim();
  } else {
    const parenMatch = cleaned.match(/^(.+?[。！？!?])\s*[（(](.+)[）)]$/);
    if (parenMatch) {
      japanesePart = parenMatch[1].trim();
      translationPart = parenMatch[2].trim();
    }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="text-slate-900 text-sm sm:text-base leading-relaxed font-jp">
          {typeof index === 'number' && (
            <strong className="text-sky-700 mr-1.5 font-sans">
              {index + 1}.
            </strong>
          )}
          <RubyText text={japanesePart} />
        </div>
        <AudioPlayer text={japanesePart} compact />
      </div>

      {translationPart && (
        <div className="text-xs sm:text-sm text-slate-600 pl-4 border-l-2 border-sky-200">
          {translationPart}
        </div>
      )}
    </div>
  );
}
