// src/components/bills/utils/billsDownload.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import VazirmatnTTF from "../../../../../../../public/ttf/Vazirmatn.js";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ---------- Helpers ---------- */
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

const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    return moment(dateString).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

const buildRangeLabel = (from, to) => {
  if (!from && !to) return "همه بل‌ها";
  if (from && to) return `${formatDate(from)} تا ${formatDate(to)}`;
  if (from) return `از ${formatDate(from)}`;
  return `تا ${formatDate(to)}`;
};

const STATUS_LABEL = {
  paid: "پرداخت شده",
  partial: "بخشی",
  unpaid: "پرداخت نشده",
};
const TYPE_LABEL = {
  permanent: "دائم",
  temporary: "موقت",
};

const computeTotals = (bills) =>
  bills.reduce(
    (acc, b) => {
      const paid = Array.isArray(b.receipt)
        ? b.receipt.reduce((s, n) => s + Number(n || 0), 0)
        : 0;
      acc.total += Number(b.total || 0);
      acc.paid += paid;
      acc.remaining += Number(b.remaind ?? Number(b.total || 0) - paid);
      return acc;
    },
    { total: 0, paid: 0, remaining: 0 }
  );

/* ---------- Fetch filtered bills ---------- */
export const fetchAllFilteredBills = async ({ from, to, q }) => {
  const params = { page: 1, limit: 10000 };
  if (from) params.from = toISODate(from);
  if (to) params.to = toISODate(to);
  if (q && q.trim()) params.q = q.trim();
  const res = await axios.get(`${BASE_URL}/bills`, { params });
  return res.data.bills || [];
};

/* =========================================================
   PDF
   ========================================================= */
