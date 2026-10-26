// src/components/bills/BillsFiltersPanel.jsx
import { FaFilter, FaSpinner, FaTimes } from "react-icons/fa";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export default function BillsFiltersPanel({
  from,
  to,
  setFrom,
  setTo,
  onApply,
  onClear,
  loading,
}) {
  const hasRange = Boolean(from && to);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 whitespace-nowrap">
            از تاریخ
          </label>
          <DatePicker
            value={from}
            onChange={(d) => setFrom(d?.toDate?.() || null)}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            maxDate={to ? to : undefined}
            format="YYYY/MM/DD"
            editable={false}
            inputClass="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none w-32 text-center"
            placeholder="1405/07/01"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 whitespace-nowrap">
            تا تاریخ
          </label>
          <DatePicker
            value={to}
            onChange={(d) => setTo(d?.toDate?.() || null)}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            minDate={from ? from : undefined}
            format="YYYY/MM/DD"
            editable={false}
            inputClass="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none w-32 text-center"
            placeholder="1405/07/14"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onApply}
            disabled={!from || !to || loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaFilter />}
            اعمال
          </button>

          {hasRange && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <FaTimes className="text-[10px]" />
              پاک کردن
            </button>
          )}
        </div>
      </div>
    </div>
  );
}