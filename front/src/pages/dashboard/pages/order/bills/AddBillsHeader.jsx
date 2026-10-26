// src/components/bills/AddBillsHeader.jsx
import {
  FaSpinner,
  FaFilePdf,
  FaFileCsv,
  FaFileExcel,
  FaFilter,
  FaSync,
  FaFileInvoiceDollar,
} from "react-icons/fa";

export default function BillsHeader({
  totalItems,
  hasRange,
  loading,
  downloading,
  showFilters,
  onToggleFilters,
  onRefresh,
  onDownload,
}) {
  const anyDownloading =
    downloading.pdf || downloading.csv || downloading.excel;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Left: title */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/20 rounded-xl">
          <FaFileInvoiceDollar className="text-primary text-lg" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">بل‌ها</h2>
          <p className="text-xs text-gray-500">
            {totalItems} بل ثبت شده
            {hasRange && " در بازه انتخابی"}
          </p>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* PDF */}
        <button
          onClick={() => onDownload("pdf")}
          disabled={anyDownloading || totalItems === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="دانلود PDF"
        >
          {downloading.pdf ? (
            <FaSpinner className="animate-spin text-xs" />
          ) : (
            <FaFilePdf className="text-xs" />
          )}
          <span className="hidden sm:inline">PDF</span>
        </button>

        {/* CSV */}
        <button
          onClick={() => onDownload("csv")}
          disabled={anyDownloading || totalItems === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="دانلود CSV"
        >
          {downloading.csv ? (
            <FaSpinner className="animate-spin text-xs" />
          ) : (
            <FaFileCsv className="text-xs" />
          )}
          <span className="hidden sm:inline">CSV</span>
        </button>

        {/* Excel */}
        <button
          onClick={() => onDownload("excel")}
          disabled={anyDownloading || totalItems === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-700 text-white hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="دانلود Excel"
        >
          {downloading.excel ? (
            <FaSpinner className="animate-spin text-xs" />
          ) : (
            <FaFileExcel className="text-xs" />
          )}
          <span className="hidden sm:inline">Excel</span>
        </button>

        {/* Filter */}
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
            showFilters || hasRange
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <FaFilter className="text-xs" />
          فیلتر تاریخ
          {hasRange && (
            <span className="bg-white/25 text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
              2
            </span>
          )}
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          بروزرسانی
        </button>
      </div>
    </div>
  );
}