// src/components/expenses/ExpenseDateDownload.jsx
import { useState, useMemo } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { FaDownload, FaSpinner, FaFilter, FaTimes } from "react-icons/fa";

import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* ✅ Load Persian locale */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ✅ Shamsi formatters */
const shamsi = (d) => {
  if (!d) return "—";
  try {
    return moment(d).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

const shamsiFileSafe = (d) => {
  try {
    return moment(d).format("jYYYY-jMM-jDD");
  } catch {
    return "date";
  }
};

/* ✅ ISO for API */
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

/* ✅ Available purpose filters (flexible — add more if needed) */
const PURPOSE_OPTIONS = [
  { value: "", label: "همه موارد" },
  { value: "خرید مواد", label: "خرید مواد" },
  { value: "مصارف روزانه", label: "مصارف روزانه" },
  { value: "کرایه جایداد", label: "کرایه جایداد" },
  { value: "سایر", label: "دیگر" },
];

/* ✅ Sort options */
const SORT_OPTIONS = [
  { value: "date_desc", label: "جدیدترین" },
  { value: "date_asc", label: "قدیمی‌ترین" },
  { value: "amount_desc", label: "بیشترین مبلغ" },
  { value: "amount_asc", label: "کمترین مبلغ" },
];

const ExpenseDateDownload = () => {
  /* ✅ Flexible filters */
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [purpose, setPurpose] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);

  /* ✅ Client-side summary of active filters for display */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (from) count++;
    if (to) count++;
    if (purpose) count++;
    if (minAmount) count++;
    if (maxAmount) count++;
    if (searchText) count++;
    if (sortBy !== "date_desc") count++;
    return count;
  }, [from, to, purpose, minAmount, maxAmount, searchText, sortBy]);

  /* =========================================================
     ✅ Flexible filter + sort helper
     ========================================================= */
  const applyClientFilters = (list) => {
    let filtered = [...list];

    // Purpose filter
    if (purpose) {
      filtered = filtered.filter(
        (e) => (e.purpose || "").trim() === purpose
      );
    }

    // Amount range
    if (minAmount) {
      const min = Number(minAmount) || 0;
      filtered = filtered.filter((e) => Number(e.amount || 0) >= min);
    }
    if (maxAmount) {
      const max = Number(maxAmount) || Infinity;
      filtered = filtered.filter((e) => Number(e.amount || 0) <= max);
    }

    // Free-text search (purpose + description + by)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      filtered = filtered.filter((e) => {
        const hay = [
          e.purpose,
          e.description,
          e.by,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "amount_desc":
          return Number(b.amount || 0) - Number(a.amount || 0);
        case "amount_asc":
          return Number(a.amount || 0) - Number(b.amount || 0);
        case "date_desc":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return filtered;
  };

  /* =========================================================
     Reset all filters
     ========================================================= */
  const clearFilters = () => {
    setFrom(null);
    setTo(null);
    setPurpose("");
    setMinAmount("");
    setMaxAmount("");
    setSearchText("");
    setSortBy("date_desc");
  };

  /* =========================================================
     Download PDF
     ========================================================= */
  const handleDownload = async () => {
    if (!from || !to) {
      alert("لطفاً بازه زمانی را انتخاب کنید");
      return;
    }

    try {
      setLoading(true);

      const params = { from: toISODate(from), to: toISODate(to) };
      const { data } = await axios.get(`${BASE_URL}/expense/date_range`, {
        params,
      });

      const rawExpenses = data?.expenses || [];
      if (rawExpenses.length === 0) {
        alert("هیچ هزینه‌ای در این بازه یافت نشد");
        return;
      }

      /* ✅ Apply client-side filters + sorting */
      const expenses = applyClientFilters(rawExpenses);

      if (expenses.length === 0) {
        alert("هیچ هزینه‌ای با فیلترهای انتخابی یافت نشد");
        return;
      }

      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.setR2L(false);

      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn", "normal");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      /* ✅ Shamsi dates */
      const fromShamsi = shamsi(from);
      const toShamsi = shamsi(to);
      const todayShamsi = shamsi(new Date());
      const todayFileSafe = shamsiFileSafe(new Date());

      /* ---------- Title ---------- */
      doc.setFontSize(14);
      doc.setFont("Vazirmatn", "normal");
      doc.text(
        `گزارش هزینه‌ها از ${fromShamsi} تا ${toShamsi}`,
        pageWidth - 40,
        60,
        { align: "right" }
      );

      /* ---------- Subtitle: active filters ---------- */
      const filterParts = [];
      if (purpose) filterParts.push(`هدف: ${purpose}`);
      if (minAmount) filterParts.push(`حداقل: ${minAmount}`);
      if (maxAmount) filterParts.push(`حداکثر: ${maxAmount}`);
      if (searchText) filterParts.push(`جستجو: ${searchText}`);
      filterParts.push(`تاریخ صدور: ${todayShamsi}`);

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.setFont("Vazirmatn", "normal");
      doc.text(
        filterParts.join("  •  "),
        pageWidth - 40,
        78,
        { align: "right" }
      );

      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(1);
      doc.line(40, 90, pageWidth - 40, 90);
      doc.setTextColor(0, 0, 0);

      /* ---------- Table ---------- */
      const head = [
        [
          { content: "شماره", styles: { font: "Vazirmatn" } },
          { content: "تاریخ", styles: { font: "Vazirmatn" } },
          { content: "هدف", styles: { font: "Vazirmatn" } },
          { content: "توسط", styles: { font: "Vazirmatn" } },
          { content: "توضیحات", styles: { font: "Vazirmatn" } },
          { content: "مبلغ", styles: { font: "Vazirmatn" } },
        ],
      ];

      const body = expenses.map((exp) => [
        `#${exp.id}`,
        shamsi(exp.createdAt),
        exp.purpose || "—",
        exp.by || "—",
        exp.description || "—",
        Number(exp.amount || 0).toLocaleString("en-US"),
      ]);

      autoTable(doc, {
        startY: 110,
        head,
        body,
        theme: "grid",
        styles: {
          font: "Vazirmatn",
          fontSize: 9,
          halign: "center",
          valign: "middle",
          cellPadding: 6,
        },
        headStyles: {
          font: "Vazirmatn",
          fontStyle: "normal",
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          halign: "center",
        },
        didParseCell: (data) => {
          data.cell.styles.font = "Vazirmatn";
        },
        willDrawCell: () => {
          doc.setFont("Vazirmatn", "normal");
        },
      });

      /* ---------- Summary ---------- */
      const y = (doc.lastAutoTable?.finalY || 140) + 30;
      const totalAmount = expenses.reduce(
        (sum, exp) => sum + Number(exp.amount || 0),
        0
      );

      doc.setFillColor(245, 245, 245);
      doc.rect(40, y, pageWidth - 80, 80, "F");

      doc.setFontSize(11);
      doc.setTextColor(30, 64, 175);
      doc.setFont("Vazirmatn", "normal");
      doc.text("خلاصه", pageWidth - 50, y + 20, { align: "right" });
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(10);
      doc.text(
        `تعداد هزینه‌ها: ${expenses.length}`,
        pageWidth - 50,
        y + 40,
        { align: "right" }
      );
      doc.text(
        `مجموع کل: ${totalAmount.toLocaleString("en-US")} افغانی`,
        pageWidth - 50,
        y + 56,
        { align: "right" }
      );
      doc.text(
        `تاریخ صدور: ${todayShamsi}`,
        pageWidth - 50,
        y + 72,
        { align: "right" }
      );

      /* ---------- Page numbers ---------- */
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont("Vazirmatn", "normal");
        doc.text(
          `${i}/${pageCount}`,
          pageWidth - 40,
          pageHeight - 40,
          { align: "right" }
        );
      }

      /* ---------- Save with Shamsi filename ---------- */
      doc.save(
        `Expenses_${shamsiFileSafe(from)}_to_${shamsiFileSafe(to)}_${todayFileSafe}.pdf`
      );
    } catch (err) {
      console.error(err);
      alert("خطا در دریافت اطلاعات هزینه‌ها");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 space-y-3">
      {/* Top row: date range + download */}
      <div className="flex flex-wrap items-center gap-3">
        {/* From date */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/90 whitespace-nowrap">از</label>
          <DatePicker
            value={from}
            onChange={(d) => setFrom(d?.toDate?.() || null)}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            maxDate={to ? to : undefined}
            format="YYYY/MM/DD"
            editable={false}
            inputClass="border border-white/30 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-white focus:border-white outline-none w-32 text-center"
            placeholder="1405/07/01"
          />
        </div>

        <span className="text-white/70 text-xs">تا</span>

        {/* To date */}
        <div className="flex items-center gap-2">
          <DatePicker
            value={to}
            onChange={(d) => setTo(d?.toDate?.() || null)}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            minDate={from ? from : undefined}
            format="YYYY/MM/DD"
            editable={false}
            inputClass="border border-white/30 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-white focus:border-white outline-none w-32 text-center"
            placeholder="1405/07/14"
          />
        </div>

        {/* Toggle advanced filters */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            showAdvanced || activeFilterCount > 0
              ? "bg-white text-primary"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          <FaFilter className="text-[10px]" />
          فیلتر پیشرفته
          {activeFilterCount > 0 && (
            <span className="bg-primary text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={loading || !from || !to}
          className={`px-5 py-2 rounded-lg font-medium shadow-md transition flex items-center gap-2 text-sm ${
            loading || !from || !to
              ? "bg-white/30 text-white/60 cursor-not-allowed"
              : "bg-white text-primary hover:bg-white/90"
          }`}
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin" />
              در حال ساخت...
            </>
          ) : (
            <>
              <FaDownload />
              دانلود گزارش
            </>
          )}
        </button>
      </div>

      {/* Advanced filters row (collapsible) */}
      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/20">
          {/* Purpose */}
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="border border-white/30 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-white outline-none"
          >
            {PURPOSE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Min amount */}
          <input
            type="number"
            min="0"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="حداقل مبلغ"
            className="border border-white/30 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-white outline-none w-28"
          />

          {/* Max amount */}
          <input
            type="number"
            min="0"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="حداکثر مبلغ"
            className="border border-white/30 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-white outline-none w-28"
          />

          {/* Search */}
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="جستجو..."
            className="border border-white/30 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-white outline-none w-40"
          />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-white/30 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-white outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-lg text-xs text-white/90 hover:bg-white/20 transition flex items-center gap-1"
            >
              <FaTimes className="text-[10px]" />
              پاک کردن
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseDateDownload;