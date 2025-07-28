// src/components/Pagination.jsx
import React from 'react';

const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    showInfo = true,
    className = "",
    size = "normal" // "small", "normal", "large"
}) => {
    if (totalPages <= 1) return null;

    const sizeClasses = {
        small: {
            button: "px-2 py-1 text-xs",
            select: "px-2 py-1 text-xs",
            text: "text-xs"
        },
        normal: {
            button: "px-3 py-1 text-sm",
            select: "px-2 py-1 text-sm",
            text: "text-sm"
        },
        large: {
            button: "px-4 py-2 text-base",
            select: "px-3 py-2 text-base", 
            text: "text-base"
        }
    };

    const classes = sizeClasses[size];

    return (
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 ${className}`}>
            {showInfo && (
                <span className={`${classes.text} text-gray-600 order-2 sm:order-1`}>
                    Halaman {currentPage} dari {totalPages}
                </span>
            )}
            <div className="flex items-center space-x-2 order-1 sm:order-2">
                {/* First Page Button */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage <= 1}
                    className={`${classes.button} bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors`}
                    title="Halaman Pertama"
                >
                    ⟪
                </button>
                
                {/* Previous Page Button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className={`${classes.button} bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors`}
                >
                    ‹ <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                {/* Page Number Selector */}
                <select
                    value={currentPage}
                    onChange={(e) => onPageChange(parseInt(e.target.value))}
                    className={`${classes.select} border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <option key={pageNum} value={pageNum}>
                            {pageNum}
                        </option>
                    ))}
                </select>

                {/* Next Page Button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className={`${classes.button} bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors`}
                >
                    <span className="hidden sm:inline">Berikutnya</span> ›
                </button>

                {/* Last Page Button */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage >= totalPages}
                    className={`${classes.button} bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors`}
                    title="Halaman Terakhir"
                >
                    ⟫
                </button>
            </div>
        </div>
    );
};

export default Pagination;
