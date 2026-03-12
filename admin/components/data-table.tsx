'use client';

import { useState, useMemo } from 'react';
import { Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/table-skeleton';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyContent?: React.ReactNode;
  skeletonRows?: number;
  skeletonColumns?: number;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyContent,
  skeletonRows = 5,
  skeletonColumns,
  pageSize = 10,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePageIndex = Math.min(page, totalPages - 1);

  const pageData = useMemo(
    () => data.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize),
    [data, safePageIndex, pageSize],
  );

  if (loading) {
    return (
      <TableSkeleton
        rows={skeletonRows}
        columns={skeletonColumns ?? columns.length}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyContent ?? (
                    <EmptyState
                      icon={Inbox}
                      title="No data found"
                      description="There are no records to display."
                    />
                  )}
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 text-gray-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.length > pageSize && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            Showing {safePageIndex * pageSize + 1}–{Math.min((safePageIndex + 1) * pageSize, data.length)} of {data.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePageIndex === 0}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - safePageIndex) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
                if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                acc.push(i);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="px-1 text-gray-400 text-xs">...</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      safePageIndex === item
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {(item as number) + 1}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePageIndex >= totalPages - 1}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
