import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function TablePagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  className = ''
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems <= pageSize && totalPages <= 1) {
    return (
      <div className={`px-4 py-2.5 border-t border-iso-border bg-iso-bgSecondary/30 flex items-center justify-between text-xs select-none ${className}`}>
        <span className="text-[10px] font-mono text-iso-textMuted">
          Showing <strong className="text-iso-primary">{startItem}-{endItem}</strong> of <strong className="text-iso-primary">{totalItems}</strong> items
        </span>
        <span className="text-[10px] font-mono text-iso-textMuted">Page 1 of 1</span>
      </div>
    );
  }

  return (
    <div className={`px-4 py-2.5 border-t border-iso-border bg-iso-bgSecondary/40 flex items-center justify-between text-xs select-none ${className}`}>
      <span className="text-[10px] font-mono text-iso-textMuted">
        Showing <strong className="text-iso-primary">{startItem}-{endItem}</strong> of <strong className="text-iso-primary">{totalItems}</strong> items
      </span>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-iso-textMuted mr-1">
          Page <strong className="text-iso-primary">{currentPage}</strong> of <strong>{totalPages}</strong>
        </span>

        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="p-1 rounded-xs bg-iso-cardBg border border-iso-border hover:bg-iso-bg hover:border-iso-primary/40 disabled:opacity-30 disabled:pointer-events-none text-iso-text transition-colors cursor-pointer"
          title="First Page"
        >
          <ChevronsLeft size={13} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1 rounded-xs bg-iso-cardBg border border-iso-border hover:bg-iso-bg hover:border-iso-primary/40 disabled:opacity-30 disabled:pointer-events-none text-iso-text transition-colors cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft size={13} />
        </button>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1 rounded-xs bg-iso-cardBg border border-iso-border hover:bg-iso-bg hover:border-iso-primary/40 disabled:opacity-30 disabled:pointer-events-none text-iso-text transition-colors cursor-pointer"
          title="Next Page"
        >
          <ChevronRight size={13} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1 rounded-xs bg-iso-cardBg border border-iso-border hover:bg-iso-bg hover:border-iso-primary/40 disabled:opacity-30 disabled:pointer-events-none text-iso-text transition-colors cursor-pointer"
          title="Last Page"
        >
          <ChevronsRight size={13} />
        </button>
      </div>
    </div>
  );
}
