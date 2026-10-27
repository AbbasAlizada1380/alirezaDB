import { Bill, Order, Customer, Receipt } from "../../Models/index.js";
import {sequelize} from "../../Models/index.js";        // ← NOT the Sequelize instance
import { Op, fn, col, where as sequelizeWhere, cast, col as sequelizeCol } from "sequelize";
export const payPermanentCustomer = async (req, res) => {
  const transaction = await Bill.sequelize.transaction();

  try {
    const { customer, amount, description = null } = req.body;

    /* ---- 1. Validate input ---- */
    if (!customer) {
      await transaction.rollback();
      return res.status(400).json({ message: "شناسه مشتری الزامی است" });
    }
    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "مبلغ نامعتبر است" });
    }

    /* ---- 2. Confirm customer ---- */
    const cust = await Customer.findByPk(customer, { transaction });
    if (!cust) {
      await transaction.rollback();
      return res.status(404).json({ message: "مشتری یافت نشد" });
    }
    if (!cust.isActive) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "مشتری غیرفعال است و نمی‌تواند پرداخت کند" });
    }

    /* ---- 3. Fetch outstanding bills, oldest first ---- */
    const bills = await Bill.findAll({
      where: {
        customer,
        customerType: "permanent",
        status: { [Op.in]: ["unpaid", "partial"] },
      },
      order: [["createdAt", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (bills.length === 0) {
      await transaction.rollback();
      return res.status(200).json({
        success: true,
        message: "هیچ بل پرداخت‌نشده‌ای برای این مشتری وجود ندارد",
        allocations: [],
        remaining: payAmount,
      });
    }

    /* ---- 4. Allocate FIFO across bills ---- */
    let remaining = payAmount;
    const allocations = [];

    for (const bill of bills) {
      if (remaining <= 0) break;

      const owe = Number(bill.remaind);
      if (owe <= 0) continue;

      const slice = Math.min(owe, remaining);
      remaining -= slice;

      const currentReceipts = Array.isArray(bill.receipt)
        ? bill.receipt
        : [];
      const nextReceipts = [...currentReceipts, slice];

      // Update the bill — the beforeSave hook recomputes remaind + status
      await bill.update({ receipt: nextReceipts }, { transaction });

      allocations.push({
        billId: bill.id,
        amount: slice,
        billStatusAfter: bill.status,
        billRemaindAfter: Number(bill.remaind),
      });
    }

    /* ---- 5. Create ONE Receipt row for the whole payment ---- */
    const paidAmount = payAmount - remaining;

    // Build a description that lists the per-bill breakdown, unless
    // the caller supplied their own description.
    const breakdown = allocations
      .map((a) => `بل #${a.billId}: ${Number(a.amount).toLocaleString()} افغانی`)
      .join("، ");

    const autoDescription =
      `پرداخت از مشتری دائم — ${cust.fullname}${
        cust.phoneNumber ? ` (${cust.phoneNumber})` : ""
      } — ${breakdown}`;

    const receipt = await Receipt.create(
      {
        amount: paidAmount,
        name: cust.fullname,
        description: description?.trim() || autoDescription,
        customer: cust.id,
      },
      { transaction }
    );

    /* ---- 6. Commit ---- */
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "پرداخت با موفقیت ثبت شد",
      customer: {
        id: cust.id,
        fullname: cust.fullname,
      },
      receiptId: receipt.id,
      paid: paidAmount,
      unallocated: remaining,
      allocations,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("payPermanentCustomer error:", error);
    return res.status(500).json({
      success: false,
      message: "خطا در ثبت پرداخت",
      error: error.message,
    });
  }
};

/* =========================================================
   Build the description string used to identify a Receipt
   as belonging to a specific bill.
   ========================================================= */
function buildReceiptDescription(bill) {
  const label =
    bill.customerType === "permanent" ? "مشتری دائم" : "مشتری موقت";
  return `پرداخت از ${label} — ${bill.name}${
    bill.phoneNumber ? ` (${bill.phoneNumber})` : ""
  } — بل #${bill.id}`;
}

/* =========================================================
   Create Receipt rows for a NEW bill.
   Accepts bill.receipt as either:
     - array of numbers:  [1000, 500]
     - array of objects:  [{ amount: 1000 }, { amount: 500 }]
   ========================================================= */
async function recordReceiptsForBill(bill, transaction) {
  const raw = Array.isArray(bill.receipt) ? bill.receipt : [];
  if (raw.length === 0) return [];

  const amounts = raw
    .map((r) => (typeof r === "object" ? Number(r.amount) : Number(r)))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (amounts.length === 0) return [];

  const description = buildReceiptDescription(bill);

  const rows = amounts.map((amount) => ({
    amount,
    name: bill.name,
    description,
    customer: bill.customerType === "permanent" ? bill.customer : null,
  }));

  return Receipt.bulkCreate(rows, { transaction });
}

/* =========================================================
   Diff an edited bill's receipt array against the previous one.

   Handles every case correctly:

     previous = [1000]           new = [1000, 500]  → create 500
     previous = [1000]           new = [1500]        → delete 1000, create 1500
     previous = [1000, 500]      new = [1000]        → delete 500
     previous = [1000, 500]      new = [1000, 500]   → no-op
     previous = [1000, 500]      new = [500, 1000]   → no-op (order-independent)

   How it works:
     1. Find all Receipt rows tied to this bill (via description marker).
     2. Match old amounts with old rows (by amount, oldest-first).
     3. Any old row whose amount doesn't appear in the new array → delete it.
     4. Any new amount not accounted for by an existing old row → create it.
   ========================================================= */
async function syncReceiptsForBill(bill, previousAmounts, transaction) {
  const newRaw = Array.isArray(bill.receipt) ? bill.receipt : [];

  const newAmounts = newRaw
    .map((r) => (typeof r === "object" ? Number(r.amount) : Number(r)))
    .filter((n) => Number.isFinite(n) && n > 0);

  const oldAmounts = (Array.isArray(previousAmounts) ? previousAmounts : [])
    .map((r) => (typeof r === "object" ? Number(r.amount) : Number(r)))
    .filter((n) => Number.isFinite(n) && n > 0);

  // Fetch the existing rows for this bill
  const description = buildReceiptDescription(bill);
  const existingRows = await Receipt.findAll({
    where: { description },
    order: [["id", "ASC"]],
    transaction,
  });

  /* -----------------------------------------------------
     Step 1: Mark existing rows that match a new amount.
     We use a multiset approach: each row can be "consumed"
     by at most one new amount.
     ----------------------------------------------------- */
  const remainingNew = [...newAmounts];
  const rowsToKeep = new Set();

  for (const row of existingRows) {
    const rowAmount = Number(row.amount);
    const idx = remainingNew.indexOf(rowAmount);
    if (idx !== -1) {
      // This row matches one of the new amounts → keep it
      rowsToKeep.add(row.id);
      remainingNew.splice(idx, 1);
    }
  }

  /* -----------------------------------------------------
     Step 2: Delete existing rows that weren't matched.
     ----------------------------------------------------- */
  const rowsToDelete = existingRows
    .filter((r) => !rowsToKeep.has(r.id))
    .map((r) => r.id);

  if (rowsToDelete.length > 0) {
    await Receipt.destroy({
      where: { id: { [Op.in]: rowsToDelete } },
      transaction,
    });
  }

  /* -----------------------------------------------------
     Step 3: Create rows for the remaining new amounts.
     ----------------------------------------------------- */
  if (remainingNew.length > 0) {
    await Receipt.bulkCreate(
      remainingNew.map((amount) => ({
        amount,
        name: bill.name,
        description,
        customer: bill.customerType === "permanent" ? bill.customer : null,
      })),
      { transaction }
    );
  }
}

/* =========================================================
   Temporary debtors
   ========================================================= */
export const getTemporaryDebtors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const where = {
      customerType: "temporary",
      status: { [Op.in]: ["unpaid", "partial"] },
    };
   if (req.query.q && String(req.query.q).trim()) {
      const q = String(req.query.q).trim();
      const numeric = Number(q);
      const searchConditions = [
        { name: { [Op.like]: `%${q}%` } },
        { phoneNumber: { [Op.like]: `%${q}%` } },
      ];
      if (Number.isFinite(numeric) && numeric > 0) {
        searchConditions.push({ id: numeric });
      }
      where[Op.and] = [{ [Op.or]: searchConditions }];
    }

    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) {
        const f = new Date(req.query.from);
        f.setHours(0, 0, 0, 0);
        where.createdAt[Op.gte] = f;
      }
      if (req.query.to) {
        const t = new Date(req.query.to);
        t.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = t;
      }
    }
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) {
        const f = new Date(req.query.from);
        f.setHours(0, 0, 0, 0);
        where.createdAt[Op.gte] = f;
      }
      if (req.query.to) {
        const t = new Date(req.query.to);
        t.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = t;
      }
    }

    const { count, rows } = await Bill.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const aggregates = await Bill.findOne({
      where,
      attributes: [
        [fn("COUNT", col("id")), "totalBills"],
        [fn("SUM", col("total")), "totalAmount"],
        [fn("SUM", col("remaind")), "totalRemaining"],
      ],
      raw: true,
    });

    const totalPaid =
      Number(aggregates?.totalAmount || 0) -
      Number(aggregates?.totalRemaining || 0);

    const [unpaidCount, partialCount] = await Promise.all([
      Bill.count({ where: { ...where, status: "unpaid" } }),
      Bill.count({ where: { ...where, status: "partial" } }),
    ]);

    res.json({
      bills: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
      summary: {
        totalBills: Number(aggregates?.totalBills || 0),
        totalAmount: Number(aggregates?.totalAmount || 0),
        totalRemaining: Number(aggregates?.totalRemaining || 0),
        totalPaid,
        unpaidCount,
        partialCount,
      },
    });
  } catch (error) {
    console.error("getTemporaryDebtors error:", error);
    res.status(500).json({
      message: "خطا در دریافت حساب‌های مشتریان موقت",
      error: error.message,
    });
  }
};

