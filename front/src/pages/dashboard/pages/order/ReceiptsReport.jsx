import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import {
  FaFileInvoiceDollar,
  FaFilter,
  FaDownload,
  FaFileCsv,
  FaSpinner,
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaChartBar,
} from "react-icons/fa";
import { downloadReceiptsReportPDF } from "./downloadReceiptsReportPDF";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* ---------------- helpers ---------------- */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "۰ افغانی";
  return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB").format(new Date(d));
};

const dayKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
};

const monthKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

/* ---------------- CSV export ---------------- */
function exportCSV(rows, columns, filename = "report.csv") {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const v = c.value(r);
          const safe = v === null || v === undefined ? "" : String(v);
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");

  const csv = `\uFEFF${header}\n${body}`; // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* =========================================================
   Main component
   ========================================================= */
export default function ReceiptsReport({
  refreshKey = 0,
  customerId: lockedCustomerId = null,
}) {
  /* ---------- filters ---------- */
  const [customerId, setCustomerId] = useState(lockedCustomerId || "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [groupBy, setGroupBy] = useState("none"); // none | customer | day | month

  /* ---------- data ---------- */
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  /* ---------- fetch customers for the dropdown ---------- */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/customers?page=1&limit=500`
        );
        setCustomers(res.data.customers || []);
      } catch (err) {
        /* ignore */
      }
    };
    load();
  }, []);

  /* ---------- fetch receipts matching filters ---------- */
  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: 1,
        limit: 10000, // fetch all for client-side aggregation
      };
      if (customerId) params.customer = customerId;
      if (from) params.from = from;
      if (to) params.to = to;
      if (search.trim()) params.q = search.trim();

      const res = await axios.get(`${BASE_URL}/receipts`, { params });
      let rows = res.data.receipts || [];

      // Client-side amount filtering (backend doesn't support it yet)
      const min = minAmount ? Number(minAmount) : null;
      const max = maxAmount ? Number(maxAmount) : null;
      if (min !== null) rows = rows.filter((r) => Number(r.amount) >= min);
      if (max !== null) rows = rows.filter((r) => Number(r.amount) <= max);

      setReceipts(rows);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "خطا در دریافت داده‌ها"
      );
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, from, to, search, minAmount, maxAmount]);

  useEffect(() => {
    fetchReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, from, to, search, minAmount, maxAmount, refreshKey]);

  /* ---------- derived: grouped rows ---------- */
  const groupedRows = useMemo(() => {
    if (groupBy === "none") {
      return receipts.map((r) => ({
        key: `r-${r.id}`,
        label: `#${r.id}`,
        name: r.name,
        customer: r.customerInfo?.fullname || "—",
        count: 1,
        total: Number(r.amount) || 0,
        latestAt: r.createdAt,
      }));
    }

    const map = new Map();

    for (const r of receipts) {
      let key, label, extra = {};

      if (groupBy === "customer") {
        key = r.customer ? `c-${r.customer}` : `c-anon-${r.name}`;
        label = r.customerInfo?.fullname || r.name || "—";
        extra = { customer: label };
      } else if (groupBy === "day") {
        key = `d-${dayKey(r.createdAt)}`;
        label = dayKey(r.createdAt);
        extra = { customer: "—" };
      } else if (groupBy === "month") {
        key = `m-${monthKey(r.createdAt)}`;
        label = monthKey(r.createdAt);
        extra = { customer: "—" };
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          name: label,
          customer: extra.customer || "—",
          count: 0,
          total: 0,
          latestAt: r.createdAt,
        });
      }
      const entry = map.get(key);
      entry.count += 1;
      entry.total += Number(r.amount) || 0;
      if (new Date(r.createdAt) > new Date(entry.latestAt)) {
        entry.latestAt = r.createdAt;
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      groupBy === "customer"
        ? b.total - a.total
        : new Date(b.latestAt) - new Date(a.latestAt)
    );
  }, [receipts, groupBy]);

  /* ---------- totals ---------- */
  const totals = useMemo(() => {
    return receipts.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.amount += Number(r.amount) || 0;
        return acc;
      },
      { count: 0, amount: 0 }
    );
  }, [receipts]);

  /* ---------- columns per mode ---------- */
  const columns = useMemo(() => {
    const base = [];

    if (groupBy === "none") {
      base.push({
        key: "id",
        label: "#",
        value: (r) => r.label,
      });
      base.push({
        key: "name",
        label: "نام",
        value: (r) => r.name,
      });
      base.push({
        key: "customer",
        label: "مشتری",
        value: (r) => r.customer,
      });
      base.push({
        key: "total",
        label: "مبلغ",
        value: (r) => r.total,
      });
      base.push({
        key: "date",
        label: "تاریخ",
        value: (r) => formatDate(r.latestAt),
      });
    } else if (groupBy === "customer") {
      base.push({
        key: "customer",
        label: "مشتری",
        value: (r) => r.customer,
      });
      base.push({
        key: "count",
        label: "تعداد رسید",
        value: (r) => r.count,
      });
      base.push({
        key: "total",
        label: "مجموع",
        value: (r) => r.total,
      });
      base.push({
        key: "date",
        label: "آخرین رسید",
        value: (r) => formatDate(r.latestAt),
      });
    } else {
      // day or month
      base.push({
        key: "label",
        label: groupBy === "day" ? "تاریخ" : "ماه",
        value: (r) => r.label,
      });
      base.push({
        key: "count",
        label: "تعداد رسید",
        value: (r) => r.count,
      });
      base.push({
        key: "total",
        label: "مجموع",
        value: (r) => r.total,
      });
    }

    return base;
  }, [groupBy]);

  /* ---------- handlers ---------- */
  const clearFilters = () => {
    if (!lockedCustomerId) setCustomerId("");
    setFrom("");
    setTo("");
    setSearch("");
    setMinAmount("");
    setMaxAmount("");
    setGroupBy("none");
  };

  const hasFilters =
    !!customerId ||
    !!from ||
    !!to ||
    !!search.trim() ||
    !!minAmount ||
    !!maxAmount ||
    groupBy !== "none";

  const handleExportCSV = () => {
    if (groupedRows.length === 0) {
      alert("داده‌ای برای دانلود وجود ندارد");
      return;
    }
    exportCSV(
      groupedRows,
      columns,
      `Receipts_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleExportPDF = () => {
    if (groupedRows.length === 0) {
      alert("داده‌ای برای دانلود وجود ندارد");
      return;
    }
    downloadReceiptsReportPDF({
      rows: groupedRows,
      columns,
      totals,
      groupBy,
      filters: {
        customer: customerId
          ? customers.find((c) => String(c.id) === String(customerId))
              ?.fullname || `#${customerId}`
          : null,
        from: from || null,
        to: to || null,
        search: search.trim() || null,
        minAmount: minAmount || null,
        maxAmount: maxAmount || null,
      },
    });
  };

  /* =========================================================
     Render
     ========================================================= */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl">
            <FaChartBar className="text-primary text-lg" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              گزارش رسیدها
            </h2>
            <p className="text-xs text-gray-500">
              {totals.count} رسید — مجموع{" "}
              <span className="font-semibold text-emerald-700">
                {formatCurrency(totals.amount)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={handleExportCSV}
            disabled={groupedRows.length === 0}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
              groupedRows.length === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <FaFileCsv />
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={groupedRows.length === 0}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
              groupedRows.length === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-90"
            }`}
          >
            <FaDownload />
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Customer */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                مشتری
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={!!lockedCustomerId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100"
              >
                <option value="">همه مشتریان</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullname}
                  </option>
                ))}
              </select>
            </div>

            {/* From */}
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

            {/* To */}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Min amount */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                حداقل مبلغ
              </label>
              <input
                type="number"
                min="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="۰"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Max amount */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                حداکثر مبلغ
              </label>
              <input
                type="number"
                min="0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="∞"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                جستجو
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="نام یا توضیحات"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Group by */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                گروه‌بندی
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="none">بدون گروه‌بندی</option>
                <option value="customer">بر اساس مشتری</option>
                <option value="day">بر اساس روز</option>
                <option value="month">بر اساس ماه</option>
              </select>
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
        ) : groupedRows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <FaFileInvoiceDollar className="text-primary text-2xl" />
            </div>
            <p className="text-gray-500">هیچ رسیدی با این فیلترها یافت نشد</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-primary to-primary/80">
                  <tr>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        className={`px-4 py-3 text-xs font-semibold text-white uppercase ${
                          c.key === "total" ||
                          c.key === "count" ||
                          c.key === "amount"
                            ? "text-center"
                            : "text-right"
                        }`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {groupedRows.map((row) => (
                    <tr key={row.key} className="hover:bg-primary/5 transition">
                      {columns.map((c) => {
                        const v = c.value(row);
                        const isMoney =
                          c.key === "total" || c.key === "amount";
                        const isCount = c.key === "count";
                        return (
                          <td
                            key={c.key}
                            className={`px-4 py-3 text-sm ${
                              isCount
                                ? "text-center text-gray-700"
                                : isMoney
                                ? "text-center font-semibold text-emerald-700"
                                : "text-right text-gray-800"
                            }`}
                          >
                            {isMoney
                              ? formatCurrency(v)
                              : typeof v === "number"
                              ? v.toLocaleString("en-US")
                              : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-primary/20">
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-end gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">تعداد ردیف:</span>
                          <span className="font-bold text-gray-900">
                            {groupedRows.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">تعداد رسید:</span>
                          <span className="font-bold text-gray-900">
                            {totals.count}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">مجموع:</span>
                          <span className="font-bold text-emerald-700">
                            {formatCurrency(totals.amount)}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}