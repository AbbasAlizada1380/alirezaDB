// src/components/financial/shared/excelExport.js
import moment from "moment-jalaali";

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

let _xlsxPromise = null;
function loadXLSX() {
  if (_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Failed to load SheetJS"));
    document.head.appendChild(script);
  });
  return _xlsxPromise;
}

/* ✅ Shamsi formatter for export cells */
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

export async function downloadReportExcel(payload) {
  const XLSX = await loadXLSX();
  const {
    dateRange,
    summary,
    receipts,
    valetDeposits,
    expenses,
    paidSalaries,
    unpaidLists,
    bills,
  } = payload;

  const wb = XLSX.utils.book_new();

  /* ---------- 1. Summary sheet ---------- */
  const summaryRows = [
    ["گزارش مالی", "", ""],
    ["از", shamsi(dateRange.from), ""],
    ["تا", shamsi(dateRange.to), ""],
    ["تاریخ صدور", shamsi(new Date()), ""],
    ["", "", ""],
    ["مجموع عواید", summary.totalIncome, "افغانی"],
    ["مجموع خروجی", summary.totalOutflow, "افغانی"],
    ["مانده خالص", summary.balance, "افغانی"],
    ["باقیات معاشات", summary.unpaid, "افغانی"],
    ["باقیات مشتریان", summary.customerRemainder, "افغانی"],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, "خلاصه");

  /* ---------- 2. Receipts ---------- */
  if (receipts.length) {
    const rows = [
      ["#", "مبلغ", "مشتری", "تاریخ"],
      ...receipts.map((r, i) => [
        i + 1,
        Number(r.amount || 0),
        r.name || r.Customer?.fullname || "—",
        shamsi(r.createdAt),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 25 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "رسیدها");
  }

  /* ---------- 3. Valet Deposits ---------- */
  if (valetDeposits.length) {
    const rows = [
      ["#", "مبلغ", "حامل", "تاریخ"],
      ...valetDeposits.map((v, i) => [
        i + 1,
        Number(v.amount || 0),
        v.holderInfo?.fullName || "—",
        shamsi(v.createdAt),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 25 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "واریز سهام‌دارها");
  }

  /* ---------- 4. Expenses ---------- */
  if (expenses.length) {
    const rows = [
      ["#", "مبلغ", "شرح", "تاریخ"],
      ...expenses.map((e, i) => [
        i + 1,
        Number(e.amount || 0),
        e.description || "—",
        shamsi(e.createdAt),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 35 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "مصارف");
  }

  /* ---------- 5. Paid Salaries ---------- */
  if (paidSalaries.length) {
    const rows = [
      ["#", "مبلغ", "کارمند", "شرح", "تاریخ"],
      ...paidSalaries.map((p, i) => [
        i + 1,
        Number(p.amount || 0),
        p.staffName || p.attendance?.staff?.name || "—",
        p.note || "—",
        shamsi(p.paidAt || p.createdAt),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 25 }, { wch: 25 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "معاشات پرداخت‌شده");
  }

  /* ---------- 6. Unpaid Lists ---------- */
  if (unpaidLists.length) {
    const rows = [
      ["#", "نام لیست", "کل", "پرداخت‌شده", "باقی‌مانده", "تاریخ"],
      ...unpaidLists.map((u, i) => {
        const total = Number(u.total || 0);
        const paid = Number(u.paid || 0);
        return [
          i + 1,
          u.name || u.range || "—",
          total,
          paid,
          total - paid,
          shamsi(u.createdAt),
        ];
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "معاشات پرداخت‌نشده");
  }

  /* ---------- 7. Customer Bills ---------- */
  if (bills.length) {
    const rows = [
      ["#", "مشتری", "نوع", "باقی‌مانده", "تلفن"],
      ...bills.map((b, i) => [
        i + 1,
        b.name || "—",
        b.customerType === "permanent" ? "دائمی" : "موقت",
        Number(b.remaind || 0),
        b.phoneNumber || "—",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 25 }, { wch: 10 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, "باقیات مشتریان");
  }

  /* ✅ Shamsi filename */
  XLSX.writeFile(
    wb,
    `Financial_Report_${shamsiFileSafe(dateRange.from)}_to_${shamsiFileSafe(dateRange.to)}.xlsx`
  );
}