/* =========================================================
   Create Bill
   ========================================================= */
export const createBill = async (req, res) => {
  const transaction = await Bill.sequelize.transaction();
  try {
    const {
      customerType = "temporary",
      customer = null,
      name,
      phoneNumber = null,
      total = 0,
      receipt = [],
      orders = [],
    } = req.body;

    if (!name) {
      await transaction.rollback();
      return res.status(400).json({ message: "نام مشتری الزامی است" });
    }

    if (!["permanent", "temporary"].includes(customerType)) {
      await transaction.rollback();
      return res.status(400).json({ message: "نوع مشتری نامعتبر است" });
    }

    if (customerType === "permanent" && !customer) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "مشتری دائم باید به یک مشتری متصل باشد" });
    }

    const bill = await Bill.create(
      {
        customerType,
        customer: customerType === "permanent" ? customer : null,
        name,
        phoneNumber,
        total,
        receipt,
      },
      { transaction }
    );

    if (Array.isArray(orders) && orders.length > 0) {
      await Order.bulkCreate(
        orders.map((o) => ({ ...o, billNumber: bill.id })),
        { transaction }
      );

      const totalFromOrders = orders.reduce(
        (sum, o) => sum + Number(o.price || 0) * Number(o.quantity || 0),
        0
      );
      await bill.update({ total: totalFromOrders }, { transaction });
    }

    await recordReceiptsForBill(bill, transaction);

    await transaction.commit();

    const full = await Bill.findByPk(bill.id, {
      include: [{ model: Order, as: "orders" }],
    });

    res.status(201).json({
      success: true,
      message: "بل با موفقیت ثبت شد",
      bill: full,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("createBill error:", error);
    res.status(500).json({
      success: false,
      message: "خطا در ثبت بل",
      error: error.message,
    });
  }
};


