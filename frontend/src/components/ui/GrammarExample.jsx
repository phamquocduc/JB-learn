import React from 'react';
import RubyText from './RubyText';
import AudioPlayer from './AudioPlayer';

export default function GrammarExample({ example = '', index }) {
  if (!example) return null;

  // Split Japanese sentence and optional Vietnamese translation separated by " - ", " / ", or "→"
  const parts = example.split(/\s+(?:→|—|-)\s+/);
  const japanesePart = parts[0] || example;
  const translationPart = parts.length > 1 ? parts.slice(1).join(' — ') : '';

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
