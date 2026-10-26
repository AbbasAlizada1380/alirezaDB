// src/components/customers/TemporaryAccountsPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn";

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ✅ Shamsi formatter */
const shamsi = (d) => {
  if (!d) return "—";
  try {
    return moment(d).format("jYYYY/jMM/jDD");
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

export function downloadTemporaryAccountsPDF({ bills, summary, filters = {} }) {
  if (!bills || bills.length === 0) {
    alert("داده‌ای برای دانلود وجود ندارد");
    return;
  }

  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  doc.setR2L(false);

  doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
  doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
  doc.setFont("Vazirmatn");

  const pageWidth = doc.internal.pageSize.getWidth();

  /* ✅ Today in Shamsi */
  const todayShamsi = moment().format("jYYYY/jMM/jDD");
  const todayFileSafe = moment().format("jYYYY-jMM-jDD");

  /* ---------- Title ---------- */
  doc.setFontSize(15);
  doc.text("گزارش حساب مشتریان موقت", pageWidth - 40, 60, {
    align: "right",
  });

  /* ---------- Subtitle (Shamsi dates) ---------- */
  const parts = [];
  if (filters.status) {
    const map = { unpaid: "پرداخت نشده", partial: "بخشی" };
    const labels = String(filters.status)
      .split(",")
      .map((s) => map[s.trim()] || s.trim())
      .join(" ، ");
    parts.push(`وضعیت: ${labels}`);
  }
  if (filters.from) parts.push(`از: ${shamsi(filters.from)}`);
  if (filters.to) parts.push(`تا: ${shamsi(filters.to)}`);
  parts.push(`تاریخ صدور: ${todayShamsi}`);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(parts.join("  •  "), pageWidth - 40, 82, { align: "right" });

  // Divider
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(1);
  doc.line(40, 95, pageWidth - 40, 95);
  doc.setTextColor(0, 0, 0);

  /* ---------- Table ---------- */
  const headers = [
    ["وضعیت", "باقی", "پرداخت شده", "مجموع", "تماس", "مشتری", "شماره"],
  ];

  const statusLabel = { unpaid: "پرداخت نشده", partial: "بخشی" };

  const body = bills.map((b) => {
    const paid = Array.isArray(b.receipt)
      ? b.receipt.reduce((a, x) => a + Number(x || 0), 0)
      : 0;
    return [
      statusLabel[b.status] || "—",
      Number(b.remaind || 0).toLocaleString(),
      paid.toLocaleString(),
      Number(b.total || 0).toLocaleString(),
      b.phoneNumber || "—",
      b.name || "—",
      `#${b.id}`,
    ];
  });

  autoTable(doc, {
    startY: 110,
    head: headers,
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
      fontSize: 9,
      halign: "center",
    },
    /* ✅ didParseCell runs BEFORE drawing — safer than didDrawCell */
    didParseCell: (data) => {
      data.cell.styles.font = "Vazirmatn";
    },
  });

  /* ---------- Summary ---------- */
  const y = (doc.lastAutoTable?.finalY || 140) + 30;

  doc.setFontSize(11);
  doc.text(
    `تعداد بل‌ها: ${summary.totalBills || bills.length}`,
    pageWidth - 40,
    y,
    { align: "right" }
  );
  doc.text(
    `مجموع کل: ${Number(summary.totalAmount || 0).toLocaleString()} افغانی`,
    pageWidth - 40,
    y + 20,
    { align: "right" }
  );
  doc.text(
    `پرداخت شده: ${Number(summary.totalPaid || 0).toLocaleString()} افغانی`,
    pageWidth - 40,
    y + 40,
    { align: "right" }
  );
  doc.text(
    `باقی مانده: ${Number(summary.totalRemaining || 0).toLocaleString()} افغانی`,
    pageWidth - 40,
    y + 60,
    { align: "right" }
  );

  /* ✅ Shamsi filename */
  doc.save(`Temporary_Accounts_${todayFileSafe}.pdf`);
}