/* =========================================================
   Get Bills — paginated + filters + search
   
   Query params:
     page         - default 1
     limit        - default 10
     customerType - "permanent" | "temporary"
     customer     - customer id
     status       - comma-separated: "unpaid,partial"
     q            - search across name, phone, id
     from / to    - date range (YYYY-MM-DD)
   ========================================================= */
export const getBills = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = {};

    if (req.query.customerType) where.customerType = req.query.customerType;
    if (req.query.customer) where.customer = req.query.customer;

    if (req.query.status) {
      const statuses = String(req.query.status)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      where.status =
        statuses.length === 1 ? statuses[0] : { [Op.in]: statuses };
    }

    /* =========================================================
       ✅ SEARCH — name, phoneNumber, and bill id
       
       Rules:
         - Match any bill whose name OR phoneNumber contains `q` (LIKE %q%)
         - ALSO match if `q` is numeric → include exact bill id
         - ALSO match if `q` starts with "#" → strip and match id
    ========================================================= */
    if (req.query.q && String(req.query.q).trim()) {
      const raw = String(req.query.q).trim();
      const numericOnly = raw.replace(/^#/, ""); // allow "#42"
      const numeric = Number(numericOnly);

      const searchConditions = [
        { name: { [Op.like]: `%${raw}%` } },
        { phoneNumber: { [Op.like]: `%${raw}%` } },
      ];

      /* ✅ If q is numeric (or "#42"), also match bill id */
      if (Number.isFinite(numeric) && numeric > 0) {
        searchConditions.push({ id: numeric });
      }

      /* ✅ If q contains only digits, also match id cast to string */
if (/^\d+$/.test(numericOnly)) {
  searchConditions.push(
    sequelizeWhere(cast(sequelizeCol("Bill.id"), "CHAR"), {
      [Op.like]: `%${numericOnly}%`,
    })
  );
}

      where[Op.and] = [
        ...(where[Op.and] || []),
        { [Op.or]: searchConditions },
      ];
    }

    /* ✅ Date range */
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) {
        const from = new Date(req.query.from);
        from.setHours(0, 0, 0, 0);
        where.createdAt[Op.gte] = from;
      }
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = to;
      }
    }

    const { count, rows } = await Bill.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      bills: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
      filters: {
        q: req.query.q || null,
        status: req.query.status || null,
        from: req.query.from || null,
        to: req.query.to || null,
        customer: req.query.customer || null,
      },
    });
  } catch (error) {
    console.error("getBills error:", error);
    res.status(500).json({
      message: "خطا در دریافت بل‌ها",
      error: error.message,
    });
  }
};

