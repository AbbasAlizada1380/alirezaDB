// src/components/.../downloadAllCustomerDebtPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn";

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n || 0));

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

export function downloadAllCustomerDebtPDF({
  permanent,
  temporary,
  grandTotals,
  filters = {},
}) {
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  doc.setR2L(false);

  doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
  doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
  doc.setFont("Vazirmatn", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const todayShamsi = moment().format("jYYYY/jMM/jDD");
  const todayFileSafe = moment().format("jYYYY-jMM-jDD");

  /* ---------- Title ---------- */
  doc.setFontSize(15);
  doc.setFont("Vazirmatn", "normal");
  doc.text("گزارش بدهی همه مشتریان", pageWidth - 40, 55, { align: "right" });

  /* ---------- Subtitle ---------- */
  const parts = [];
  if (filters.from) parts.push(`از: ${shamsi(filters.from)}`);
  if (filters.to) parts.push(`تا: ${shamsi(filters.to)}`);
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
     Table renderer
     ========================================================= */
  const renderTable = (title, rows, startY) => {
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.setFont("Vazirmatn", "normal");
    doc.text(title, pageWidth - 40, startY, { align: "right" });
    doc.setTextColor(0, 0, 0);

    if (!rows || rows.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.setFont("Vazirmatn", "normal");
      doc.text("هیچ بدهی ثبت نشده است", pageWidth - 40, startY + 20, {
        align: "right",
      });
      doc.setTextColor(0, 0, 0);
      return startY + 40;
    }

    const head = [
      [
        { content: "باقی مانده", styles: { font: "Vazirmatn" } },
        { content: "پرداخت شده", styles: { font: "Vazirmatn" } },
        { content: "مجموع", styles: { font: "Vazirmatn" } },
        { content: "تعداد بل", styles: { font: "Vazirmatn" } },
        { content: "تماس", styles: { font: "Vazirmatn" } },
        { content: "مشتری", styles: { font: "Vazirmatn" } },
      ],
    ];

    const body = rows.map((r) => [
      fmt(r.totalRemaining),
      fmt(r.totalPaid),
      fmt(r.totalAmount),
      String(r.bills.length),
      r.phoneNumber || "—",
      r.name,
    ]);

    const t = rows.reduce(
      (acc, r) => {
        acc.amount += r.totalAmount;
        acc.paid += r.totalPaid;
        acc.remaining += r.totalRemaining;
        acc.bills += r.bills.length;
        return acc;
      },
      { amount: 0, paid: 0, remaining: 0, bills: 0 }
    );

    const foot = [
      [
        fmt(t.remaining),
        fmt(t.paid),
        fmt(t.amount),
        String(t.bills),
        "",
        { content: "مجموع", styles: { font: "Vazirmatn" } },
      ],
    ];

    autoTable(doc, {
      startY: startY + 8,
      head,
      body,
      foot,
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
      footStyles: {
        font: "Vazirmatn",
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        halign: "center",
      },
      didParseCell: (data) => {
        data.cell.styles.font = "Vazirmatn";
      },
      /* ✅ Force the live document font right before drawing each cell */
      willDrawCell: () => {
        doc.setFont("Vazirmatn", "normal");
      },
    });

    return doc.lastAutoTable.finalY + 25;
  };

  /* ---------- Table 1: Permanent ---------- */
  let y = renderTable("مشتریان دائمی بدهکار", permanent, 110);

  /* ---------- Table 2: Temporary ---------- */
  if (y > pageHeight - 200) {
    doc.addPage();
    y = 60;
  }
  y = renderTable("مشتریان موقت بدهکار", temporary, y);

  /* ---------- Grand totals ---------- */
  if (y > pageHeight - 120) {
    doc.addPage();
    y = 60;
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(40, y, pageWidth - 80, 75, "F");

  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175);
  doc.setFont("Vazirmatn", "normal");
  doc.text("خلاصه کلی", pageWidth - 50, y + 20, { align: "right" });
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.setFont("Vazirmatn", "normal");
  doc.text(
    `تعداد مشتریان بدهکار: ${grandTotals.customers || 0}`,
    pageWidth - 50,
    y + 38,
    { align: "right" }
  );
  doc.text(
    `تعداد بل‌ها: ${grandTotals.bills || 0}`,
    pageWidth - 50,
    y + 52,
    { align: "right" }
  );
  doc.text(
    `مجموع کل: ${fmt(grandTotals.amount)} افغانی  —  پرداخت شده: ${fmt(
      grandTotals.paid
    )} افغانی  —  باقی مانده: ${fmt(grandTotals.remaining)} افغانی`,
    pageWidth - 50,
    y + 66,
    { align: "right" }
  );

  doc.save(`All_Customer_Debt_${todayFileSafe}.pdf`);
}