// src/components/customers/downloadReceiptsReportPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

const fmt = (n) =>
  new Intl.NumberFormat("en-US").format(Number(n || 0));

/* ✅ Shamsi formatter — date only */
const shamsi = (d) => {
  if (!d) return "—";
  try {
    const m = moment(d);
    if (!m.isValid()) return "—";
    return m.format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

/* ✅ Shamsi formatter — date + time */
const shamsiDateTime = (d) => {
  if (!d) return "—";
  try {
    const m = moment(d);
    if (!m.isValid()) return "—";
    return m.format("jYYYY/jMM/jDD HH:mm");
  } catch {
    return "—";
  }
};

/* ✅ Shamsi filename-safe string */
const shamsiFileSafe = (d) => {
  try {
    return moment(d).format("jYYYY-jMM-jDD");
  } catch {
    return "date";
  }
};

/* =========================================================
   ✅ Smart date detection — handles any format
   Returns the Shamsi-formatted string, or null if not a date.
   ========================================================= */
const tryParseDate = (value) => {
  if (!value) return null;
  if (typeof value !== "string") {
    // Could be a Date object or a number (epoch)
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return null;
      return { hasTime: true, formatted: shamsiDateTime(value) };
    }
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  // ✅ ISO format: "2026-10-06" or "2026-10-06T17:12:00"
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const hasTime = /[T:]/.test(trimmed);
    const m = moment(trimmed);
    if (!m.isValid()) return null;
    return {
      hasTime,
      formatted: hasTime
        ? m.format("jYYYY/jMM/jDD HH:mm")
        : m.format("jYYYY/jMM/jDD"),
    };
  }

  // ✅ DD/MM/YYYY[, HH:MM] — day-first with optional time
  if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
    const hasTime = trimmed.includes(":");
    const formats = [
      "DD/MM/YYYY, HH:mm",
      "DD/MM/YYYY HH:mm",
      "DD/MM/YYYY",
    ];
    const m = moment(trimmed, formats, true);
    if (!m.isValid()) return null;
    return {
      hasTime,
      formatted: hasTime
        ? m.format("jYYYY/jMM/jDD HH:mm")
        : m.format("jYYYY/jMM/jDD"),
    };
  }

  // ✅ Already Shamsi? "1405/07/14" or "1405/07/14 17:12"
  if (/^\d{4}\/\d{2}\/\d{2}/.test(trimmed)) {
    // If the year starts with 13 or 14, it's probably already Shamsi
    const year = Number(trimmed.slice(0, 4));
    if (year >= 1300 && year <= 1500) {
      // Already in Shamsi; just return it
      const m = moment(trimmed, "jYYYY/jMM/jDD", true);
      if (m.isValid()) {
        const hasTime = trimmed.includes(":");
        return {
          hasTime,
          formatted: hasTime
            ? m.format("jYYYY/jMM/jDD HH:mm")
            : m.format("jYYYY/jMM/jDD"),
        };
      }
    }
  }

  return null;
};

export function downloadReceiptsReportPDF({
  rows,
  columns,
  totals,
  groupBy,
  filters = {},
}) {
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  doc.setR2L(false);

  doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
  doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
  doc.setFont("Vazirmatn", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();

  /* ✅ Shamsi dates */
  const todayShamsi = moment().format("jYYYY/jMM/jDD");
  const todayFileSafe = moment().format("jYYYY-jMM-jDD");

  /* ---------- Title ---------- */
  const titleMap = {
    none: "گزارش رسیدها",
    customer: "گزارش رسیدها — بر اساس مشتری",
    day: "گزارش رسیدها — بر اساس روز",
    month: "گزارش رسیدها — بر اساس ماه",
  };
  doc.setFontSize(15);
  doc.setFont("Vazirmatn", "normal");
  doc.text(titleMap[groupBy] || "گزارش رسیدها", pageWidth - 40, 55, {
    align: "right",
  });

  /* ---------- Subtitle: applied filters ---------- */
  const parts = [];
  if (filters.customer) parts.push(`مشتری: ${filters.customer}`);
  if (filters.from) parts.push(`از: ${shamsi(filters.from)}`);
  if (filters.to) parts.push(`تا: ${shamsi(filters.to)}`);
  if (filters.search) parts.push(`جستجو: ${filters.search}`);
  if (filters.minAmount) parts.push(`حداقل: ${filters.minAmount}`);
  if (filters.maxAmount) parts.push(`حداکثر: ${filters.maxAmount}`);
  parts.push(`تاریخ صدور: ${todayShamsi}`);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.setFont("Vazirmatn", "normal");
  doc.text(parts.join("  •  "), pageWidth - 40, 75, { align: "right" });

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(1);
  doc.line(40, 85, pageWidth - 40, 85);
  doc.setTextColor(0, 0, 0);

  /* =========================================================
     Table — headers wrapped for safe font resolution
     ========================================================= */
  const head = [
    columns
      .map((c) => ({
        content: c.label,
        styles: { font: "Vazirmatn" },
      }))
      .reverse(),
  ];

  /* =========================================================
     Body — convert any date-like value to Shamsi
     ========================================================= */
  const body = rows.map((row) =>
    columns.map((c) => {
      const v = c.value(row);

      // Money columns
      if (c.key === "total" || c.key === "amount") return fmt(v);

      // Plain numbers
      if (typeof v === "number") return v.toLocaleString("en-US");

      // ✅ Attempt date detection on string values
      if (typeof v === "string") {
        const parsed = tryParseDate(v);
        if (parsed) return parsed.formatted;
        return v;
      }

      // Date objects
      if (v instanceof Date) {
        const parsed = tryParseDate(v);
        if (parsed) return parsed.formatted;
      }

      return v ?? "";
    })
  );

  autoTable(doc, {
    startY: 100,
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

  /* ---------- Totals ---------- */
  const y = (doc.lastAutoTable?.finalY || 140) + 30;

  doc.setFillColor(245, 245, 245);
  doc.rect(40, y, pageWidth - 80, 75, "F");

  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.setFont("Vazirmatn", "normal");
  doc.text("خلاصه", pageWidth - 50, y + 20, { align: "right" });
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.setFont("Vazirmatn", "normal");
  doc.text(
    `تعداد ردیف‌ها: ${rows.length}`,
    pageWidth - 50,
    y + 38,
    { align: "right" }
  );
  doc.text(
    `تعداد رسیدها: ${totals.count}`,
    pageWidth - 50,
    y + 52,
    { align: "right" }
  );
  doc.text(
    `مجموع مبالغ: ${fmt(totals.amount)} افغانی`,
    pageWidth - 50,
    y + 66,
    { align: "right" }
  );

  /* ---------- Save with Shamsi filename ---------- */
  doc.save(`Receipts_Report_${todayFileSafe}.pdf`);
}