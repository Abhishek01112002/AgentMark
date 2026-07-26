import React from 'react';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  renderMobileCard?: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingRows?: number;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  renderMobileCard,
  emptyState,
  loading,
  loadingRows = 5,
}: ResponsiveTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden bg-[#111118] border border-[#2A2A38] p-4 space-y-3">
        {Array.from({ length: loadingRows }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="w-full">
      {/* Mobile Card Layout (<768px) */}
      <div className="block md:hidden space-y-3">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className="rounded-xl p-4 bg-[#111118] border border-[#2A2A38] space-y-2.5 transition-all active:scale-[0.99]"
          >
            {renderMobileCard ? (
              renderMobileCard(item)
            ) : (
              <div className="space-y-2">
                {columns.map((col, i) => {
                  const content = col.cell ? col.cell(item) : (item as any)[col.accessorKey as string];
                  return (
                    <div key={i} className="flex items-center justify-between text-xs font-sans">
                      <span className="text-[#8B8B9E] font-mono uppercase text-[10px] tracking-wider">
                        {col.header}
                      </span>
                      <span className="text-[#F1F1F3] font-medium">{content}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View (≥768px) */}
      <div className="hidden md:block rounded-xl overflow-hidden bg-[#111118] border border-[#2A2A38]">
        <div className="overflow-x-auto scroll-touch">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2A2A38] bg-[#1b1b20]">
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={`px-5 py-3.5 font-mono text-[11px] tracking-wider font-medium text-[#A0A0D2] uppercase ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="border-b border-[#2A2A38]/50 hover:bg-[#1b1b20]/30 transition-colors"
                >
                  {columns.map((col, i) => {
                    const content = col.cell ? col.cell(item) : (item as any)[col.accessorKey as string];
                    return (
                      <td key={i} className={`px-5 py-4 text-xs ${col.className || ''}`}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
