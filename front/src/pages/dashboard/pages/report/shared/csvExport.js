// src/components/financial/shared/csvExport.js
import moment from "moment-jalaali";

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

const esc = (v) => {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
};

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

export function downloadReportCSV(payload) {
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

  const lines = [];

  lines.push(`گزارش مالی, از ${shamsi(dateRange.from)} تا ${shamsi(dateRange.to)}`);
  lines.push(`تاریخ صدور, ${shamsi(new Date())}`);
  lines.push("");

  /* ---------- Summary ---------- */
  lines.push("### خلاصه مالی ###");
  lines.push(["مجموع عواید", summary.totalIncome].map(esc).join(","));
  lines.push(["مجموع خروجی", summary.totalOutflow].map(esc).join(","));
  lines.push(["مانده خالص", summary.balance].map(esc).join(","));
  lines.push(["باقیات معاشات", summary.unpaid].map(esc).join(","));
  lines.push(["باقیات مشتریان", summary.customerRemainder].map(esc).join(","));
  lines.push("");

  /* ---------- Receipts ---------- */
  lines.push("### رسیدها ###");
  lines.push(["#", "مبلغ", "مشتری", "تاریخ"].map(esc).join(","));
  receipts.forEach((r, i) => {
    lines.push(
      [
        i + 1,
        r.amount,
        r.name || r.Customer?.fullname || "—",
        shamsi(r.createdAt),
      ]
        .map(esc)
        .join(",")
    );
  });
  lines.push("");

  /* ---------- Valet Deposits ---------- */
  lines.push("### واریز سهام‌دارها ###");
  lines.push(["#", "مبلغ", "سهام‌دار", "تاریخ"].map(esc).join(","));
  valetDeposits.forEach((v, i) => {
    lines.push(
      [i + 1, v.amount, v.holderInfo?.fullName || "—", shamsi(v.createdAt)]
        .map(esc)
        .join(",")
    );
  });
  lines.push("");

  /* ---------- Expenses ---------- */
  lines.push("### مصارف ###");
  lines.push(["#", "مبلغ", "شرح", "تاریخ"].map(esc).join(","));
  expenses.forEach((e, i) => {
    lines.push(
      [i + 1, e.amount, e.description || "—", shamsi(e.createdAt)]
        .map(esc)
        .join(",")
    );
  });
  lines.push("");

  /* ---------- Paid Salaries ---------- */
  lines.push("### معاشات پرداخت‌شده ###");
  lines.push(["#", "مبلغ", "کارمند", "شرح", "تاریخ"].map(esc).join(","));
  paidSalaries.forEach((p, i) => {
    lines.push(
      [
        i + 1,
        p.amount,
        p.staffName || p.attendance?.staff?.name || "—",
        p.note || "—",
        shamsi(p.paidAt || p.createdAt),
      ]
        .map(esc)
        .join(",")
    );
  });
  lines.push("");

  /* ---------- Unpaid Lists ---------- */
  lines.push("### معاشات پرداخت‌نشده ###");
  lines.push(
    ["#", "نام لیست", "کل", "پرداخت‌شده", "باقی‌مانده", "تاریخ"].map(esc).join(",")
  );
  unpaidLists.forEach((u, i) => {
    const total = Number(u.total || 0);
    const paid = Number(u.paid || 0);
    lines.push(
      [
        i + 1,
        u.name || u.range || "—",
        total,
        paid,
        total - paid,
        shamsi(u.createdAt),
      ]
        .map(esc)
        .join(",")
    );
  });
  lines.push("");

  /* ---------- Customer Bills ---------- */
  lines.push("### باقیات مشتریان ###");
  lines.push(["#", "مشتری", "نوع", "باقی‌مانده", "تلفن"].map(esc).join(","));
  bills.forEach((b, i) => {
    lines.push(
      [
        i + 1,
        b.name || "—",
        b.customerType === "permanent" ? "دائمی" : "موقت",
        b.remaind,
        b.phoneNumber || "—",
      ]
        .map(esc)
        .join(",")
    );
  });

  const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  /* ✅ Shamsi filename */
  link.download = `Financial_Report_${shamsiFileSafe(dateRange.from)}_to_${shamsiFileSafe(dateRange.to)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}