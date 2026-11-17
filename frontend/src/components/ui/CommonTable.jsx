import React, { useState, useEffect, useRef } from 'react';
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
  infiniteScroll = false,
  pageSize = 30,
  onLoadMore,
  hasMore,
  loadingMore = false,
}) {
  const [prevData, setPrevData] = useState(data);
  const [prevPageSize, setPrevPageSize] = useState(pageSize);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef(null);

  if (data !== prevData || pageSize !== prevPageSize) {
    setPrevData(data);
    setPrevPageSize(pageSize);
    setVisibleCount(pageSize);
  }

  const hasData = Boolean(data && data.length > 0);
  const hasIntersectionObserver =
    typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined';

  const displayData =
    infiniteScroll && hasData && hasIntersectionObserver && typeof onLoadMore !== 'function'
      ? data.slice(0, visibleCount)
      : data;

  const hasMoreItems =
    infiniteScroll && hasData && hasIntersectionObserver
      ? hasMore !== undefined
        ? hasMore
        : visibleCount < data.length
      : false;

  useEffect(() => {
    if (!infiniteScroll || !hasMoreItems) return;

    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          if (typeof onLoadMore === 'function') {
            if (!loadingMore) {
              onLoadMore();
            }
          } else {
            setVisibleCount((prev) => Math.min(prev + pageSize, data.length));
          }
        }
      },
      {
        root: null,
        rootMargin: '250px',
        threshold: 0,
      }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [infiniteScroll, hasMoreItems, onLoadMore, loadingMore, pageSize, data.length]);

  if (!hasData) {
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
            {displayData.map((row, rowIdx) => {
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
          {displayData.map((row, rowIdx) => {
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

      {infiniteScroll && (hasMoreItems || loadingMore) && (
        <div
          ref={sentinelRef}
          className="w-full py-3.5 flex items-center justify-center text-xs text-slate-400 select-none"
          aria-hidden="true"
        >
          <div className="w-4 h-4 border-2 border-slate-200 border-t-sky-700 rounded-full animate-spin" />
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