/* =========================================================
   Get Bill by ID
   ========================================================= */
export const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [{ model: Order, as: "orders", order: [["id", "ASC"]] }],
    });

    if (!bill) {
      return res.status(404).json({ message: "بل یافت نشد" });
    }

    res.json(bill);
  } catch (error) {
    console.error("getBillById error:", error);
    res.status(500).json({
      message: "خطا در دریافت بل",
      error: error.message,
    });
  }
};

/* =========================================================
   Update Bill — now diffs receipts instead of replacing them
   ========================================================= */
export const updateBill = async (req, res) => {
  const transaction = await Bill.sequelize.transaction();
  try {
    const bill = await Bill.findByPk(req.params.id, { transaction });
    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ message: "بل یافت نشد" });
    }

    const {
      customerType,
      customer,
      name,
      phoneNumber,
      total,
      receipt,
      orders,
    } = req.body;

    /* Capture the OLD receipt array before updating */
    const previousReceipt = Array.isArray(bill.receipt)
      ? [...bill.receipt]
      : [];

    /* 1. Update bill fields (this may change bill.receipt) */
    await bill.update(
      {
        customerType: customerType ?? bill.customerType,
        customer:
          customerType === "temporary"
            ? null
            : customer !== undefined
            ? customer
            : bill.customer,
        name: name ?? bill.name,
        phoneNumber: phoneNumber ?? bill.phoneNumber,
        total: total ?? bill.total,
        receipt: receipt ?? bill.receipt,
      },
      { transaction }
    );

    /* 2. Replace orders if provided */
    if (Array.isArray(orders)) {
      await Order.destroy({
        where: { billNumber: bill.id },
        transaction,
      });

      if (orders.length > 0) {
        await Order.bulkCreate(
          orders.map((o) => ({
            ...o,
            billNumber: bill.id,
            quantity: Number(o.quantity) || 1,
            price: Number(o.price) || 0,
          })),
          { transaction }
        );
      }

      const totalFromOrders = orders.reduce(
        (sum, o) => sum + Number(o.price || 0) * Number(o.quantity || 0),
        0
      );
      await bill.update({ total: totalFromOrders }, { transaction });
    }

    /* 3. ✅ Diff receipts: create new, delete removed, keep unchanged */
    if (receipt !== undefined) {
      await syncReceiptsForBill(bill, previousReceipt, transaction);
    }

    await transaction.commit();

    const full = await Bill.findByPk(bill.id, {
      include: [{ model: Order, as: "orders" }],
    });

    res.json({
      success: true,
      message: "بل با موفقیت به‌روزرسانی شد",
      bill: full,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("updateBill error:", error);
    res.status(500).json({
      success: false,
      message: "خطا در به‌روزرسانی بل",
      error: error.message,
    });
  }
};

