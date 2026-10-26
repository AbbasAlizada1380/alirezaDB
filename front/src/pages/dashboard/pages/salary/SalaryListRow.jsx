// components/SalaryListRow.jsx
import React from "react";
import { FaUser, FaClock, FaTrash } from "react-icons/fa";
import ReceiptEditor from "./ReceiptEditor";
import { sumReceipt } from "./ReceiptCell";

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

const DAY_LABELS_FA = {
  Saturday: "شنبه",
  Sunday: "یکشنبه",
  Monday: "دوشنبه",
  Tuesday: "سه‌شنبه",
  Wednesday: "چهارشنبه",
  Thursday: "پنجشنبه",
};

/**
 * Props:
 *   - row
 *   - onChange(rowId, day, field, value)
 *   - onReceiptChange(rowId, arrayOfNumbers)
 *   - onSave(row)
 *   - saving
 *   - formatCurrency
 */
export default function SalaryListRow({
  row,
  onChange,
  onReceiptChange,
  onSave,
  saving,
  onDelete,
  formatCurrency,
}) {
  const paid = sumReceipt(row.receipt);
  const remaining = Number(row.total || 0) - paid;

  return (
    <tr className="hover:bg-gray-50">
      {/* Staff */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          
          <div>
            <div className="text-sm font-medium text-gray-900">
              {row.staff?.name || `کارمند #${row.staffId}`}
            </div>
            {row.staff?.NIC && (
              <div className="text-xs text-gray-500">{row.staff.NIC}</div>
            )}
          </div>
        </div>
      </td>

      {/* Days */}
      {DAYS.map((day) => {
        const dayData = row.attendance?.[day] || {
          attendance: false,
          overtime: 0,
        };
        return (
          <td key={day} className="px-2 py-3 text-center align-top">
            <label className="flex flex-col items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={!!dayData.attendance}
                onChange={(e) =>
                  onChange(row.id, day, "attendance", e.target.checked)
                }
                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <input
                type="number"
                min="0"
                step="0.5"
                value={dayData.overtime || 0}
                onChange={(e) =>
                  onChange(row.id, day, "overtime", Number(e.target.value) || 0)
                }
                className="w-12 text-xs border border-gray-200 rounded px-1 py-0.5 text-center focus:ring-1 focus:ring-primary"
                title="ساعات اضافه‌کاری"
              />
            </label>
          </td>
        );
      })}

      {/* Salary */}
      <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
        {formatCurrency(row.salary)}
      </td>

      {/* Overtime */}
      <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <FaClock className="text-gray-400 text-xs" />
          {formatCurrency(row.overtime)}
        </div>
      </td>

      {/* Total */}
      <td className="px-3 py-3 text-sm font-bold text-primary whitespace-nowrap">
        {formatCurrency(row.total)}
      </td>

      {/* Receipt — editable */}
      <td className="px-3 py-3 whitespace-nowrap align-top">
        <ReceiptEditor
          value={row.receipt}
          onCommit={(arr) => onReceiptChange(row.id, arr)}
          disabled={saving}
        />
      </td>

      {/* Paid */}
      <td className="px-3 py-3 text-sm text-emerald-700 whitespace-nowrap">
        {formatCurrency(paid)}
      </td>

      {/* Remaining */}
      <td
        className={`px-3 py-3 text-sm font-bold whitespace-nowrap ${remaining > 0
            ? "text-red-500"
            : remaining < 0
              ? "text-yellow-600"
              : "text-green-600"
          }`}
      >
        {formatCurrency(remaining)}
      </td>

      {/* Action */}
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onSave(row)}
            disabled={saving}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${saving
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-primary text-white hover:opacity-90"
              }`}
            title="ذخیره"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ذخیره...
              </>
            ) : (
              "ذخیره"
            )}
          </button>

          <button
            onClick={() => onDelete?.(row)}
            disabled={saving}
            className={`p-2 rounded-lg text-xs transition ${saving
                ? "text-gray-400 cursor-not-allowed"
                : "text-red-600 hover:bg-red-50"
              }`}
            title="حذف"
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
}

export { DAYS, DAY_LABELS_FA };