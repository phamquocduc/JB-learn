import React from 'react';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import RubyText from './ui/RubyText';
import AudioPlayer from './ui/AudioPlayer';
import EmptyState from './ui/EmptyState';
import { STUDY_STATUS_LABELS } from '../constants/cards';

export default function TableView({
  cards = [],
  statusMap = {},
  onSelectCard,
  onEditCard,
  onDeleteCard,
}) {
  if (!cards || cards.length === 0) {
    return (
      <EmptyState
        title="Không tìm thấy thẻ học phù hợp"
        description="Hãy thử đổi bộ lọc cấp độ, bài học hoặc từ khóa tìm kiếm."
      />
    );
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-600 w-24">
              Bài
            </th>
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-600 w-52">
              Mặt trước
            </th>
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-600">
              Ý nghĩa
            </th>
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-600 w-44">
              Cách chia / Đọc
            </th>
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-600 w-32 text-center">
              Trạng thái
            </th>
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-600 w-40 text-right">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {cards.map((card) => {
            const frontText = card.front_text || card.grammar;
            const reading = card.extra_data?.reading || '';
            const status = statusMap[String(card.id)] || 'unseen';

            return (
              <tr
                key={card.id || frontText}
                onClick={() => onSelectCard(card)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectCard(card);
                  }
                }}
                className="cursor-pointer hover:bg-slate-50 transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-700"
              >
                <td className="py-3.5 px-4 align-middle">
                  <Badge variant="lesson">{card.lesson || 'Chung'}</Badge>
                </td>
                <td className="py-3.5 px-4 align-middle font-bold text-base text-slate-900">
                  <RubyText text={frontText} reading={reading} />
                </td>
                <td className="py-3.5 px-4 align-middle text-sm text-slate-900">
                  {card.meaning}
                </td>
                <td className="py-3.5 px-4 align-middle text-sm text-sky-800 font-jp">
                  {card.conjugation || '—'}
                </td>
                <td className="py-3.5 px-4 align-middle text-center">
                  <Badge variant={status}>
                    {STUDY_STATUS_LABELS[status] || 'Chưa học'}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 align-middle text-right">
                  <div
                    className="inline-flex items-center justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <AudioPlayer text={frontText} compact />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectCard(card)}
                    >
                      Chi tiết
                    </Button>
                    {card.is_owner && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditCard(card)}
                          aria-label={`Sửa thẻ ${frontText}`}
                        >
                          <PencilSquareIcon className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => onDeleteCard(card)}
                          aria-label={`Xóa thẻ ${frontText}`}
                        >
                          <TrashIcon className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
