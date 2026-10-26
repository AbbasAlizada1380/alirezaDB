import React, { useState } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const CombinedReport = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [report, setReport] = useState(null);

  /* =========================================================
     FETCH ALL DATA
     ========================================================= */
  const fetchAll = async () => {
    if (!from || !to) {
      alert("لطفاً بازه زمانی را انتخاب کنید");
      return;
    }

    setLoading(true);
    setReport(null);

    try {
      const requests = [
        { url: `${BASE_URL}/expense/date_range`, params: { from, to } },
        { url: `${BASE_URL}/attendance/date-range`, params: { from, to } },
        { url: `${BASE_URL}/pays/date-range`, params: { from, to } },
        { url: `${BASE_URL}/receipts/date_range`, params: { from, to } },
        { url: `${BASE_URL}/payments`, params: { from, to } },
        { url: `${BASE_URL}/loans/date-range`, params: { startDate: from, endDate: to } },
      ];

      const settled = await Promise.allSettled(
        requests.map(({ url, params }) => axios.get(url, { params }))
      );

      const expRes = settled[0].status === "fulfilled" ? settled[0].value.data : { expenses: [] };
      const attRes = settled[1].status === "fulfilled" ? settled[1].value.data : { data: [] };
      const payRes = settled[2].status === "fulfilled" ? settled[2].value.data : { data: { pays: [] } };
      const recRes = settled[3].status === "fulfilled" ? settled[3].value.data : { data: { receipts: [] } };
      const loanPayRes = settled[4].status === "fulfilled" ? settled[4].value.data : { data: { payments: [] } };
      const loanRes = settled[5].status === "fulfilled" ? settled[5].value.data : { data: { loans: [] } };

      const expenses = expRes.expenses || [];
      const salaries = attRes.data || [];
      const pays = payRes.data?.pays || [];
      const receipts = recRes.data?.receipts || [];
      const loanPayments = loanPayRes.data?.payments || [];
      const loans = loanRes.data?.loans || [];

      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      const totalSalaries = salaries.reduce((s, a) => s + Number(a.total || 0), 0);
      const totalPays = pays.reduce((s, p) => s + Number(p.amount || 0), 0);
      const totalReceipts = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);
      const totalLoanPayments = loanPayments.reduce((s, lp) => s + Number(lp.amount || 0), 0);
      const totalLoans = loans.reduce((s, l) => s + Number(l.amount || 0), 0);
      const totalRemainingLoans = loans.reduce(
        (s, l) => s + Number(l.remainingAmount || 0),
        0
      );

      const totalIncoming = totalReceipts + totalLoanPayments;
      const totalOutgoing = totalExpenses + totalSalaries + totalPays + totalLoans;
      const net = totalIncoming - totalOutgoing;

      setReport({
        dateRange: { from, to },
        expenses: { list: expenses, total: totalExpenses, count: expenses.length },
        salaries: { list: salaries, total: totalSalaries, count: salaries.length },
        pays: { list: pays, total: totalPays, count: pays.length },
        receipts: { list: receipts, total: totalReceipts, count: receipts.length },
        loanPayments: {
          list: loanPayments,
          total: totalLoanPayments,
          count: loanPayments.length,
        },
        loans: {
          list: loans,
          total: totalLoans,
          count: loans.length,
          totalRemaining: totalRemainingLoans,
        },
        summary: {
          totalIncoming,
          totalOutgoing,
          net,
          totalExpenses,
          totalSalaries,
          totalPays,
          totalReceipts,
          totalLoanPayments,
          totalLoans,
        },
      });
    } catch (err) {
      console.error(err);
      alert("خطا در دریافت اطلاعات. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  const formatNum = (num) => Number(num || 0).toLocaleString();

  /* =========================================================
     ✅ CSV EXPORT
     ========================================================= */
  const handleCSVDownload = () => {
    if (!report) return;
    setDownloadingCSV(true);
    try {
      const lines = [];
      const { from, to } = report.dateRange;

      // Header
      lines.push(`گزارش جامع مالی, از ${from} تا ${to}`);
      lines.push("");

      // --- Summary ---
      lines.push("### خلاصه مالی ###");
      lines.push(`رسیدها,${report.summary.totalReceipts}`);
      lines.push(`بازپرداخت قرضه‌ها,${report.summary.totalLoanPayments}`);
      lines.push(`مجموع ورودی,${report.summary.totalIncoming}`);
      lines.push(`مصارف,${report.summary.totalExpenses}`);
      lines.push(`معاشات,${report.summary.totalSalaries}`);
      lines.push(`پرداخت‌ها به فروشندگان,${report.summary.totalPays}`);
      lines.push(`قرضه‌ها,${report.summary.totalLoans}`);
      lines.push(`مجموع خروجی,${report.summary.totalOutgoing}`);
      lines.push(`بیلانس,${report.summary.net}`);
      lines.push("");

      // --- Section: Receipts ---
      lines.push("### رسیدها (دریافتی) ###");
      lines.push("ردیف,مبلغ,مشتری,تاریخ,توضیحات");
      report.receipts.list.forEach((r, i) => {
        lines.push(
          [
            i + 1,
            r.amount || 0,
            r.Customer?.fullname || "—",
            moment(r.createdAt).format("YYYY/MM/DD"),
            (r.description || "—").replace(/,/g, ";"),
          ].join(",")
        );
      });
      lines.push(`مجموع,${report.receipts.total},,,`);
      lines.push("");

      // --- Section: Loan Payments ---
      lines.push("### بازپرداخت قرضه‌ها (دریافتی) ###");
      lines.push("ردیف,مبلغ,کارمند,تاریخ پرداخت,شماره قرضه,وضعیت");
      report.loanPayments.list.forEach((lp, i) => {
        lines.push(
          [
            i + 1,
            lp.amount || 0,
            lp.Loan?.Employee?.fullName || "—",
            moment(lp.paymentDate).format("YYYY/MM/DD"),
            lp.Loan?.id || "—",
            lp.Loan?.status || "—",
          ].join(",")
        );
      });
      lines.push(`مجموع,${report.loanPayments.total},,,,,`);
      lines.push("");

      // --- Section: Pays ---
      lines.push("### پرداخت‌ها به فروشندگان (خروجی) ###");
      lines.push("ردیف,مبلغ,فروشنده,توضیحات,تاریخ");
      report.pays.list.forEach((p, i) => {
        lines.push(
          [
            i + 1,
            p.amount || 0,
            p.sellerInfo?.fullname || "—",
            (p.description || "—").replace(/,/g, ";"),
            moment(p.createdAt).format("YYYY/MM/DD"),
          ].join(",")
        );
      });
      lines.push(`مجموع,${report.pays.total},,,`);
      lines.push("");

      // --- Section: Expenses ---
      lines.push("### مصارف (خروجی) ###");
      lines.push("ردیف,مبلغ,بابت,توسط,تاریخ");
      report.expenses.list.forEach((e, i) => {
        lines.push(
          [
            i + 1,
            e.amount || 0,
            (e.purpose || "—").replace(/,/g, ";"),
            e.by || e.Staff?.name || "—",
            moment(e.createdAt).format("YYYY/MM/DD"),
          ].join(",")
        );
      });
      lines.push(`مجموع,${report.expenses.total},,,`);
      lines.push("");

      // --- Section: Salaries ---
      lines.push("### معاشات کارمندان (خروجی) ###");
      lines.push("ردیف,کارمند,پرداخت‌شده,قابل پرداخت,تاریخ");
      report.salaries.list.forEach((s, i) => {
        lines.push(
          [
            i + 1,
            s.Staff?.name || "—",
            s.receipt || 0,
            s.total || 0,
            moment(s.createdAt).format("YYYY/MM/DD"),
          ].join(",")
        );
      });
      lines.push(`مجموع,,${report.salaries.total},,`);
      lines.push("");

      // --- Section: Loans ---
      lines.push("### قرضه‌های صادر شده (خروجی) ###");
      lines.push("ردیف,مبلغ,باقی‌مانده,کارمند,تاریخ قرضه,وضعیت");
      report.loans.list.forEach((l, i) => {
        lines.push(
          [
            i + 1,
            l.amount || 0,
            l.remainingAmount || 0,
            l.Employee?.fullName || "—",
            moment(l.loanDate).format("YYYY/MM/DD"),
            l.status || "—",
          ].join(",")
        );
      });
      lines.push(`مجموع,${report.loans.total},${report.loans.totalRemaining},,,`);

      // Prepend UTF-8 BOM for Excel
      const csvContent = "\uFEFF" + lines.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Combined_Report_${from}_to_${to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("خطا در دانلود CSV");
    } finally {
      setDownloadingCSV(false);
    }
  };

  /* =========================================================
     ✅ EXCEL EXPORT (uses SheetJS via CDN-style dynamic import)
     ========================================================= */
  const handleExcelDownload = async () => {
    if (!report) return;
    setDownloadingExcel(true);

    try {
      // Load xlsx from CDN (only once per session)
      const XLSX = await loadXLSX();
      const { from, to } = report.dateRange;

      const wb = XLSX.utils.book_new();

      /* ---------- 1. Summary sheet ---------- */
      const summaryRows = [
        ["گزارش جامع مالی", "", ""],
        ["از تاریخ", from, ""],
        ["تا تاریخ", to, ""],
        ["", "", ""],
        ["### خلاصه مالی ###", "", ""],
        ["رسیدها (دریافتی)", report.summary.totalReceipts, ""],
        ["بازپرداخت قرضه‌ها (دریافتی)", report.summary.totalLoanPayments, ""],
        ["مجموع ورودی", report.summary.totalIncoming, ""],
        ["مصارف (خروجی)", report.summary.totalExpenses, ""],
        ["معاشات (خروجی)", report.summary.totalSalaries, ""],
        ["پرداخت‌ها به فروشندگان (خروجی)", report.summary.totalPays, ""],
        ["قرضه‌ها (خروجی)", report.summary.totalLoans, ""],
        ["مجموع خروجی", report.summary.totalOutgoing, ""],
        ["بیلانس", report.summary.net, ""],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
      ws1["!cols"] = [{ wch: 35 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws1, "خلاصه");

      /* ---------- 2. Receipts sheet ---------- */
      if (report.receipts.list.length > 0) {
        const rows = [
          ["#", "مبلغ", "مشتری", "تاریخ", "توضیحات"],
          ...report.receipts.list.map((r, i) => [
            i + 1,
            Number(r.amount || 0),
            r.Customer?.fullname || "—",
            moment(r.createdAt).format("YYYY/MM/DD"),
            r.description || "—",
          ]),
          ["", "", "", "", ""],
          ["مجموع", report.receipts.total, "", "", ""],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 14 },
          { wch: 25 },
          { wch: 14 },
          { wch: 40 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "رسیدها");
      }

      /* ---------- 3. Loan Payments sheet ---------- */
      if (report.loanPayments.list.length > 0) {
        const rows = [
          ["#", "مبلغ", "کارمند", "تاریخ پرداخت", "شماره قرضه", "وضعیت قرضه"],
          ...report.loanPayments.list.map((lp, i) => [
            i + 1,
            Number(lp.amount || 0),
            lp.Loan?.Employee?.fullName || "—",
            moment(lp.paymentDate).format("YYYY/MM/DD"),
            lp.Loan?.id || "—",
            lp.Loan?.status || "—",
          ]),
          ["", "", "", "", "", ""],
          ["مجموع", report.loanPayments.total, "", "", "", ""],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 14 },
          { wch: 25 },
          { wch: 14 },
          { wch: 12 },
          { wch: 14 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "بازپرداخت قرضه");
      }

      /* ---------- 4. Pays sheet ---------- */
      if (report.pays.list.length > 0) {
        const rows = [
          ["#", "مبلغ", "فروشنده", "توضیحات", "تاریخ"],
          ...report.pays.list.map((p, i) => [
            i + 1,
            Number(p.amount || 0),
            p.sellerInfo?.fullname || "—",
            p.description || "—",
            moment(p.createdAt).format("YYYY/MM/DD"),
          ]),
          ["", "", "", "", ""],
          ["مجموع", report.pays.total, "", "", ""],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 14 },
          { wch: 25 },
          { wch: 40 },
          { wch: 14 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "پرداخت‌ها");
      }

      /* ---------- 5. Expenses sheet ---------- */
      if (report.expenses.list.length > 0) {
        const rows = [
          ["#", "مبلغ", "بابت", "توسط", "تاریخ"],
          ...report.expenses.list.map((e, i) => [
            i + 1,
            Number(e.amount || 0),
            e.purpose || "—",
            e.by || e.Staff?.name || "—",
            moment(e.createdAt).format("YYYY/MM/DD"),
          ]),
          ["", "", "", "", ""],
          ["مجموع", report.expenses.total, "", "", ""],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 14 },
          { wch: 30 },
          { wch: 20 },
          { wch: 14 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "مصارف");
      }

      /* ---------- 6. Salaries sheet ---------- */
      if (report.salaries.list.length > 0) {
        const rows = [
          ["#", "کارمند", "پرداخت شده", "قابل پرداخت", "باقیمانده", "تاریخ"],
          ...report.salaries.list.map((s, i) => {
            const paid = Number(s.receipt || 0);
            const total = Number(s.total || 0);
            return [
              i + 1,
              s.Staff?.name || "—",
              paid,
              total,
              total - paid,
              moment(s.createdAt).format("YYYY/MM/DD"),
            ];
          }),
          ["", "", "", "", "", ""],
          ["مجموع", "", "", report.salaries.total, "", ""],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 25 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "معاشات");
      }

      /* ---------- 7. Loans sheet ---------- */
      if (report.loans.list.length > 0) {
        const rows = [
          ["#", "مبلغ", "باقی‌مانده", "کارمند", "تاریخ قرضه", "وضعیت"],
          ...report.loans.list.map((l, i) => [
            i + 1,
            Number(l.amount || 0),
            Number(l.remainingAmount || 0),
            l.Employee?.fullName || "—",
            moment(l.loanDate).format("YYYY/MM/DD"),
            l.status || "—",
          ]),
          ["", "", "", "", "", ""],
          ["مجموع", report.loans.total, report.loans.totalRemaining, "", "", ""],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 14 },
          { wch: 14 },
          { wch: 25 },
          { wch: 14 },
          { wch: 12 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "قرضه‌ها");
      }

      XLSX.writeFile(wb, `Combined_Report_${from}_to_${to}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("خطا در دانلود Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  /* =========================================================
     PDF DOWNLOAD (unchanged from your version, kept intact)
     ========================================================= */
  const handlePDFDownload = () => {
    if (!report) return;
    setDownloading(true);

    try {
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.setR2L(false);

      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn", "normal");

      const { from, to } = report.dateRange;
      const formattedFrom = moment(from).format("YYYY/MM/DD");
      const formattedTo = moment(to).format("YYYY/MM/DD");
      const today = moment().format("YYYY/MM/DD");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const rightX = pageWidth - 40;
      const MARGIN_BOTTOM = 60;
      const MIN_TOP = 50;

      let currentY = 90;

      const ensureSpace = (needed) => {
        if (currentY + needed > pageHeight - MARGIN_BOTTOM) {
          doc.addPage();
          currentY = MIN_TOP;
        }
      };

      doc.setFontSize(16);
      doc.setFont("Vazirmatn", "normal");
      doc.text(
        `گزارش جامع مالی از ${formattedFrom} تا ${formattedTo}`,
        rightX,
        50,
        { align: "right" }
      );

      const addCategoryTable = (title, items, columns, total, count, startY) => {
        if (!items || items.length === 0) {
          doc.setFontSize(11);
          doc.setFont("Vazirmatn", "normal");
          doc.text(`هیچ داده‌ای برای ${title} یافت نشد.`, rightX, startY, { align: "right" });
          return startY + 20;
        }

        const head = [columns];
        const body = items.map((item) =>
          columns.map((col) => getValueForPDF(item, col))
        );

        autoTable(doc, {
          startY: startY,
          head: head,
          body: body,
          theme: "grid",
          styles: {
            font: "Vazirmatn",
            fontSize: 9,
            halign: "center",
            valign: "middle",
            cellPadding: 4,
            lineColor: [200, 200, 200],
            lineWidth: 0.5,
          },
          headStyles: {
            font: "Vazirmatn",
            fontStyle: "normal",
            fillColor: [220, 220, 220],
            textColor: 20,
            fontSize: 10,
            halign: "center",
          },
          margin: { left: 20, right: 20 },
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont("Vazirmatn", "normal");
        doc.text(
          `تعداد: ${count} | مجموع: ${formatNum(total)}`,
          rightX,
          finalY,
          { align: "right" }
        );
        return finalY + 30;
      };

      const addCategoryWithTitle = (title, items, columns, total, count) => {
        ensureSpace(150);
        doc.setFontSize(12);
        doc.setFont("Vazirmatn", "normal");
        doc.text(title, rightX, currentY, { align: "right" });
        currentY += 20;
        currentY = addCategoryTable("", items, columns, total, count, currentY);
      };

      addCategoryWithTitle(
        "رسیدها (دریافتی)",
        report.receipts.list,
        ["مبلغ", "مشتری", "تاریخ"],
        report.receipts.total,
        report.receipts.count
      );

      addCategoryWithTitle(
        "بازپرداخت قرضه‌ها (دریافتی)",
        report.loanPayments.list,
        ["مبلغ", "کارمند", "تاریخ پرداخت", "شماره قرضه", "وضعیت قرضه"],
        report.loanPayments.total,
        report.loanPayments.count
      );

      addCategoryWithTitle(
        "پرداخت‌ها به فروشندگان (خروجی)",
        report.pays.list,
        ["مبلغ", "فروشنده", "توضیحات", "تاریخ"],
        report.pays.total,
        report.pays.count
      );

      addCategoryWithTitle(
        "مصارف (خروجی)",
        report.expenses.list,
        ["مبلغ", "بابت", "توسط", "تاریخ"],
        report.expenses.total,
        report.expenses.count
      );

      addCategoryWithTitle(
        "معاشات کارمندان (خروجی)",
        report.salaries.list,
        ["کارمند", "پرداخت شده", "قابل پرداخت", "تاریخ"],
        report.salaries.total,
        report.salaries.count
      );

      addCategoryWithTitle(
        "قرضه‌های صادر شده (خروجی)",
        report.loans.list,
        ["مبلغ", "باقی‌مانده", "کارمند", "تاریخ قرضه", "وضعیت"],
        report.loans.total,
        report.loans.count
      );

      ensureSpace(450);

      doc.setFontSize(14);
      doc.setFont("Vazirmatn", "normal");
      doc.text("خلاصه مالی", rightX, currentY, { align: "right" });
      currentY += 25;

      doc.setFontSize(10);
      doc.setFont("Vazirmatn", "normal");
      let lineY = currentY;

      doc.text(`رسیدها                : ${formatNum(report.summary.totalReceipts)}`, rightX, lineY, { align: "right" });
      lineY += 16;
      doc.text(`بازپرداخت قرضه‌ها     : ${formatNum(report.summary.totalLoanPayments)}`, rightX, lineY, { align: "right" });
      lineY += 16;
      doc.text(`مجموع ورودی           : ${formatNum(report.summary.totalIncoming)}`, rightX, lineY, { align: "right" });
      lineY += 20;

      doc.text(`مصارف                 : ${formatNum(report.summary.totalExpenses)}`, rightX, lineY, { align: "right" });
      lineY += 16;
      doc.text(`معاشات                : ${formatNum(report.summary.totalSalaries)}`, rightX, lineY, { align: "right" });
      lineY += 16;
      doc.text(`پرداخت‌ها به فروشندگان : ${formatNum(report.summary.totalPays)}`, rightX, lineY, { align: "right" });
      lineY += 16;
      doc.text(`قرضه‌ها               : ${formatNum(report.summary.totalLoans)}`, rightX, lineY, { align: "right" });
      lineY += 16;
      doc.text(`مجموع خروجی           : ${formatNum(report.summary.totalOutgoing)}`, rightX, lineY, { align: "right" });
      lineY += 20;

      const netValue = report.summary.net;
      const netSign = netValue >= 0 ? "+" : "-";
      const netAbs = Math.abs(netValue);
      doc.setFontSize(12);
      doc.text(`بیلانس                : ${netSign} ${formatNum(netAbs)}`, rightX, lineY, { align: "right" });
      lineY += 22;

      doc.setFontSize(10);
      doc.text(`تاریخ صدور: ${today}`, rightX, lineY + 10, { align: "right" });

      currentY = lineY + 30;

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setFont("Vazirmatn", "normal");
        doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 40, { align: "right" });
      }

      doc.save(`Combined_Report_${formattedFrom}_to_${formattedTo}.pdf`);
    } catch (err) {
      console.error(err);
      alert("خطا در تولید PDF");
    } finally {
      setDownloading(false);
    }
  };

  /* =========================================================
     Helpers
     ========================================================= */
  const getValueForPDF = (item, col) => {
    if (item.Loan !== undefined) {
      switch (col) {
        case "مبلغ": return formatNum(item.amount);
        case "کارمند": return item.Loan?.Employee?.fullName || "نامشخص";
        case "تاریخ پرداخت": return moment(item.paymentDate).format("YYYY/MM/DD");
        case "شماره قرضه": return item.Loan?.id?.toString() || "—";
        case "وضعیت قرضه": return item.Loan?.status || "—";
        default: return "—";
      }
    }
    if (item.Employee !== undefined) {
      switch (col) {
        case "مبلغ": return formatNum(item.amount);
        case "باقی‌مانده": return formatNum(item.remainingAmount);
        case "کارمند": return item.Employee?.fullName || "نامشخص";
        case "تاریخ قرضه": return moment(item.loanDate).format("YYYY/MM/DD");
        case "وضعیت": return item.status || "—";
        default: return "—";
      }
    }
    switch (col) {
      case "مبلغ": return formatNum(item.amount || item.total || 0);
      case "بابت": return item.purpose || "—";
      case "توسط": return item.by || item.Staff?.name || "نامشخص";
      case "تاریخ": return moment(item.createdAt).format("YYYY/MM/DD");
      case "مشتری": return item.Customer?.fullname || "نامشخص";
      case "فروشنده": return item.sellerInfo?.fullname || "نامشخص";
      case "توضیحات": return item.description || "—";
      case "کارمند": return item.Staff?.name || "نامشخص";
      case "پرداخت شده": return formatNum(item.receipt || 0);
      case "قابل پرداخت": return formatNum(item.total || 0);
      default: return item[col] || "—";
    }
  };

  const renderTable = (title, items, columns, total, count) => {
    if (!items || items.length === 0) {
      return (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-gray-500">هیچ داده‌ای یافت نشد.</p>
        </div>
      );
    }
    return (
      <div className="mb-8 bg-white rounded shadow overflow-x-auto">
        <div className="px-4 py-2 bg-gray-100 border-b flex justify-between items-center">
          <h3 className="text-md font-semibold">{title}</h3>
          <span className="text-sm text-gray-600">
            تعداد: {count} | مجموع: {formatNum(total)}
          </span>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-4 py-2 border text-right">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t hover:bg-gray-50">
                {columns.map((col, idx2) => (
                  <td key={idx2} className="px-4 py-2 border">
                    {getValueForUI(item, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getValueForUI = (item, col) => {
    if (item.Loan !== undefined) {
      switch (col) {
        case "مبلغ": return formatNum(item.amount);
        case "کارمند": return item.Loan?.Employee?.fullName || "نامشخص";
        case "تاریخ پرداخت": return moment(item.paymentDate).format("YYYY/MM/DD");
        case "شماره قرضه": return item.Loan?.id?.toString() || "—";
        case "وضعیت قرضه": return item.Loan?.status || "—";
        default: return "—";
      }
    }
    if (item.Employee !== undefined) {
      switch (col) {
        case "مبلغ": return formatNum(item.amount);
        case "باقی‌مانده": return formatNum(item.remainingAmount);
        case "کارمند": return item.Employee?.fullName || "نامشخص";
        case "تاریخ قرضه": return moment(item.loanDate).format("YYYY/MM/DD");
        case "وضعیت": return item.status || "—";
        default: return "—";
      }
    }
    switch (col) {
      case "مبلغ": return formatNum(item.amount || item.total || 0);
      case "بابت": return item.purpose || "—";
      case "توسط": return item.by || item.Staff?.name || "نامشخص";
      case "تاریخ": return moment(item.createdAt).format("YYYY/MM/DD");
      case "مشتری": return item.Customer?.fullname || "نامشخص";
      case "فروشنده": return item.sellerInfo?.fullname || "نامشخص";
      case "توضیحات": return item.description || "—";
      case "کارمند": return item.Staff?.name || "نامشخص";
      case "پرداخت شده": return formatNum(item.receipt || 0);
      case "قابل پرداخت": return formatNum(item.total || 0);
      default: return item[col] || "—";
    }
  };

  /* =========================================================
     MAIN RENDER
     ========================================================= */
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">گزارش جامع مالی</h2>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border p-2 rounded"
          />
          <span>تا</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border p-2 rounded"
          />
        </div>

        <button
          onClick={fetchAll}
          disabled={loading}
          className="bg-cyan-800 text-white px-6 py-2 rounded hover:bg-cyan-700 disabled:bg-gray-400"
        >
          {loading ? "در حال دریافت..." : "نمایش گزارش"}
        </button>

        {report && (
          <>
            {/* PDF */}
            <button
              onClick={handlePDFDownload}
              disabled={downloading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              {downloading ? "در حال ساخت PDF..." : "📄 دانلود PDF"}
            </button>

            {/* CSV */}
            <button
              onClick={handleCSVDownload}
              disabled={downloadingCSV}
              className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:bg-gray-400"
            >
              {downloadingCSV ? "..." : "📊 دانلود CSV"}
            </button>

            {/* Excel */}
            <button
              onClick={handleExcelDownload}
              disabled={downloadingExcel}
              className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 disabled:bg-gray-400"
            >
              {downloadingExcel ? "..." : "📗 دانلود Excel"}
            </button>
          </>
        )}
      </div>

      {loading && <div className="text-center py-10">در حال بارگذاری داده‌ها...</div>}

      {report && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded shadow">
              <div className="text-sm text-gray-600">رسیدها (دریافتی)</div>
              <div className="text-xl font-bold text-blue-700">{formatNum(report.receipts.total)}</div>
              <div className="text-xs text-gray-500">{report.receipts.count} مورد</div>
            </div>
            <div className="bg-green-50 p-4 rounded shadow">
              <div className="text-sm text-gray-600">بازپرداخت قرضه‌ها</div>
              <div className="text-xl font-bold text-green-700">{formatNum(report.loanPayments.total)}</div>
              <div className="text-xs text-gray-500">{report.loanPayments.count} مورد</div>
            </div>
            <div className="bg-orange-50 p-4 rounded shadow">
              <div className="text-sm text-gray-600">پرداخت به فروشندگان</div>
              <div className="text-xl font-bold text-orange-700">{formatNum(report.pays.total)}</div>
              <div className="text-xs text-gray-500">{report.pays.count} مورد</div>
            </div>
            <div className="bg-red-50 p-4 rounded shadow">
              <div className="text-sm text-gray-600">مصارف</div>
              <div className="text-xl font-bold text-red-700">{formatNum(report.expenses.total)}</div>
              <div className="text-xs text-gray-500">{report.expenses.count} مورد</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded shadow">
              <div className="text-sm text-gray-600">معاشات</div>
              <div className="text-xl font-bold text-yellow-700">{formatNum(report.salaries.total)}</div>
              <div className="text-xs text-gray-500">{report.salaries.count} مورد</div>
            </div>
            <div className="bg-amber-700 bg-opacity-10 p-4 rounded shadow border border-amber-300">
              <div className="text-sm text-gray-600">قرضه‌ها</div>
              <div className="text-xl font-bold text-amber-800">{formatNum(report.loans.total)}</div>
              <div className="text-xs text-gray-500">{report.loans.count} مورد | باقی‌مانده: {formatNum(report.loans.totalRemaining)}</div>
            </div>
          </div>

          {/* Detailed Summary */}
          <div className="bg-gray-100 p-4 rounded-lg mb-8 flex flex-wrap justify-around gap-3">
            <div>
              <span className="font-semibold">مجموع ورودی:</span>{" "}
              {formatNum(report.summary.totalIncoming)}
            </div>
            <div>
              <span className="font-semibold">مجموع خروجی:</span>{" "}
              {formatNum(report.summary.totalOutgoing)}
            </div>
            <div>
              <span className="font-semibold">بیلانس:</span>{" "}
              <span className={report.summary.net >= 0 ? "text-green-700" : "text-red-700"}>
                {formatNum(report.summary.net)}
              </span>
            </div>
          </div>

          {/* Tables */}
          <div className="space-y-6">
            {renderTable("رسیدها (دریافتی)", report.receipts.list, ["مبلغ", "مشتری", "تاریخ"], report.receipts.total, report.receipts.count)}
            {renderTable("بازپرداخت قرضه‌ها (دریافتی)", report.loanPayments.list, ["مبلغ", "کارمند", "تاریخ پرداخت", "شماره قرضه", "وضعیت قرضه"], report.loanPayments.total, report.loanPayments.count)}
            {renderTable("پرداخت‌ها به فروشندگان (خروجی)", report.pays.list, ["مبلغ", "فروشنده", "توضیحات", "تاریخ"], report.pays.total, report.pays.count)}
            {renderTable("مصارف (خروجی)", report.expenses.list, ["مبلغ", "بابت", "توسط", "تاریخ"], report.expenses.total, report.expenses.count)}
            {renderTable("معاشات کارمندان (خروجی)", report.salaries.list, ["کارمند", "پرداخت شده", "قابل پرداخت", "تاریخ"], report.salaries.total, report.salaries.count)}
            {renderTable("قرضه‌های صادر شده (خروجی)", report.loans.list, ["مبلغ", "باقی‌مانده", "کارمند", "تاریخ قرضه", "وضعیت"], report.loans.total, report.loans.count)}
          </div>
        </>
      )}
    </div>
  );
};

/* =========================================================
   ✅ loadXLSX — Dynamically loads SheetJS from CDN
   (only once per page load)
   ========================================================= */
let _xlsxPromise = null;
function loadXLSX() {
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
}

export default CombinedReport;