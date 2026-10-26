// src/components/bills/utils/pdfPagination.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ---------- Tunable layout constants (A5) ---------- */
export const ROWS_FIRST_PAGE = 12;
export const ROWS_OTHER_PAGE = 20;

/**
 * Split an array of <tr> elements into A5 pages.
 * Page 1 holds ROWS_FIRST_PAGE rows (leaves room for customer header),
 * subsequent pages hold ROWS_OTHER_PAGE.
 */
export function chunkRows(rows) {
  if (!rows.length) return [[]];
  const pages = [];
  let cursor = 0;

  pages.push(rows.slice(cursor, cursor + ROWS_FIRST_PAGE));
  cursor += ROWS_FIRST_PAGE;

  while (cursor < rows.length) {
    pages.push(rows.slice(cursor, cursor + ROWS_OTHER_PAGE));
    cursor += ROWS_OTHER_PAGE;
  }

  return pages;
}

/**
 * Force a table (and its header/body cells) to render RTL,
 * so the first column appears on the RIGHT — the correct
 * reading order for a Persian bill.
 */
function forceRtlTable(table) {
  // 1. Direction on the table itself. The browser will lay out
  //    cells right-to-left automatically.
  table.setAttribute("dir", "rtl");
  table.style.direction = "rtl";
  table.style.textAlign = "right";

  // 2. Make sure header + body cells inherit the RTL alignment.
  table.querySelectorAll("th, td").forEach((cell) => {
    cell.style.direction = "rtl";
    cell.style.textAlign = "right";
  });

  // 3. If the original table used explicit inline `text-align:center`
  //    for certain columns, keep that centered — only override the
  //    default left alignment.
  const headCells = table.querySelectorAll("thead th");
  headCells.forEach((th) => {
    // keep numeric columns centered if they were centered before
    const original = th.getAttribute("data-align") || th.style.textAlign;
    if (original === "center") {
      th.style.textAlign = "center";
    }
  });
}

/**
 * Build a hidden A5 node containing a cloned table with only `rows`.
 */
export function buildPageNode({ table, rows, pageIdx, totalPages, meta }) {
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    width: "148mm",
    height: "210mm",
    background: "#ffffff",
    direction: "rtl",
    fontFamily: "'Vazirmatn','Tahoma',sans-serif",
    color: "#111",
    position: "relative",
    boxSizing: "border-box",
  });

  const inner = document.createElement("div");
  Object.assign(inner.style, {
    height: "100%",
    paddingTop: "50mm",
    paddingBottom: "30mm",
    paddingLeft: "10mm",
    paddingRight: "10mm",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  });
  wrapper.appendChild(inner);

  /* ---------- Header block ---------- */
  const header = document.createElement("div");
  header.style.fontSize = "10px";
  header.style.marginBottom = "8px";

  if (pageIdx === 0) {
    header.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:2px;padding-bottom:4px;">
        <span><b>شماره بل:</b> ${meta.billNumber}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px 12px;padding-top:4px;">
        <div><b>نام مشتری :</b> ${meta.customerName}</div>
        <div><b>شماره تماس:</b> <span dir="ltr">${meta.phone}</span></div>
        <div><b>تاریخ:</b> ${meta.today}</div>
      </div>`;
  } else {
    header.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;">شماره بل: ${meta.billNumber}</span>
        <span style="color:#555;">ادامه اقلام — صفحه ${meta.fmt(pageIdx + 1)}</span>
      </div>`;
  }
  inner.appendChild(header);

  /* ---------- Table clone ---------- */
  const tableClone = table.cloneNode(true);

  // remove anything flagged data-pdf-hide (e.g. Actions column)
  tableClone.querySelectorAll("[data-pdf-hide]").forEach((el) => el.remove());

  // 👇 Reverse the column order so # appears on the RIGHT
  forceRtlTable(tableClone);

  const tbody = tableClone.querySelector("tbody");
  [...tbody.querySelectorAll("tr")].forEach((r) => r.remove());
  rows.forEach((r) => {
    const clone = r.cloneNode(true);
    clone.querySelectorAll("[data-pdf-hide]").forEach((el) => el.remove());
    // ensure each row inherits RTL on its cells too
    clone.querySelectorAll("th, td").forEach((cell) => {
      cell.style.direction = "rtl";
      // preserve explicitly centered cells
      if (!cell.style.textAlign || cell.style.textAlign === "left") {
        cell.style.textAlign = "right";
      }
    });
    tbody.appendChild(clone);
  });

  const tableWrap = document.createElement("div");
  tableWrap.style.flex = "1";
  tableWrap.appendChild(tableClone);
  inner.appendChild(tableWrap);

  /* ---------- Summary (last page only) ---------- */
  if (pageIdx === totalPages - 1 && meta.summaryHtml) {
    const summary = document.createElement("div");
    summary.style.marginTop = "12px";
    summary.style.fontSize = "10px";
    summary.innerHTML = meta.summaryHtml;
    inner.appendChild(summary);
  }

  /* ---------- Page number ---------- */
  const pager = document.createElement("div");
  Object.assign(pager.style, {
    marginTop: "8px",
    textAlign: "center",
    fontSize: "9px",
    color: "#777",
  });
  pager.textContent = `صفحه ${meta.fmt(pageIdx + 1)} از ${meta.fmt(totalPages)}`;
  inner.appendChild(pager);

  return wrapper;
}

/**
 * Render the given live <table> to an A5 PDF.
 */
export async function renderTableToPdf({ table, meta, onProgress }) {
  const rows = [...table.querySelectorAll("tbody tr")].filter(
    (r) => !r.dataset.placeholder
  );
  const pages = chunkRows(rows);
  const totalPages = pages.length;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();   // 148 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 210 mm
  const SCALE = 3;

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, totalPages);

    const node = buildPageNode({
      table,
      rows: pages[i],
      pageIdx: i,
      totalPages,
      meta,
    });

    // attach off-screen so html2canvas can measure it
    node.style.position = "fixed";
    node.style.left = "-10000px";
    node.style.top = "0";
    document.body.appendChild(node);

    try {
      const canvas = await html2canvas(node, {
        scale: SCALE,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage("a5", "portrait");
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    } finally {
      document.body.removeChild(node);
    }
  }

  return pdf;
}