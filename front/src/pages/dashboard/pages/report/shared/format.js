// src/components/financial/shared/format.js
import moment from "moment-jalaali";

/* ✅ Load Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* =========================================================
   Currency & Number
   ========================================================= */

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "۰ افغانی";
  return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
};

export const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "۰";
  return new Intl.NumberFormat("en-US").format(Number(n));
};

/* =========================================================
   Gregorian date formatting (kept for backward compatibility)
   ========================================================= */

export const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(d));
  } catch {
    return "—";
  }
};

export const formatDayLabel = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dt);
  } catch {
    return dateStr;
  }
};

/* =========================================================
   ✅ Hijri Shamsi (Jalaali) formatting
   ========================================================= */

/**
 * Format a date as Shamsi "1404/07/13".
 * Accepts: JS Date, ISO string, "YYYY-MM-DD", or any Date-parseable value.
 */
export const formatShamsi = (date) => {
  if (!date) return "—";
  try {
    return moment(date).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

/**
 * Format as Shamsi with full month name: "13 میزان 1404"
 */
export const formatShamsiLong = (date) => {
  if (!date) return "—";
  try {
    return moment(date).format("jDD jMMMM jYYYY");
  } catch {
    return "—";
  }
};

/**
 * Format as Shamsi with weekday: "جمعه 13 میزان 1404"
 */
export const formatShamsiWithWeekday = (date) => {
  if (!date) return "—";
  try {
    return moment(date).format("dddd jDD jMMMM jYYYY");
  } catch {
    return "—";
  }
};

/**
 * Same as formatDayLabel but in Shamsi.
 * Takes a "YYYY-MM-DD" string (as returned by /reports/paid/daily endpoint).
 */
export const formatDayLabelShamsi = (dateStr) => {
  if (!dateStr) return "—";
  try {
    /* The daily endpoint returns "YYYY-MM-DD" strings */
    return moment(dateStr).format("dddd jDD jMMMM jYYYY");
  } catch {
    return dateStr;
  }
};

/**
 * Get today's date as Shamsi string ("1404/07/13").
 */
export const todayShamsi = () => {
  return moment().format("jYYYY/jMM/jDD");
};

/**
 * Get the current Shamsi month name ("میزان", "حمل", etc.)
 */
export const currentShamsiMonthName = () => {
  return moment().format("jMMMM");
};

/* =========================================================
   ✅ Conversions between Shamsi and Gregorian
   ========================================================= */

/**
 * Shamsi string "1404/07/13" → JS Date object
 */
export const shamsiToDate = (shamsiStr) => {
  if (!shamsiStr) return null;
  try {
    const [jy, jm, jd] = shamsiStr.split("/").map(Number);
    if (!jy || !jm || !jd) return null;
    return moment(`${jy}/${jm}/${jd}`, "jYYYY/jMM/jDD").toDate();
  } catch {
    return null;
  }
};

/**
 * JS Date → Shamsi string
 */
export const dateToShamsi = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("jYYYY/jMM/jDD");
  } catch {
    return "";
  }
};

/* =========================================================
   Gregorian ISO (for API calls — unchanged)
   ========================================================= */

export const toLocalISODate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* =========================================================
   Default range — now based on the current Shamsi month
   ========================================================= */

/**
 * Returns { start, end } where:
 *   start = first day of the current Shamsi month (e.g. 1404/07/01)
 *   end   = today
 *
 * Both are JS Date objects so existing DatePicker / API code
 * continues to work without changes.
 */
export const getDefaultRange = () => {
  const start = moment().startOf("jMonth").toDate();
  const end = new Date();
  return { start, end };
};

/* =========================================================
   Optional: Persian digit conversion
   ========================================================= */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/**
 * Convert Latin digits to Persian digits.
 * Use this only for display — never for API payloads.
 */
export const toPersianDigits = (value) => {
  if (value === null || value === undefined) return value;
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
};

/* =========================================================
   Shamsi month names (for custom DatePicker header)
   ========================================================= */

export const SHAMSI_MONTHS = [
  "حمل",
  "ثور",
  "جوزا",
  "سرطان",
  "اسد",
  "سنبله",
  "میزان",
  "عقرب",
  "قوس",
  "جدی",
  "دلو",
  "حوت",
];

export const SHAMSI_WEEKDAYS_SHORT = [
  "ش",
  "ی",
  "د",
  "س",
  "چ",
  "پ",
  "ج",
];