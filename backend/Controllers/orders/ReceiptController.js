import { Receipt, Customer } from "../../Models/index.js";
import { Op, fn, col } from "sequelize";

/* =========================================================
   Create Receipt
   POST /api/receipts
   body: { amount, name, description, customer }
   ========================================================= */
export const createReceipt = async (req, res) => {
  try {
    const { amount, name, description = null, customer = null } = req.body;

    if (amount == null || Number(amount) <= 0) {
      return res.status(400).json({ message: "مبلغ نامعتبر است" });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "نام الزامی است" });
    }

    // Validate customer if provided
    if (customer != null) {
      const exists = await Customer.findByPk(customer);
      if (!exists) {
        return res.status(400).json({ message: "مشتری یافت نشد" });
      }
    }

    const receipt = await Receipt.create({
      amount: Number(amount),
      name: name.trim(),
      description: description ? String(description).trim() : null,
      customer: customer ?? null,
    });

    res.status(201).json({
      success: true,
      message: "رسید با موفقیت ثبت شد",
      receipt,
    });
  } catch (error) {
    console.error("createReceipt error:", error);
    res.status(500).json({
      success: false,
      message: "خطا در ثبت رسید",
      error: error.message,
    });
  }
};

/* =========================================================
   Get Receipts (paginated + filters)
   GET /api/receipts?page&limit&customer&from&to&q
   ========================================================= */