/* =========================================================
   Partial update
   ========================================================= */
export const updateBillProperties = async (req, res) => {
  const transaction = await Bill.sequelize.transaction();
  try {
    const bill = await Bill.findByPk(req.params.id, { transaction });
    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ message: "بل یافت نشد" });
    }

    const allowed = [
      "customerType",
      "customer",
      "name",
      "phoneNumber",
      "total",
      "receipt",
    ];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const previousReceipt = Array.isArray(bill.receipt)
      ? [...bill.receipt]
      : [];

    await bill.update(updates, { transaction });

    /* If receipt was part of the update, diff it */
    if ("receipt" in updates) {
      await syncReceiptsForBill(bill, previousReceipt, transaction);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "بل با موفقیت به‌روزرسانی شد",
      bill,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("updateBillProperties error:", error);
    res.status(500).json({
      message: "خطا در به‌روزرسانی بل",
      error: error.message,
    });
  }
};

/* =========================================================
   Add payment — appends one amount, creates one Receipt row
   ========================================================= */
export const addPayment = async (req, res) => {
  const transaction = await Bill.sequelize.transaction();
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "مبلغ نامعتبر است" });
    }

    const bill = await Bill.findByPk(req.params.id, { transaction });
    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ message: "بل یافت نشد" });
    }

    const current = Array.isArray(bill.receipt) ? bill.receipt : [];
    const next = [...current, Number(amount)];

    await bill.update({ receipt: next }, { transaction });

    await Receipt.create(
      {
        amount: Number(amount),
        name: bill.name,
        description: buildReceiptDescription(bill),
        customer: bill.customerType === "permanent" ? bill.customer : null,
      },
      { transaction }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: "پرداخت ثبت شد",
      bill,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("addPayment error:", error);
    res.status(500).json({
      message: "خطا در ثبت پرداخت",
      error: error.message,
    });
  }
};

/* =========================================================
   Delete Bill — detaches Receipt rows, keeps history
   ========================================================= */
export const deleteBill = async (req, res) => {
  const transaction = await Bill.sequelize.transaction();
  try {
    const bill = await Bill.findByPk(req.params.id, { transaction });
    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ message: "بل یافت نشد" });
    }

    await Order.update(
      { billNumber: null },
      { where: { billNumber: bill.id }, transaction }
    );

    await Receipt.update(
      { customer: null },
      {
        where: { description: buildReceiptDescription(bill) },
        transaction,
      }
    );

    await bill.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "بل با موفقیت حذف شد",
      deletedId: bill.id,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("deleteBill error:", error);
    res.status(500).json({
      message: "خطا در حذف بل",
      error: error.message,
    });
  }
};

/* =========================================================
   Search Bills
   ========================================================= */
export const searchBills = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: "عبارت جستجو الزامی است" });
    }

    const search = q.trim();
    const numeric = Number(search);

    const searchConditions = [
      { name: { [Op.like]: `%${search}%` } },
      { phoneNumber: { [Op.like]: `%${search}%` } },
    ];
    if (Number.isFinite(numeric) && numeric > 0) {
      searchConditions.push({ id: numeric });
    }

    const bills = await Bill.findAll({
      where: { [Op.or]: searchConditions },
      order: [["createdAt", "DESC"]],
      include: [{ model: Order, as: "orders" }],
    });

    res.json({
      bills,
      count: bills.length,
      query: search,
    });
  } catch (error) {
    console.error("searchBills error:", error);
    res.status(500).json({
      message: "خطا در جستجو",
      error: error.message,
    });
  }
};