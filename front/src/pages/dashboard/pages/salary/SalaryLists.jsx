import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimes,
  FaEye,
  FaArrowRight,
  FaPlus,
  FaCalendarCheck,
} from "react-icons/fa";
import { FaUser, FaClock, FaTrash } from "react-icons/fa";
import SalaryListRow, { DAYS, DAY_LABELS_FA } from "./SalaryListRow";
import AddSalaryList from "./AddSalaryList";   // adjust path if needed
import moment from "moment-jalaali";
const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function SalaryLists({ onClose, setShowModel }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [selectedList, setSelectedList] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingId, setSavingId] = useState(null);

  moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });
  // ✅ Controls the "add new salary list" modal
  const [showAddForm, setShowAddForm] = useState(false);

  /* ---------------- Fetch salary lists ---------------- */
  const fetchLists = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/salary-lists`);
      setLists(res.data.salaryLists || res.data || []);
      setError(null);
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || "خطا در دریافت لیست معاش"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  /* ✅ Convert Gregorian range string "2026.09.23-2026.10.06" → Shamsi */
  const formatRangeShamsi = (rangeStr) => {
    if (!rangeStr) return "—";

    const trimmed = String(rangeStr).trim();

    /* Already Shamsi? Return as-is */
    const firstYear = Number(trimmed.slice(0, 4));
    if (firstYear >= 1300 && firstYear <= 1500 && trimmed.includes("/")) {
      return trimmed;
    }

    /* Split on "-" or "–" or " تا " */
    const parts = trimmed.split(/\s*[-–]\s*|\s+تا\s+/);
    if (parts.length !== 2) {
      /* Single date — try to convert */
      const m = moment(parts[0], ["YYYY.MM.DD", "YYYY-MM-DD", "YYYY/MM/DD"], true);
      if (m.isValid()) return m.format("jYYYY/jMM/jDD");
      return trimmed;
    }

    const [fromStr, toStr] = parts;

    const convert = (str) => {
      if (!str) return "";
      const formats = [
        "YYYY.MM.DD",
        "YYYY-MM-DD",
        "YYYY/MM/DD",
        "YYYY.MM.DDTHH:mm:ss",
        "YYYY-MM-DDTHH:mm:ss",
      ];
      const m = moment(str.trim(), formats, true);
      if (!m.isValid()) {
        /* Fallback: try native Date parsing */
        const dm = moment(new Date(str.trim()));
        if (dm.isValid()) return dm.format("jYYYY/jMM/jDD");
        return str.trim();
      }
      return m.format("jYYYY/jMM/jDD");
    };

    return `${convert(fromStr)} تا ${convert(toStr)}`;
  };

  /* ---------------- Fetch attendance for a list ---------------- */
  const openAttendance = async (list) => {
    setSelectedList(list);
    setLoadingAttendance(true);
    setError(null);
    try {
      const res = await axios.get(`${BASE_URL}/attendance`, {
        params: { list: list.id },
      });
      const rows = res.data.attendances || res.data || [];
      setAttendances(rows);
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || "خطا در دریافت حاضری"
      );
      setAttendances([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const closeAttendance = () => {
    setSelectedList(null);
    setAttendances([]);
  };

  /* ---------------- Local updates ---------------- */
  const updateLocalAttendance = (id, day, field, value) => {
    setAttendances((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextAttendance = { ...(row.attendance || {}) };
        nextAttendance[day] = {
          ...(nextAttendance[day] || { attendance: false, overtime: 0 }),
          [field]: value,
        };
        return { ...row, attendance: nextAttendance };
      })
    );
  };

  const updateLocalReceipt = (id, receiptArray) => {
    setAttendances((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, receipt: receiptArray } : row
      )
    );
  };
  const deleteAttendance = async (row) => {
    if (
      !window.confirm(
        `آیا از حذف رکورد حاضری «${row.staff?.name || "کارمند #" + row.staffId}» اطمینان دارید؟`
      )
    ) {
      return;
    }

    setSavingId(row.id); // reuse as "this row is busy"
    setError(null);
    try {
      await axios.delete(`${BASE_URL}/attendance/${row.id}`);

      // Remove from local modal state
      setAttendances((prev) => prev.filter((r) => r.id !== row.id));

      // Refresh the parent list so `paid` and `total` reflect the removal
      fetchLists();

      setSuccessMessage("رکورد حاضری حذف شد");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || "خطا در حذف حاضری"
      );
    } finally {
      setSavingId(null);
    }
  };

  const deleteList = async (list, e) => {
    // Prevent the row's onClick from opening the attendance modal
    e?.stopPropagation();

    if (
      !window.confirm(
        `آیا از حذف لیست «${list.name}» و تمام حاضری‌های مربوطه اطمینان دارید؟`
      )
    ) {
      return;
    }

    setSavingId(`list-${list.id}`); // reuse savingId as a generic "busy" flag
    setError(null);
    try {
      await axios.delete(`${BASE_URL}/salary-lists/${list.id}`);

      // Remove from local state without refetching
      setLists((prev) => prev.filter((l) => l.id !== list.id));

      setSuccessMessage("لیست معاش حذف شد");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || "خطا در حذف لیست معاش"
      );
    } finally {
      setSavingId(null);
    }
  };
  /* ---------------- Save one attendance row ---------------- */
  const saveAttendance = async (row) => {
    setSavingId(row.id);
    setError(null);
    try {
      const res = await axios.put(`${BASE_URL}/attendance/${row.id}`, {
        attendance: row.attendance,
        receipt: row.receipt ?? [],
      });

      const updated = res.data.record || res.data;
      setAttendances((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
              ...r,
              salary: updated.salary ?? r.salary,
              overtime: updated.overtime ?? r.overtime,
              total: updated.total ?? r.total,
              receipt: updated.receipt ?? r.receipt,
            }
            : r
        )
      );

      fetchLists();
      setSuccessMessage("حاضری ذخیره شد");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || "خطا در ذخیره حاضری"
      );
    } finally {
      setSavingId(null);
    }
  };

  /* ---------------- Helpers ---------------- */
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "۰ افغانی";
    return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
  };

  /* ✅ Shamsi formatter */
  const formatDate = (dateString) => {
    if (!dateString) return "نامشخص";
    try {
      return moment(dateString).format("jYYYY/jMM/jDD");
    } catch {
      return "نامشخص";
    }
  };

  /* ---------------- Loading state ---------------- */
  if (loading && lists.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">در حال بارگذاری لیست معاش...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print:p-0">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slideDown">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaCheckCircle className="text-green-600" />
              </div>
              <p className="flex-1 text-green-700">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="p-1 hover:bg-green-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-green-600 text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl">
            <FaFileInvoiceDollar className="text-primary text-lg" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">لیست معاش</h2>
            <p className="text-xs text-gray-500">
              برای مشاهده حاضری، روی هر لیست کلیک کنید
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {/* ✅ Add button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
          >
            <FaPlus />
            افزودن لیست معاش
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              title="بستن"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SalaryLists table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-primary to-primary/80">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  شماره
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  نام لیست
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  بازه
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  تعداد کارمندان
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  مجموع
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  پرداخت شده
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  باقی مانده
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  تاریخ ثبت
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider print:hidden">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {lists.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    هیچ لیست معاشی ثبت نشده است
                  </td>
                </tr>
              ) : (
                lists.map((list) => {
                  const staffCount = Array.isArray(list.staffIds)
                    ? list.staffIds.length
                    : 0;
                  const remaining =
                    Number(list.total || 0) - Number(list.paid || 0);
                  return (
                    <tr
                      key={list.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openAttendance(list)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-primary">
                          #{list.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {list.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FaCalendarAlt className="text-gray-400" />
                          {formatRangeShamsi(list.range)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {staffCount} نفر
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(list.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(list.paid)}
                        </div>
                      </td>

                      {/* ✅ Remaining */}
                      <td className="px-6 py-4">
                        <div
                          className={`text-sm font-semibold ${remaining > 0
                            ? "text-red-600"
                            : remaining < 0
                              ? "text-yellow-600"
                              : "text-green-600"
                            }`}
                        >
                          {formatCurrency(remaining)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {formatDate(list.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 bg-primary text-white rounded-md hover:opacity-90 transition-opacity text-sm flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAttendance(list);
                            }}
                          >
                            <FaEye />
                            مشاهده حاضری
                          </button>

                          <button
                            onClick={(e) => deleteList(list, e)}
                            disabled={savingId === `list-${list.id}`}
                            className={`p-2 rounded-md transition ${savingId === `list-${list.id}`
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-600 hover:bg-red-50"
                              }`}
                            title="حذف لیست"
                          >
                            {savingId === `list-${list.id}` ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <FaTrash />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Add Salary List modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-3xl">
            <AddSalaryList
              onSuccess={() => {
                setShowAddForm(false);
                setSuccessMessage("لیست معاش با موفقیت ثبت شد");
                fetchLists();
                setTimeout(() => setSuccessMessage(null), 3000);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {/* Attendance modal */}
      {selectedList && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <FaCalendarCheck />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    حاضری: {selectedList.name}
                  </h2>
                  <p className="text-sm text-white/80" dir="ltr">
                    {formatRangeShamsi(selectedList.range)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeAttendance}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 md:p-6 max-h-[75vh] overflow-y-auto bg-gray-50">
              {loadingAttendance ? (
                <div className="py-16 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-gray-600">در حال بارگذاری حاضری...</p>
                </div>
              ) : attendances.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  هیچ رکورد حاضری برای این لیست یافت نشد
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-primary to-primary/80">
                      <tr>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          کارمند
                        </th>
                        {DAYS.map((day) => (
                          <th
                            key={day}
                            className="px-2 py-3 text-center text-xs font-semibold text-white uppercase"
                          >
                            {DAY_LABELS_FA[day]}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          معاش
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          اضافه‌کاری
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          مجموع
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          رسید
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          پرداخت شده
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          باقی مانده
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase">
                          عملیات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {attendances.map((row) => (
                        <SalaryListRow
                          key={row.id}
                          row={row}
                          saving={savingId === row.id}
                          onChange={updateLocalAttendance}
                          onReceiptChange={updateLocalReceipt}
                          onSave={saveAttendance}
                          onDelete={deleteAttendance}
                          formatCurrency={formatCurrency}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}