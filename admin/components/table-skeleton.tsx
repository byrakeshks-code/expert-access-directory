'use client';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {Array.from({ length: columns }).map((_, i) => (
                <th
                  key={i}
                  className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="animate-pulse">
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} className="px-6 py-4">
                    <div
                      className="h-4 bg-gray-100 rounded"
                      style={{
                        width: colIdx === 0 ? '60%' : colIdx === columns - 1 ? '40%' : '75%',
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