export const getReceipts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const where = {};

    // Filter by customer
    if (req.query.customer) {
      where.customer = req.query.customer;
    }

    // Date range on createdAt
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

    // Text search on name / description
    if (req.query.q && req.query.q.trim()) {
      const search = `%${req.query.q.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: search } },
        { description: { [Op.like]: search } },
      ];
    }

    const { count, rows } = await Receipt.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Customer,
          as: "customerInfo",
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
    });

    // Aggregate totals over the FULL filtered set
    const totals = await Receipt.findOne({
      where,
      attributes: [
        [fn("COUNT", col("id")), "count"],
        [fn("SUM", col("amount")), "totalAmount"],
      ],
      raw: true,
    });

    res.json({
      receipts: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
      totals: {
        count: Number(totals?.count || 0),
        totalAmount: Number(totals?.totalAmount || 0),
      },
    });
  } catch (error) {
    console.error("getReceipts error:", error);
    res.status(500).json({
      message: "خطا در دریافت رسیدها",
      error: error.message,
    });
  }
};

/* =========================================================
   Get Receipt by ID
   GET /api/receipts/:id
   ========================================================= */
export const getReceiptById = async (req, res) => {
  try {
    const receipt = await Receipt.findByPk(req.params.id, {
      include: [
        {
          model: Customer,
          as: "customerInfo",
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
    });

    if (!receipt) {
      return res.status(404).json({ message: "رسید یافت نشد" });
    }

    res.json(receipt);
  } catch (error) {
    console.error("getReceiptById error:", error);
    res.status(500).json({
      message: "خطا در دریافت رسید",
      error: error.message,
    });
  }
};

/* =========================================================
   Get Receipts of one Customer
   GET /api/receipts/customer/:customerId
   ========================================================= */
export const getReceiptsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findByPk(customerId, {
      attributes: ["id", "fullname", "phoneNumber"],
    });
    if (!customer) {
      return res.status(404).json({ message: "مشتری یافت نشد" });
    }

    const receipts = await Receipt.findAll({
      where: { customer: customerId },
      order: [["createdAt", "DESC"]],
    });

    const totalAmount = receipts.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );

    res.json({
      customer,
      receipts,
      count: receipts.length,
      totalAmount,
    });
  } catch (error) {
    console.error("getReceiptsByCustomer error:", error);
    res.status(500).json({
      message: "خطا در دریافت رسیدهای مشتری",
      error: error.message,
    });
  }
};

/* =========================================================
   Get Receipts in a date range
   GET /api/receipts/range?from&to
   ========================================================= */
export const getReceiptsByDateRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ message: "تاریخ شروع و پایان الزامی است" });
    }

    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const receipts = await Receipt.findAll({
      where: { createdAt: { [Op.between]: [start, end] } },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Customer,
          as: "customerInfo",
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
    });

    const totalAmount = receipts.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );

    res.json({
      from: start,
      to: end,
      receipts,
      count: receipts.length,
      totalAmount,
    });
  } catch (error) {
    console.error("getReceiptsByDateRange error:", error);
    res.status(500).json({
      message: "خطا در دریافت رسیدها در بازه",
      error: error.message,
    });
  }
};

/* =========================================================
   Get totals (global or per-customer)
   GET /api/receipts/totals?customer=...
   ========================================================= */
export const getReceiptTotals = async (req, res) => {
  try {
    const where = {};
    if (req.query.customer) where.customer = req.query.customer;
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

    const totals = await Receipt.findOne({
      where,
      attributes: [
        [fn("COUNT", col("id")), "count"],
        [fn("SUM", col("amount")), "totalAmount"],
        [fn("MIN", col("amount")), "minAmount"],
        [fn("MAX", col("amount")), "maxAmount"],
      ],
      raw: true,
    });

    res.json({
      count: Number(totals?.count || 0),
      totalAmount: Number(totals?.totalAmount || 0),
      minAmount: Number(totals?.minAmount || 0),
      maxAmount: Number(totals?.maxAmount || 0),
    });
  } catch (error) {
    console.error("getReceiptTotals error:", error);
    res.status(500).json({
      message: "خطا در محاسبه مجموع رسیدها",
      error: error.message,
    });
  }
};

/* =========================================================
   Update Receipt (full)
   PUT /api/receipts/:id
   ========================================================= */
export const updateReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findByPk(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: "رسید یافت نشد" });
    }

    const { amount, name, description, customer } = req.body;

    if (amount != null && Number(amount) <= 0) {
      return res.status(400).json({ message: "مبلغ نامعتبر است" });
    }

    if (customer != null) {
      const exists = await Customer.findByPk(customer);
      if (!exists) {
        return res.status(400).json({ message: "مشتری یافت نشد" });
      }
    }

    await receipt.update({
      amount: amount != null ? Number(amount) : receipt.amount,
      name: name != null ? String(name).trim() : receipt.name,
      description:
        description !== undefined
          ? description
            ? String(description).trim()
            : null
          : receipt.description,
      customer: customer !== undefined ? customer : receipt.customer,
    });

    res.json({
      success: true,
      message: "رسید با موفقیت به‌روزرسانی شد",
      receipt,
    });
  } catch (error) {
    console.error("updateReceipt error:", error);
    res.status(500).json({
      message: "خطا در به‌روزرسانی رسید",
      error: error.message,
    });
  }
};

/* =========================================================
   Partial Update (PATCH)
   ========================================================= */
export const updateReceiptProperties = async (req, res) => {
  try {
    const receipt = await Receipt.findByPk(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: "رسید یافت نشد" });
    }

    const allowed = ["amount", "name", "description", "customer"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    if (updates.amount != null) {
      if (Number(updates.amount) <= 0) {
        return res.status(400).json({ message: "مبلغ نامعتبر است" });
      }
      updates.amount = Number(updates.amount);
    }

    if (updates.customer != null) {
      const exists = await Customer.findByPk(updates.customer);
      if (!exists) {
        return res.status(400).json({ message: "مشتری یافت نشد" });
      }
    }

    await receipt.update(updates);

    res.json({
      success: true,
      message: "رسید با موفقیت به‌روزرسانی شد",
      receipt,
    });
  } catch (error) {
    console.error("updateReceiptProperties error:", error);
    res.status(500).json({
      message: "خطا در به‌روزرسانی رسید",
      error: error.message,
    });
  }
};

/* =========================================================
   Delete Receipt
   DELETE /api/receipts/:id
   ========================================================= */
export const deleteReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findByPk(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: "رسید یافت نشد" });
    }

    const deletedId = receipt.id;
    await receipt.destroy();

    res.json({
      success: true,
      message: "رسید با موفقیت حذف شد",
      deletedId,
    });
  } catch (error) {
    console.error("deleteReceipt error:", error);
    res.status(500).json({
      message: "خطا در حذف رسید",
      error: error.message,
    });
  }
};

/* =========================================================
   Search Receipts
   GET /api/receipts/search?q=...
   ========================================================= */
export const searchReceipts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: "عبارت جستجو الزامی است" });
    }

    const search = `%${q.trim()}%`;

    const receipts = await Receipt.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: search } },
          { description: { [Op.like]: search } },
        ],
      },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Customer,
          as: "customerInfo",
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
    });

    if (!receipts.length) {
      return res.status(404).json({ message: "هیچ نتیجه‌ای یافت نشد" });
    }

    res.json(receipts);
  } catch (error) {
    console.error("searchReceipts error:", error);
    res.status(500).json({
      message: "خطا در جستجو",
      error: error.message,
    });
  }
};