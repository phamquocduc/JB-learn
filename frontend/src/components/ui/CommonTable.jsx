import React from 'react';
import Card from './Card';

const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function isInteractiveChild(event) {
  if (event.target === event.currentTarget) return false;
  if (typeof event.target?.closest !== 'function') return false;
  return Boolean(
    event.target.closest(
      'button, a, input, select, textarea, [role="button"], [role="link"]'
    )
  );
}

export default function CommonTable({
  columns = [],
  data = [],
  getRowKey = (row, index) => row?.id ?? index,
  onRowClick,
  rowClassName = '',
  renderMobileRow,
  mobileRowClassName = '',
  embedded = false,
  emptyState = null,
  footer = null,
  ariaLabel,
  className = '',
  tableClassName = '',
}) {
  if (!data || data.length === 0) {
    if (!emptyState) return null;
    if (embedded) return <div className="p-4">{emptyState}</div>;
    return emptyState;
  }

  const visibleColumns = columns.filter(Boolean);
  const isInteractive = typeof onRowClick === 'function';
  const cellPadding = 'px-3 sm:px-4 py-2.5';

  const content = (
    <>
      <div
        className={`${renderMobileRow ? 'hidden sm:block ' : ''}overflow-x-auto`}
      >
        <table
          className={`w-full border-collapse text-left ${tableClassName}`.trim()}
          aria-label={ariaLabel}
        >
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {visibleColumns.map((col) => {
                const alignCls = ALIGN_CLASSES[col.align] || ALIGN_CLASSES.left;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`${cellPadding} text-xs font-semibold text-slate-600 ${alignCls} ${col.headerClassName || ''}`.trim()}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {data.map((row, rowIdx) => {
              const rowKey = getRowKey(row, rowIdx);
              const extraRowCls =
                typeof rowClassName === 'function'
                  ? rowClassName(row, rowIdx)
                  : rowClassName;

              return (
                <tr
                  key={rowKey}
                  tabIndex={isInteractive ? 0 : undefined}
                  onClick={
                    isInteractive
                      ? (e) => {
                          if (isInteractiveChild(e)) return;
                          onRowClick(row, rowIdx);
                        }
                      : undefined
                  }
                  onKeyDown={
                    isInteractive
                      ? (e) => {
                          if (isInteractiveChild(e)) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row, rowIdx);
                          }
                        }
                      : undefined
                  }
                  className={`hover:bg-slate-50 transition-colors duration-150 ${
                    isInteractive
                      ? 'cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-700'
                      : ''
                  } ${extraRowCls || ''}`.trim()}
                >
                  {visibleColumns.map((col) => {
                    const alignCls =
                      ALIGN_CLASSES[col.align] || ALIGN_CLASSES.left;
                    return (
                      <td
                        key={col.key}
                        className={`${cellPadding} align-middle ${alignCls} ${col.cellClassName || ''}`.trim()}
                      >
                        {col.render
                          ? col.render(row, rowIdx)
                          : (row?.[col.key] ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {renderMobileRow && (
        <div className="sm:hidden divide-y divide-slate-200" role="list">
          {data.map((row, rowIdx) => {
            const rowKey = getRowKey(row, rowIdx);
            const extraMobileCls =
              typeof mobileRowClassName === 'function'
                ? mobileRowClassName(row, rowIdx)
                : mobileRowClassName;

            return (
              <div
                key={rowKey}
                role="listitem"
                tabIndex={isInteractive ? 0 : undefined}
                onClick={
                  isInteractive
                    ? (e) => {
                        if (isInteractiveChild(e)) return;
                        onRowClick(row, rowIdx);
                      }
                    : undefined
                }
                onKeyDown={
                  isInteractive
                    ? (e) => {
                        if (isInteractiveChild(e)) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row, rowIdx);
                        }
                      }
                    : undefined
                }
                className={`p-3 ${
                  isInteractive
                    ? 'cursor-pointer hover:bg-slate-50 transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-700'
                    : ''
                } ${extraMobileCls || ''}`.trim()}
              >
                {renderMobileRow(row, rowIdx)}
              </div>
            );
          })}
        </div>
      )}

      {footer}
    </>
  );

  if (embedded) return content;

  return (
    <Card className={`overflow-hidden ${className}`.trim()}>{content}</Card>
  );
}