export const downloadBillsPDF = (bills, from, to, q) => {
  if (!bills?.length) {
    alert("داده‌ای برای دانلود وجود ندارد");
    return;
  }

  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  doc.setR2L(false);

  doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
  doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
  doc.setFont("Vazirmatn", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const todayShamsi = moment().format("jYYYY/jMM/jDD");

  /* Title */
  doc.setFontSize(15);
  doc.text("گزارش بل‌ها", pageWidth - 40, 55, { align: "right" });

  /* Subtitle */
  const subParts = [`بازه: ${buildRangeLabel(from, to)}`];
  if (q && q.trim()) subParts.push(`جستجو: ${q.trim()}`);
  subParts.push(`تاریخ صدور: ${todayShamsi}`);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(subParts.join("  •  "), pageWidth - 40, 75, { align: "right" });

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(1);
  doc.line(40, 85, pageWidth - 40, 85);
  doc.setTextColor(0, 0, 0);

  const head = [
    [
      { content: "#", styles: { font: "Vazirmatn" } },
      { content: "مشتری", styles: { font: "Vazirmatn" } },
      { content: "تماس", styles: { font: "Vazirmatn" } },
      { content: "نوع", styles: { font: "Vazirmatn" } },
      { content: "مجموع", styles: { font: "Vazirmatn" } },
      { content: "پرداخت شده", styles: { font: "Vazirmatn" } },
      { content: "باقی مانده", styles: { font: "Vazirmatn" } },
      { content: "وضعیت", styles: { font: "Vazirmatn" } },
      { content: "تاریخ", styles: { font: "Vazirmatn" } },
    ],
  ];

  const body = bills.map((b) => {
    const paid = Array.isArray(b.receipt)
      ? b.receipt.reduce((s, n) => s + Number(n || 0), 0)
      : 0;
    return [
      `#${b.id}`,
      b.name || "—",
      b.phoneNumber || "—",
      TYPE_LABEL[b.customerType] || "—",
      Number(b.total || 0).toLocaleString("en-US"),
      paid.toLocaleString("en-US"),
      Number(b.remaind || 0).toLocaleString("en-US"),
      STATUS_LABEL[b.status] || "—",
      formatDate(b.createdAt),
    ];
  });

  const totals = computeTotals(bills);
  const foot = [
    [
      { content: "مجموع", styles: { font: "Vazirmatn" }, colSpan: 4 },
      totals.total.toLocaleString("en-US"),
      totals.paid.toLocaleString("en-US"),
      totals.remaining.toLocaleString("en-US"),
      "",
      "",
    ],
  ];

  autoTable(doc, {
    startY: 100,
    head,
    body,
    foot,
    theme: "grid",
    styles: {
      font: "Vazirmatn",
      fontSize: 8,
      halign: "center",
      valign: "middle",
      cellPadding: 5,
    },
    headStyles: {
      font: "Vazirmatn",
      fontStyle: "normal",
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      halign: "center",
    },
    footStyles: {
      font: "Vazirmatn",
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      halign: "center",
    },
    didParseCell: (data) => {
      data.cell.styles.font = "Vazirmatn";
    },
    willDrawCell: () => {
      doc.setFont("Vazirmatn", "normal");
    },
  });

  const y = (doc.lastAutoTable?.finalY || 200) + 20;

  doc.setFontSize(10);
  doc.setFont("Vazirmatn", "normal");
  doc.text(
    `تعداد بل‌ها: ${bills.length}  •  مجموع کل: ${totals.total.toLocaleString(
      "en-US"
    )} افغانی  •  باقی مانده: ${totals.remaining.toLocaleString("en-US")} افغانی`,
    pageWidth - 40,
    y,
    { align: "right" }
  );

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(
      `${i}/${pageCount}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 30,
      { align: "right" }
    );
  }

  const fileFrom = from ? moment(from).format("jYYYY-jMM-jDD") : "start";
  const fileTo = to ? moment(to).format("jYYYY-jMM-jDD") : "end";
  const searchTag = q && q.trim() ? `_q-${q.trim().slice(0, 12)}` : "";
  doc.save(`Bills_${fileFrom}_to_${fileTo}${searchTag}.pdf`);
};

/* =========================================================
   CSV
   ========================================================= */
export const downloadBillsCSV = (bills, from, to, q) => {
  if (!bills?.length) {
    alert("داده‌ای برای دانلود وجود ندارد");
    return;
  }

  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [];

  lines.push(`"گزارش بل‌ها"`);
  lines.push(`"بازه","${buildRangeLabel(from, to)}"`);
  if (q && q.trim()) lines.push(`"جستجو","${q.trim()}"`);
  lines.push(`"تاریخ صدور","${moment().format("jYYYY/jMM/jDD")}"`);
  lines.push("");

  lines.push(
    [
      "#",
      "مشتری",
      "تماس",
      "نوع",
      "مجموع",
      "پرداخت شده",
      "باقی مانده",
      "وضعیت",
      "تاریخ",
    ]
      .map(esc)
      .join(",")
  );

  bills.forEach((b) => {
    const paid = Array.isArray(b.receipt)
      ? b.receipt.reduce((s, n) => s + Number(n || 0), 0)
      : 0;
    lines.push(
      [
        `#${b.id}`,
        b.name || "—",
        b.phoneNumber || "—",
        TYPE_LABEL[b.customerType] || "—",
        Number(b.total || 0).toLocaleString("en-US"),
        paid.toLocaleString("en-US"),
        Number(b.remaind || 0).toLocaleString("en-US"),
        STATUS_LABEL[b.status] || "—",
        formatDate(b.createdAt),
      ]
        .map(esc)
        .join(",")
    );
  });

  const totals = computeTotals(bills);
  lines.push("");
  lines.push(
    ["", "", "", "مجموع", totals.total, totals.paid, totals.remaining, "", ""]
      .map(esc)
      .join(",")
  );

  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  const fileFrom = from ? moment(from).format("jYYYY-jMM-jDD") : "start";
  const fileTo = to ? moment(to).format("jYYYY-jMM-jDD") : "end";
  const searchTag = q && q.trim() ? `_q-${q.trim().slice(0, 12)}` : "";
  link.download = `Bills_${fileFrom}_to_${fileTo}${searchTag}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* =========================================================
   Excel
   ========================================================= */
let _xlsxPromise = null;
const loadXLSX = () => {
  if (_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Failed to load SheetJS"));
    document.head.appendChild(script);
  });
  return _xlsxPromise;
};

export const downloadBillsExcel = async (bills, from, to, q) => {
  if (!bills?.length) {
    alert("داده‌ای برای دانلود وجود ندارد");
    return;
  }

  const XLSX = await loadXLSX();
  const totals = computeTotals(bills);

  const summaryRows = [
    ["گزارش بل‌ها"],
    ["بازه", buildRangeLabel(from, to)],
    ...(q && q.trim() ? [["جستجو", q.trim()]] : []),
    ["تاریخ صدور", moment().format("jYYYY/jMM/jDD")],
    [],
    ["تعداد بل‌ها", bills.length],
    ["مجموع کل", totals.total],
    ["پرداخت شده", totals.paid],
    ["باقی مانده", totals.remaining],
  ];

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "خلاصه");

  const rows = [
    [
      "#",
      "مشتری",
      "تماس",
      "نوع",
      "مجموع",
      "پرداخت شده",
      "باقی مانده",
      "وضعیت",
      "تاریخ",
    ],
    ...bills.map((b) => {
      const paid = Array.isArray(b.receipt)
        ? b.receipt.reduce((s, n) => s + Number(n || 0), 0)
        : 0;
      return [
        `#${b.id}`,
        b.name || "—",
        b.phoneNumber || "—",
        TYPE_LABEL[b.customerType] || "—",
        Number(b.total || 0),
        paid,
        Number(b.remaind || 0),
        STATUS_LABEL[b.status] || "—",
        formatDate(b.createdAt),
      ];
    }),
  ];

  const wsBills = XLSX.utils.aoa_to_sheet(rows);
  wsBills["!cols"] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBills, "بل‌ها");

  const fileFrom = from ? moment(from).format("jYYYY-jMM-jDD") : "start";
  const fileTo = to ? moment(to).format("jYYYY-jMM-jDD") : "end";
  const searchTag = q && q.trim() ? `_q-${q.trim().slice(0, 12)}` : "";
  XLSX.writeFile(wb, `Bills_${fileFrom}_to_${fileTo}${searchTag}.xlsx`);
};