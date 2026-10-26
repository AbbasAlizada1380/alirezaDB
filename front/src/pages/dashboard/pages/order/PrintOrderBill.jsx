// src/components/order/PrintOrderBill.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaSpinner, FaTimes } from "react-icons/fa";

// 👇 Same import pattern as CombinedReport.jsx
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

// 👇 Letterhead image, served from /public
const LETTERHEAD_URL = "/letterhead-a5.png";

const BASE_URL = import.meta.env.VITE_BASE_URL;

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* =========================================================
   A5 layout constants (in pt — A5 = 419.53 × 595.28 pt)
   ========================================================= */
const A5_W = 419.53;
const A5_H = 595.28;

// Where content is allowed (below the top banner, above the footer banner)
const TOP_SAFE = 178;   // ~63 mm
const BOTTOM_SAFE = 95;    // ~33 mm

// Horizontal margins
const MARGIN_L = 25;
const MARGIN_R = A5_W - 25;

/* =========================================================
   Letterhead helpers
   ========================================================= */
let _imgCache = null;
function loadImage(src) {
  if (_imgCache) return Promise.resolve(_imgCache);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      _imgCache = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

async function drawLetterhead(doc) {
  try {
    const img = await loadImage(LETTERHEAD_URL);
    doc.addImage(img, "PNG", 0, 0, A5_W, A5_H, undefined, "FAST");
  } catch (e) {
    console.warn("Letterhead not loaded:", e);
  }
}

/* =========================================================
   Component
   ========================================================= */
const PrintOrderBill = ({ isOpen, onClose, orderId }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  /* -------- Fetch bill -------- */
  useEffect(() => {
    if (!isOpen || !orderId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${BASE_URL}/bills/${orderId}`);
        if (!cancelled) setOrder(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
            err.message ||
            "خطا در دریافت اطلاعات بل"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, orderId]);

  /* -------- Helpers -------- */
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const cur = (n) => `${fmt(n)} افغانی`;

  /* -------- Generate PDF -------- */
  const generatePdf = async () => {
    if (!order) return;
    setGenerating(true);

    try {
      /* ---------- 1. Create jsPDF (A5) ---------- */
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a5" });

      /* ---------- 2. Embed Vazirmatn ---------- */
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn", "normal");

      /* ---------- 3. Prepare data ---------- */
      const items = Array.isArray(order.orders) ? order.orders : [];
      const total = items.reduce((s, o) => {
        const lineTotal =
          Number(o.total) > 0
            ? Number(o.total)
            : Number(o.price) * Number(o.quantity);
        return s + lineTotal;
      }, 0);

      const paid = Array.isArray(order.receipt)
        ? order.receipt.reduce((a, b) => a + Number(b || 0), 0)
        : Number(order.received || 0);
      const remained = total - paid;

      const today = moment().format("jYYYY/jMM/jDD");
      const billNumber = order.id ? fmt(order.id) : "ORD-XXXXXX";

      /* ---------------------------------------------------------
         4. Draw the letterhead as background of the FIRST page
         --------------------------------------------------------- */
      await drawLetterhead(doc);

      /* ---------------------------------------------------------
         5. Header text
         --------------------------------------------------------- */
      doc.setFontSize(10);
      doc.setFont("Vazirmatn", "normal");
      doc.text(`شماره بل: ${billNumber}`, A5_W / 2, TOP_SAFE, {
        align: "center",
      });

      const rowY = TOP_SAFE + 18;
      doc.setFontSize(9);

      // Right: customer name
      doc.text(
        `نام مشتری: ${order.name || order.customer?.name || "—"}`,
        MARGIN_R,
        rowY,
        { align: "right" }
      );

      // Center: phone
      const phone = order.phoneNumber || order.customer?.phone_number || "—";
      doc.text(`شماره تماس: ${phone}`, A5_W / 2, rowY, { align: "center" });

      // Left: date
      doc.text(`تاریخ: ${today}`, MARGIN_L, rowY, { align: "left" });

      /* ---------------------------------------------------------
         6. Items table via autoTable — RTL column order
            # (right) → شرح → تعداد → قیمت واحد → مبلغ (left)
         --------------------------------------------------------- */
      const body = items.map((o, i) => {
        const price = Number(o.price || 0);
        const qty = Number(o.quantity || 0);
        const lineTotal =
          Number(o.total) > 0 ? Number(o.total) : price * qty;

        const description =
          [
            o.jerseyType,
            o.size ? `سایز ${o.size}` : null,
            o.logo ? `لوگو: ${o.logo}` : null,
            o.athleteNumber ? `شماره: ${o.athleteNumber}` : null,
            o.codeNumber ? `کد: ${o.codeNumber}` : null,
          ]
            .filter(Boolean)
            .join(" | ") || "—";

        // Data order matches the header order (see below).
        // With `isRtl: true`, autoTable mirrors the layout so the
        // first array slot (#) lands on the RIGHT.
        return [
          (i + 1).toString(), // #
          description,        // شرح
          qty.toString(),     // تعداد
          fmt(price),         // قیمت واحد
          fmt(lineTotal),     // مبلغ
        ];
      });

      autoTable(doc, {
        startY: rowY + 18,
        head: [["مبلغ", "قیمت واحد", "تعداد", "شرح", "#"]],
        body: body.length
          ? body.map((row) => [...row].reverse())
          : [["—", "—", "—", "هیچ محصولی ثبت نشده است", "—"]],

        theme: "grid",

        // 👇👇 THIS is the key line — flips the entire table to RTL.
        //     Now `#` renders on the RIGHT and `مبلغ` on the LEFT,
        //     and multi-page head repeats stay in the correct order.
        isRtl: true,

        styles: {
          font: "Vazirmatn",
          fontSize: 9,
          halign: "center",
          valign: "middle",
          cellPadding: 4,
          lineColor: [120, 120, 120],
          lineWidth: 0.4,
          textColor: 20,
        },
        headStyles: {
          font: "Vazirmatn",
          fontStyle: "normal",
          fillColor: [235, 235, 235],
          textColor: 20,
          fontSize: 10,
          halign: "center",
          lineColor: [120, 120, 120],
          lineWidth: 0.4,
        },
        // Column widths stay in DATA order (# first, مبلغ last).
        // autoTable with isRtl:true mirrors them visually.
        columnStyles: {
          0: { cellWidth: 78, halign: "center" }, // مبلغ
          1: { cellWidth: 78, halign: "center" }, // قیمت واحد
          2: { cellWidth: 45, halign: "center" }, // تعداد
          3: { halign: "right" },                 // شرح
          4: { cellWidth: 28, halign: "center" }, // #
        },
        margin: {
          left: MARGIN_L,
          right: 25,
          top: TOP_SAFE,
          bottom: BOTTOM_SAFE,
        },
        showHead: "everyPage",
        didDrawPage: async (data) => {
          if (data.pageNumber > 1) {
            await drawLetterhead(doc);
          }
        },
      });

      /* ---------------------------------------------------------
         7. Financial summary — LAST PAGE ONLY, BOTTOM-ANCHORED
         --------------------------------------------------------- */
      const SUMMARY_ROW_H = 18;
      const SUMMARY_ROWS = 3;
      const SUMMARY_H = SUMMARY_ROWS * SUMMARY_ROW_H;

      const PAGE_BOTTOM_Y = A5_H - BOTTOM_SAFE;
      const BLOCK_BOTTOM = PAGE_BOTTOM_Y - 10;

      const summaryTopY = BLOCK_BOTTOM - SUMMARY_H;

      const tableEndY = doc.lastAutoTable?.finalY || TOP_SAFE;

      const needNewPage = summaryTopY < tableEndY + 15;

      let summaryY;

      if (needNewPage) {
        doc.addPage();
        await drawLetterhead(doc);
        summaryY = BLOCK_BOTTOM - SUMMARY_H;
      } else {
        summaryY = summaryTopY;
      }

      /* ---------- Summary rows (right-aligned) ---------- */
      const rightX = MARGIN_R;
      const labelX = rightX - 95;

      doc.setFontSize(10);
      doc.setFont("Vazirmatn", "normal");
      doc.setTextColor(20);

      // Row 1 — Total
      doc.text("مجموع کل:", labelX, summaryY, { align: "right" });
      doc.text(cur(total), rightX, summaryY, { align: "right" });
      summaryY += SUMMARY_ROW_H;

      // Row 2 — Paid
      doc.text("مقدار پرداختی:", labelX, summaryY, { align: "right" });
      doc.text(cur(paid), rightX, summaryY, { align: "right" });
      summaryY += SUMMARY_ROW_H;

      // Row 3 — Remaining
      doc.text("باقیمانده:", labelX, summaryY, { align: "right" });
      doc.text(cur(remained), rightX, summaryY, { align: "right" });
      summaryY += SUMMARY_ROW_H;

      /* ---------------------------------------------------------
         8. Signature — dashed line + "امضاء" on the LEFT
         --------------------------------------------------------- */
      const sigLineY = summaryTopY + SUMMARY_H - 4;

      const sigLineWidth = 130;
      const sigLeftX = MARGIN_L + 15;
      const sigRightX = sigLeftX + sigLineWidth;

      doc.setDrawColor(120);
      doc.setLineWidth(0.6);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(sigLeftX, sigLineY, sigRightX, sigLineY);
      doc.setLineDashPattern([], 0);

      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(
        "امضاء",
        (sigLeftX + sigRightX) / 2,
        sigLineY + 12,
        { align: "center" }
      );

      /* ---------------------------------------------------------
         9. Footer page numbers — only if > 1 page
         --------------------------------------------------------- */
      const pageCount = doc.internal.getNumberOfPages();
      if (pageCount > 1) {
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setFont("Vazirmatn", "normal");
          doc.setTextColor(120);
          doc.text(
            `صفحه ${i} از ${pageCount}`,
            A5_W / 2,
            A5_H - BOTTOM_SAFE + 10,
            { align: "center" }
          );
        }
      }

      /* ---------------------------------------------------------
         10. Save & close
         --------------------------------------------------------- */
      doc.save(`bill_${order.id || "unknown"}.pdf`);
      onClose?.();
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("خطا در ساخت فایل PDF");
    } finally {
      setGenerating(false);
    }
  };

  /* -------- Auto-generate when order is loaded -------- */
  useEffect(() => {
    if (!isOpen || !order) return;
    const t = setTimeout(() => generatePdf(), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order]);

  if (error || !order) {
    return (
      <div>

      </div>
    );
  }

  return null;
};

export default PrintOrderBill;