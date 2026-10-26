// src/components/financial/FinancialFilters.jsx
import React from "react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  FaCalendarAlt,
  FaFilter,
  FaTimes,
  FaSync,
  FaSpinner,
} from "react-icons/fa";

const FinancialFilters = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onApply,
  onReset,
  onRefresh,
  hasCustomRange,
  loading,
  lastUpdated,
  show,
  toggleShow,
}) => {
  // Helper to ensure the DatePicker gets a valid DateObject or Date
  const formatDateForPicker = (date) => {
    if (!date) return null;
    // If it's a JS Date, return it. If it's already a string like "1405/07/01", DatePicker handles it.
    return date;
  };

  return (
    <>
      {/* ============ Top Action Bar ============ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShow}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              show
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FaFilter /> فیلترها
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <FaSync className={loading ? "animate-spin" : ""} />
            بروزرسانی
          </button>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            آخرین بروزرسانی: {lastUpdated.toLocaleTimeString("fa-AF")}
          </span>
        )}
      </div>

      {/* ============ Filters Panel ============ */}
      {show && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* از تاریخ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                از تاریخ (هجری شمسی)
              </label>
              <div className="relative">
                <DatePicker
                  value={formatDateForPicker(startDate)}
                  onChange={(d) => setStartDate(d?.toDate?.() || null)}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  maxDate={endDate ? new Date(endDate) : undefined}
                  inputClass="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                  containerClassName="w-full"
                  placeholder="انتخاب تاریخ شروع"
                  format="YYYY/MM/DD"
                  editable={false}
                />
                <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* تا تاریخ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تا تاریخ (هجری شمسی)
              </label>
              <div className="relative">
                <DatePicker
                  value={formatDateForPicker(endDate)}
                  onChange={(d) => setEndDate(d?.toDate?.() || null)}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  minDate={startDate ? new Date(startDate) : undefined}
                  inputClass="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                  containerClassName="w-full"
                  placeholder="انتخاب تاریخ پایان"
                  format="YYYY/MM/DD"
                  editable={false}
                />
                <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onApply}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaFilter />}
                اعمال
              </button>
              {hasCustomRange && (
                <button
                  onClick={onReset}
                  className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm"
                  title="بازنشانی"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FinancialFilters;