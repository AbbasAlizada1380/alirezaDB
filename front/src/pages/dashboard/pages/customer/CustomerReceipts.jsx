// src/components/customers/CustomerReceipts.jsx
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  FaReceipt,
  FaSpinner,
  FaTimes,
  FaFilter,
  FaMoneyBillWave,
  FaPrint,
  FaDownload,
} from "react-icons/fa";
import Pagination from "../../pagination/Pagination.jsx";
import PrintBill from "./PrintBill.jsx";
import { downloadReceiptsReportPDF } from "../order/downloadReceiptsReportPDF.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 10;

/* ✅ Load Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ---------------- helpers ---------------- */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "۰ افغانی";
  return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
};

/* ✅ Shamsi date-time formatter */
const formatDateTime = (d) => {
  if (!d) return "—";
  try {
    return moment(d).format("jYYYY/jMM/jDD HH:mm");
  } catch {
    return "—";
  }
};

/* ✅ Shamsi date formatter (date only) */
const formatShamsi = (d) => {
  if (!d) return "—";
  try {
    return moment(d).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

/* ✅ Convert JS Date or ISO string → "YYYY-MM-DD" (for API params) */
const toISODate = (d) => {
  if (!d) return "";
  try {
    const m = moment(d);
    if (!m.isValid()) return "";
    return m.format("YYYY-MM-DD");
  } catch {
    return "";
  }
};

/* Columns definition for the PDF export */
const PDF_COLUMNS = [
  {
    key: "id",
    label: "#",
    value: (r) => `#${r.id}`,
  },
  {
    key: "amount",
    label: "مبلغ (افغانی)",
    value: (r) => r.amount,
  },
  {
    key: "description",
    label: "توضیحات",
    value: (r) => r.description || "—",
  },
  {
    key: "createdAt",
    label: "تاریخ و زمان",
    /* ✅ Return Shamsi string directly — the PDF will pass it through */
    value: (r) => formatDateTime(r.createdAt),
  },
];

export default function CustomerReceipts({
  customer,
  refreshKey = 0,
  compact = false,
}) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totals, setTotals] = useState({ count: 0, totalAmount: 0 });

  /* Print modal state */
  const [printReceipt, setPrintReceipt] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  /* ✅ filter — holds Date objects (from Shamsi picker) */
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchReceipts = useCallback(
    async (p = 1) => {
      if (!customer?.id) return;
      try {
        setLoading(true);
        setError(null);

        const params = {
          customer: customer.id,
          page: p,
          limit: LIMIT,
        };
        if (from) params.from = toISODate(from);
        if (to) params.to = toISODate(to);

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
    [customer?.id, from, to]
  );

  useEffect(() => {
    fetchReceipts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, from, to, refreshKey]);

  const clearFilters = () => {
    setFrom(null);
    setTo(null);
  };

  /* ---------------- Download PDF ---------------- */
  const handleDownload = async () => {
    if (!customer?.id) return;

    try {
      setDownloading(true);

      // Fetch ALL receipts for this customer (ignore pagination)
      const params = {
        customer: customer.id,
        page: 1,
        limit: 10000,
      };
      if (from) params.from = toISODate(from);
      if (to) params.to = toISODate(to);

      const res = await axios.get(`${BASE_URL}/receipts`, { params });
      const allRows = res.data.receipts || [];

      if (allRows.length === 0) {
        alert("هیچ رسیدی برای دانلود وجود ندارد");
        return;
      }

      const exportTotals = res.data.totals || {
        count: allRows.length,
        totalAmount: allRows.reduce(
          (sum, r) => sum + Number(r.amount || 0),
          0
        ),
      };

      downloadReceiptsReportPDF({
        rows: allRows,
        columns: PDF_COLUMNS,
        totals: exportTotals,
        groupBy: "none",
        filters: {
          customer: customer.fullname || customer.name || `#${customer.id}`,
          from: from ? toISODate(from) : null,
          to: to ? toISODate(to) : null,
        },
      });
    } catch (err) {
      alert("خطا در آماده‌سازی گزارش");
    } finally {
      setDownloading(false);
    }
  };

  if (!customer) return null;

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white overflow-hidden ${
        compact ? "" : "shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-200 bg-gradient-to-l from-gray-50 to-white">
        {/* Left: icon + title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-primary/15 rounded-xl shrink-0">
            <FaReceipt className="text-primary text-base" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              رسیدهای پرداخت
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              <span className="font-medium text-gray-700">{totalItems}</span> رسید
              <span className="mx-1 text-gray-300">•</span>
              مجموع{" "}
              <span className="font-semibold text-emerald-700">
                {formatCurrency(totals.totalAmount)}
              </span>
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownload}
            disabled={downloading || totalItems === 0}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium
                 bg-primary text-white rounded-xl shadow-sm
                 hover:bg-primary/90 active:scale-[0.98]
                 transition-all duration-150
                 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            title="دانلود گزارش PDF"
          >
            {downloading ? (
              <>
                <FaSpinner className="animate-spin text-xs" />
                <span>در حال آماده‌سازی…</span>
              </>
            ) : (
              <>
                <FaDownload className="text-xs" />
                <span>دانلود PDF</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center justify-center h-10 w-10 rounded-xl border transition-all duration-150 shadow-sm
                  ${
                    showFilters
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[0.98]"
                  }`}
            title="فیلتر تاریخ"
            aria-pressed={showFilters}
          >
            <FaFilter className="text-xs" />
          </button>
        </div>
      </div>

      {/* ✅ Shamsi Filter bar */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">از تاریخ</label>
            <DatePicker
              value={from}
              onChange={(d) => setFrom(d?.toDate?.() || null)}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              maxDate={to ? to : undefined}
              format="YYYY/MM/DD"
              editable={false}
              inputClass="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none w-28 text-center"
              placeholder="1405/07/01"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">تا تاریخ</label>
            <DatePicker
              value={to}
              onChange={(d) => setTo(d?.toDate?.() || null)}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              minDate={from ? from : undefined}
              format="YYYY/MM/DD"
              editable={false}
              inputClass="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none w-28 text-center"
              placeholder="1405/07/14"
            />
          </div>
          {(from || to) && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition flex items-center gap-1"
            >
              <FaTimes className="text-[10px]" />
              پاک کردن
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center">
          <FaSpinner className="text-2xl text-primary animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">در حال بارگذاری...</p>
        </div>
      ) : receipts.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
            <FaReceipt className="text-primary" />
          </div>
          <p className="text-xs text-gray-500">
            هیچ رسیدی برای این مشتری ثبت نشده
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-primary to-primary/80">
              <tr>
                <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">
                  #
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">
                  مبلغ
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">
                  توضیحات
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">
                  تاریخ و زمان
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-white uppercase">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-primary/5 transition">
                  <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                    #{r.id}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 bg-emerald-50 text-emerald-600 rounded">
                        <FaMoneyBillWave className="text-[10px]" />
                      </div>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatCurrency(r.amount)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">
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
                  {/* ✅ Shamsi date-time */}
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setPrintReceipt(r);
                          setPrintOpen(true);
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                        title="چاپ رسید"
                      >
                        <FaPrint size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-gray-200">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => fetchReceipts(p)}
        />
      </div>

      {/* Print modal */}
      <PrintBill
        isOpen={printOpen}
        onClose={() => {
          setPrintOpen(false);
          setPrintReceipt(null);
        }}
        receipt={printReceipt}
        customer={customer}
      />
    </div>
  );
}