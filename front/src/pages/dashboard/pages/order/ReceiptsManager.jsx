import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Pagination from "../../pagination/Pagination.jsx";
import {
  FaReceipt,
  FaPlus,
  FaTimes,
  FaSpinner,
  FaFilter,
  FaTrash,
  FaUser,
  FaCheckCircle,
  FaMoneyBillWave,
  FaChartBar,
} from "react-icons/fa";
import ReceiptsReport from "./ReceiptsReport.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 20;

/* ---------------- helpers ---------------- */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "۰ افغانی";
  return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
};

const formatDateTime = (d) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
};

export default function ReceiptsManager({ refreshKey = 0, customerId = null }) {
  /* ---------- tabs ---------- */
  const [activeTab, setActiveTab] = useState("manage"); // "manage" | "report"

  /* ---------- data ---------- */
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  /* ---------- pagination ---------- */
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totals, setTotals] = useState({ count: 0, totalAmount: 0 });

  /* ---------- filters ---------- */
  const [filterCustomer, setFilterCustomer] = useState(customerId || "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* ---------- form modal ---------- */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    name: "",
    description: "",
    customer: customerId || "",
  });
  const [submitting, setSubmitting] = useState(false);

  /* ---------------- Load customers ---------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/customers?page=1&limit=500`);
        setCustomers(res.data.customers || []);
      } catch (err) {
        /* silent */
      }
    };
    load();
  }, []);

  /* ---------------- Fetch receipts ---------------- */
  const fetchReceipts = useCallback(
    async (p = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = { page: p, limit: LIMIT };
        if (filterCustomer) params.customer = filterCustomer;
        if (from) params.from = from;
        if (to) params.to = to;
        if (search.trim()) params.q = search.trim();

        const res = await axios.get(`${BASE_URL}/receipts`, { params });
        setReceipts(res.data.receipts || []);
        setPage(res.data.pagination?.currentPage || p);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalItems(res.data.pagination?.totalItems || 0);
        setTotals(res.data.totals || { count: 0, totalAmount: 0 });
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err.message ||
            "خطا در دریافت رسیدها"
        );
        setReceipts([]);
      } finally {
        setLoading(false);
      }
    },
    [filterCustomer, from, to, search]
  );

  useEffect(() => {
    if (activeTab !== "manage") return;
    fetchReceipts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCustomer, from, to, search, refreshKey, activeTab]);

  /* ---------------- Handlers ---------------- */
  const resetForm = () => {
    setForm({
      amount: "",
      name: "",
      description: "",
      customer: customerId || "",
    });
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const amt = Number(form.amount);
    if (!form.name.trim()) return setError("نام الزامی است");
    if (!Number.isFinite(amt) || amt <= 0) return setError("مبلغ نامعتبر است");

    setSubmitting(true);
    try {
      const payload = {
        amount: amt,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        customer: form.customer ? Number(form.customer) : null,
      };

      await axios.post(`${BASE_URL}/receipts`, payload);
      setSuccessMessage("رسید با موفقیت ثبت شد");
      resetForm();
      setShowForm(false);
      fetchReceipts(1);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "خطا در ثبت رسید"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("آیا از حذف این رسید اطمینان دارید؟")) return;
    try {
      await axios.delete(`${BASE_URL}/receipts/${id}`);
      setSuccessMessage("رسید حذف شد");
      fetchReceipts(page);
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "خطا در حذف رسید"
      );
    }
  };

  const clearFilters = () => {
    setFilterCustomer(customerId || "");
    setFrom("");
    setTo("");
    setSearch("");
  };

  const hasFilters = !!filterCustomer || !!from || !!to || !!search.trim();

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-4">
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

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 flex items-center gap-1">
        <button
          onClick={() => setActiveTab("manage")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            activeTab === "manage"
              ? "bg-primary text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FaReceipt />
          مدیریت رسیدها
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            activeTab === "report"
              ? "bg-primary text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FaChartBar />
          گزارش رسیدها
        </button>
      </div>

      {/* -------------------- MANAGE TAB -------------------- */}
      {activeTab === "manage" && (
        <>
          {/* Header (WITHOUT the embedded ReceiptsReport) */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-xl">
                <FaReceipt className="text-primary text-lg" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  مدیریت رسیدها
                </h2>
                <p className="text-xs text-gray-500">
                  {totalItems} رسید — مجموع{" "}
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(totals.totalAmount)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                  showFilters || hasFilters
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FaFilter className="text-xs" />
                فیلترها
              </button>

              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:opacity-90 transition flex items-center gap-2 shadow-sm"
              >
                <FaPlus />
                افزودن رسید
              </button>
            </div>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    مشتری
                  </label>
                  <select
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">همه مشتریان</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullname}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    از تاریخ
                  </label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    تا تاریخ
                  </label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    جستجو (نام یا توضیحات)
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              {hasFilters && (
                <div className="flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition flex items-center gap-1"
                  >
                    <FaTimes className="text-[10px]" />
                    پاک کردن فیلترها
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="py-16 text-center">
                <FaSpinner className="text-3xl text-primary animate-spin mx-auto mb-3" />
                <p className="text-gray-600">در حال بارگذاری...</p>
              </div>
            ) : receipts.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <FaReceipt className="text-primary text-2xl" />
                </div>
                <p className="text-gray-500">هیچ رسیدی ثبت نشده است</p>
                <p className="text-gray-400 text-xs mt-1">
                  برای شروع، روی «افزودن رسید» کلیک کنید
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-primary to-primary/80">
                    <tr>
                      {["#", "مبلغ", "نام", "مشتری", "توضیحات", "تاریخ"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-right text-xs font-semibold text-white uppercase"
                          >
                            {h}
                          </th>
                        )
                      )}
                      <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-primary/5 transition">
                        <td className="px-4 py-3 text-sm font-semibold text-primary">
                          #{r.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-emerald-50 text-emerald-600 rounded">
                              <FaMoneyBillWave className="text-[10px]" />
                            </div>
                            <span className="text-sm font-bold text-emerald-700">
                              {formatCurrency(r.amount)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {r.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {r.customerInfo ? (
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-primary/10 rounded-full">
                                <FaUser className="text-primary text-[9px]" />
                              </div>
                              <div>
                                <div className="text-xs font-medium">
                                  {r.customerInfo.fullname}
                                </div>
                                {r.customerInfo.phoneNumber && (
                                  <div
                                    className="text-[10px] text-gray-500"
                                    dir="ltr"
                                  >
                                    {r.customerInfo.phoneNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              — بدون مشتری
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {r.description ? (
                            <span
                              className="block max-w-xs truncate"
                              title={r.description}
                            >
                              {r.description}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {formatDateTime(r.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="حذف"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && !loading && (
              <div className="border-t border-gray-200">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => fetchReceipts(p)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* -------------------- REPORT TAB -------------------- */}
      {activeTab === "report" && (
        <ReceiptsReport
          refreshKey={refreshKey}
          customerId={customerId}
        />
      )}

      {/* Add modal — unchanged */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <FaReceipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">افزودن رسید جدید</h3>
                  <p className="text-xs text-white/80">ثبت یک پرداخت جدید</p>
                </div>
              </div>
              <button
                onClick={closeForm}
                className="p-2 hover:bg-white/20 rounded-lg transition"
                title="بستن"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="text-red-500">*</span> مبلغ (افغانی)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    placeholder="۰"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="text-red-500">*</span> نام پرداخت‌کننده
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="مثال: احمد ولی"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    مشتری (اختیاری)
                  </label>
                  <select
                    value={form.customer}
                    onChange={(e) =>
                      setForm({ ...form, customer: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                    disabled={submitting || !!customerId}
                  >
                    <option value="">— بدون مشتری —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullname}
                        {c.phoneNumber ? ` — ${c.phoneNumber}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    توضیحات (اختیاری)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={2}
                    placeholder="مثال: پرداخت نقدی در دفتر"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    disabled={submitting}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={submitting}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium flex items-center gap-2"
                  >
                    <FaTimes />
                    لغو
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-5 py-2.5 rounded-xl font-medium shadow-md transition flex items-center gap-2 ${
                      submitting
                        ? "bg-gray-400 cursor-not-allowed text-white"
                        : "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-white"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin h-4 w-4" />
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle />
                        ثبت رسید
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}