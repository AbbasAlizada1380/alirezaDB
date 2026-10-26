import React, { useState, useEffect } from "react";
import axios from "axios";
import Pagination from "../../pagination/Pagination.jsx";
import {
  FaExclamationTriangle,
  FaUser,
  FaReceipt,
  FaMoneyBillWave,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
  FaDownload,
} from "react-icons/fa";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 10;

/* -------------------- Helpers -------------------- */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "۰ افغانی";
  return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB").format(new Date(d));
};

const statusBadge = (status) => {
  const map = {
    paid: { label: "پرداخت شده", cls: "bg-green-100 text-green-800" },
    partial: { label: "بخشی", cls: "bg-yellow-100 text-yellow-800" },
    unpaid: { label: "پرداخت نشده", cls: "bg-red-100 text-red-800" },
  };
  const s = map[status] || map.unpaid;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
};

/* ============================================================
   Component
   ============================================================ */
const PermanentDebtors = () => {
  /* -------------------- State -------------------- */
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* Selection + payment panel */
  const [selected, setSelected] = useState(null);
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  /* Payment form */
  const [payAmount, setPayAmount] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  /* Download */
  const [downloading, setDownloading] = useState(false);

  const hasSelection = !!selected;

  /* -------------------- Fetch debtors -------------------- */
  const fetchDebtors = async (p = 1) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`${BASE_URL}/bills`, {
        params: {
          page: p,
          limit: LIMIT,
          status: "unpaid,partial",
          customerType: "permanent",
        },
      });

      /* Group bills by customer */
      const rawBills = res.data.bills || [];
      const map = new Map();

      for (const b of rawBills) {
        const key = b.customer;
        if (key == null) continue;

        if (!map.has(key)) {
          map.set(key, {
            customerId: b.customer,
            name: b.name || "—",
            phoneNumber: b.phoneNumber || "—",
            bills: [],
            totalOwed: 0,
          });
        }
        const entry = map.get(key);
        entry.bills.push(b);
        entry.totalOwed += Number(b.remaind || 0);
      }

      const grouped = Array.from(map.values()).sort(
        (a, b) => b.totalOwed - a.totalOwed
      );

      setDebtors(grouped);
      setPage(res.data.pagination?.currentPage || p);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "خطا در دریافت بدهکاران"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------- Open a customer's bills -------------------- */
  const openCustomer = async (d) => {
    setSelected(d);
    setPayAmount("");
    setPayDescription("");
    await loadBills(d);
  };

  const loadBills = async (d) => {
    try {
      setLoadingBills(true);
      const res = await axios.get(`${BASE_URL}/bills`, {
        params: {
          customer: d.customerId,
          customerType: "permanent",
          status: "unpaid,partial",
          page: 1,
          limit: 100,
        },
      });
      setBills(res.data.bills || []);
    } catch (err) {
      console.error(err);
      setBills([]);
    } finally {
      setLoadingBills(false);
    }
  };

  /* -------------------- Pay -------------------- */
  const numericPayAmount = Number(payAmount) || 0;
  const totalOwed = selected?.totalOwed || 0;
  const remainingAfter = Math.max(totalOwed - numericPayAmount, 0);
  const overpay = Math.max(numericPayAmount - totalOwed, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected || numericPayAmount <= 0 || submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      /* Pay oldest unpaid bill first (FIFO) */
      let remaining = numericPayAmount;
      const sortedBills = [...bills].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      for (const b of sortedBills) {
        if (remaining <= 0) break;

        const billRemaind = Number(b.remaind || 0);
        if (billRemaind <= 0) continue;

        const take = Math.min(remaining, billRemaind);
        remaining -= take;

        const newReceipt = Array.isArray(b.receipt) ? [...b.receipt] : [];
        newReceipt.push(take);

        const newRemaind = billRemaind - take;
        const newStatus = newRemaind <= 0 ? "paid" : "partial";

        await axios.put(`${BASE_URL}/bills/${b.id}`, {
          receipt: newReceipt,
          remaind: newRemaind,
          status: newStatus,
        });
      }

      setSuccessMessage("پرداخت با موفقیت ثبت شد");
      setTimeout(() => setSuccessMessage(null), 3000);

      /* Refresh everything */
      await Promise.all([loadBills(selected), fetchDebtors(page)]);
      setPayAmount("");
      setPayDescription("");
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "خطا در ثبت پرداخت"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------- Download -------------------- */
  const handleDownload = async () => {
    try {
      setDownloading(true);

      const res = await axios.get(`${BASE_URL}/bills`, {
        params: {
          page: 1,
          limit: 10000,
          status: "unpaid,partial",
          customerType: "permanent",
        },
      });

      const allBills = res.data.bills || [];

      if (allBills.length === 0) {
        alert("هیچ بلی برای دانلود وجود ندارد");
        return;
      }

      /* Compute summary */
      const summary = allBills.reduce(
        (acc, b) => {
          const total = Number(b.total || 0);
          const paid = Array.isArray(b.receipt)
            ? b.receipt.reduce((s, n) => s + Number(n || 0), 0)
            : 0;
          const remaind = Number(b.remaind ?? total - paid);

          acc.totalBills += 1;
          acc.totalAmount += total;
          acc.totalPaid += paid;
          acc.totalRemaining += remaind;
          return acc;
        },
        { totalBills: 0, totalAmount: 0, totalPaid: 0, totalRemaining: 0 }
      );

      /* Lazy import the PDF generator */
      const { downloadPermanentDebtorsPDF } = await import(
        "./downloadPermanentDebtorsPDF"
      );

      downloadPermanentDebtorsPDF({
        bills: allBills,
        summary,
        filters: { status: "unpaid,partial" },
      });
    } catch (err) {
      console.error(err);
      alert(
        err?.response?.data?.message ||
          err.message ||
          "خطا در دریافت داده برای دانلود"
      );
    } finally {
      setDownloading(false);
    }
  };

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="space-y-4">
      {/* ============================================================
          ✅ HEADER — gradient bar with title, subtitle, download button
          ============================================================ */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <FaExclamationTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">مشتریان دائمی بدهکار</h3>
            <p className="text-xs text-white/80">
              {debtors.length} مشتری با بل پرداخت‌نشده یا بخشی
            </p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading || debtors.length === 0}
          className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition self-start md:self-auto ${
            downloading || debtors.length === 0
              ? "bg-white/20 text-white/60 cursor-not-allowed"
              : "bg-white text-primary hover:bg-white/90"
          }`}
          title="دانلود گزارش PDF"
        >
          {downloading ? (
            <>
              <FaSpinner className="animate-spin" />
              در حال آماده‌سازی...
            </>
          ) : (
            <>
              <FaDownload />
              دانلود PDF
            </>
          )}
        </button>
      </div>

      {/* Success toast */}
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid: debtors list + payment panel */}
      <div
        className={`grid gap-4 ${
          hasSelection ? "lg:grid-cols-5" : "grid-cols-1"
        }`}
      >
        {/* -------- Debtors list -------- */}
        <div className={hasSelection ? "lg:col-span-3" : ""}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="py-12 text-center">
                <FaSpinner className="text-3xl text-primary animate-spin mx-auto mb-3" />
                <p className="text-gray-600">در حال بارگذاری...</p>
              </div>
            ) : debtors.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <FaCheckCircle className="text-primary text-2xl" />
                </div>
                <p className="text-gray-500">
                  هیچ مشتری دائم بدهکاری وجود ندارد
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                        مشتری
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                        شماره تماس
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                        تعداد بل
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                        مجموع بدهی
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {debtors.map((d) => {
                      const isSelected = selected?.customerId === d.customerId;
                      return (
                        <tr
                          key={d.customerId}
                          onClick={() => openCustomer(d)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? "bg-primary/10 hover:bg-primary/15"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-primary/10 rounded-full">
                                <FaUser className="text-primary text-xs" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {d.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  #{d.customerId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-700"
                            dir="ltr"
                          >
                            {d.phoneNumber || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {d.bills.length}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-red-600">
                              {formatCurrency(d.totalOwed)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCustomer(d);
                              }}
                              className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-xs font-medium transition flex items-center gap-1 mx-auto"
                            >
                              <FaReceipt className="text-[10px]" />
                              پرداخت
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={fetchDebtors}
              />
            )}
          </div>
        </div>

        {/* -------- Payment panel -------- */}
        {hasSelection && (
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <FaMoneyBillWave className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">{selected.name}</h3>
                    <p className="text-xs text-white/80" dir="ltr">
                      {selected.phoneNumber || "—"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelected(null);
                    setBills([]);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                  title="بستن"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-[11px] text-red-600 mb-1">
                      مجموع بدهی
                    </p>
                    <p className="text-sm font-bold text-red-700">
                      {formatCurrency(totalOwed)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-[11px] text-gray-500 mb-1">
                      تعداد بل
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {bills.length}
                    </p>
                  </div>
                </div>

                {/* Payment form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      <span className="text-red-500">*</span> مبلغ پرداختی
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="۰"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-primary focus:border-primary"
                      disabled={submitting}
                      required
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setPayAmount(String(totalOwed))}
                        className="px-2.5 py-1 rounded-lg text-[11px] bg-primary/10 text-primary hover:bg-primary/20 transition"
                      >
                        پرداخت کامل
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPayAmount(String(Math.round(totalOwed / 2)))
                        }
                        className="px-2.5 py-1 rounded-lg text-[11px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                      >
                        نصف
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      توضیحات (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={payDescription}
                      onChange={(e) => setPayDescription(e.target.value)}
                      placeholder="مثال: پرداخت نقدی در دفتر"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      disabled={submitting}
                    />
                  </div>

                  {numericPayAmount > 0 && (
                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          باقی‌مانده پس از پرداخت:
                        </span>
                        <span
                          className={`font-semibold ${
                            remainingAfter > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(remainingAfter)}
                        </span>
                      </div>
                      {overpay > 0 && (
                        <div className="flex justify-between text-yellow-700">
                          <span>اضافه پرداخت:</span>
                          <span className="font-semibold">
                            {formatCurrency(overpay)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      numericPayAmount <= 0 ||
                      bills.length === 0
                    }
                    className={`w-full px-4 py-3 rounded-xl font-medium shadow-md transition flex items-center justify-center gap-2 ${
                      submitting ||
                      numericPayAmount <= 0 ||
                      bills.length === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-white"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        در حال ثبت...
                      </>
                    ) : (
                      <>
                        <FaReceipt />
                        ثبت پرداخت
                      </>
                    )}
                  </button>
                </form>

                {/* Bills list */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                    بل‌های بدهکار ({bills.length})
                  </div>

                  {loadingBills ? (
                    <div className="py-8 text-center">
                      <FaSpinner className="text-xl text-primary animate-spin mx-auto mb-2" />
                      <p className="text-xs text-gray-500">
                        در حال بارگذاری...
                      </p>
                    </div>
                  ) : bills.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-500">
                      هیچ بل بدهکاری باقی نمانده
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {bills.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 flex items-center justify-between text-xs hover:bg-gray-50"
                        >
                          <div>
                            <div className="font-semibold text-primary">
                              #{b.id}
                            </div>
                            <div className="text-gray-500">
                              {formatDate(b.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-red-600">
                              {formatCurrency(b.remaind)}
                            </div>
                            {statusBadge(b.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermanentDebtors;