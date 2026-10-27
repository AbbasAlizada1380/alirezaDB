import { Order, Bill } from "../../Models/index.js";
import { Op } from "sequelize";

/* ===========================
   Create Order
=========================== */
export const createOrder = async (req, res) => {
  try {
    const {
      billNumber = null,
      name = null,
      amount = 1,
      height = null,
      width = null,
      pricePerUnite = 0,
      receipt = null,
      remained = 0,
    } = req.body;

    // Validate required fields based on the new model
    if (pricePerUnite == null || pricePerUnite < 0) {
      return res.status(400).json({ message: "قیمت فی واحد الزامی است و نمی‌تواند منفی باشد" });
    }

    // Validate bill if provided
    if (billNumber != null) {
      const bill = await Bill.findByPk(billNumber);
      if (!bill) {
        return res.status(400).json({ message: "بل مورد نظر یافت نشد" });
      }
    }

    const order = await Order.create({
      billNumber,
      name,
      amount,
      height,
      width,
      pricePerUnite,
      receipt,
      remained,
      // Note: area and total will be calculated automatically by the beforeSave hook in the model
    });

    // Recompute bill total if attached
    if (billNumber != null) {
      await recalcBillTotal(billNumber);
    }

    res.status(201).json({
      success: true,
      message: "سفارش با موفقیت ثبت شد",
      order,
    });
  } catch (error) {
    console.error("createOrder error:", error);
    res.status(500).json({
      message: "خطا در ثبت سفارش",
      error: error.message,
    });
  }
};

/* ===========================
   Get Orders (paginated)
   Query: page, limit, billNumber, name
=========================== */
export const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.billNumber) where.billNumber = req.query.billNumber;
    if (req.query.name) where.name = { [Op.like]: `%${req.query.name}%` };

    const { count, rows } = await Order.findAndCountAll({
      where,
      limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        { model: Bill, as: "bill", attributes: ["id", "name", "status"] },
      ],
    });

    res.json({
      orders: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error("getOrders error:", error);
    res.status(500).json({
      message: "خطا در دریافت سفارش‌ها",
      error: error.message,
    });
  }
};

/* ===========================
   Get Order by ID
=========================== */
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: Bill, as: "bill" }],
    });

    if (!order) {
      return res.status(404).json({ message: "سفارش یافت نشد" });
    }

    res.json(order);
  } catch (error) {
    console.error("getOrderById error:", error);
    res.status(500).json({
      message: "خطا در دریافت سفارش",
      error: error.message,
    });
  }
};

/* ===========================
   Get Orders for a specific Bill
=========================== */
export const getOrdersByBill = async (req, res) => {
  try {
    const { billNumber } = req.params;

    const bill = await Bill.findByPk(billNumber);
    if (!bill) {
      return res.status(404).json({ message: "بل یافت نشد" });
    }

    const orders = await Order.findAll({
      where: { billNumber },
      order: [["id", "ASC"]],
    });

    res.json({
      billNumber: Number(billNumber),
      orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("getOrdersByBill error:", error);
    res.status(500).json({
      message: "خطا در دریافت سفارش‌های بل",
      error: error.message,
    });
  }
};

/* ===========================
   Update Order (full)
=========================== */
export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "سفارش یافت نشد" });
    }

    // Updated allowed fields
    const allowed = [
      "billNumber",
      "name",
      "amount",
      "height",
      "width",
      "pricePerUnite",
      "receipt",
      "remained",
    ];
    
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    // If billNumber is being changed, validate it
    if (
      updates.billNumber != null &&
      updates.billNumber !== order.billNumber
    ) {
      const bill = await Bill.findByPk(updates.billNumber);
      if (!bill) {
        return res.status(400).json({ message: "بل مورد نظر یافت نشد" });
      }
    }

    const previousBill = order.billNumber;
    
    // The beforeSave hook in the model will auto-recalculate 'area' and 'total'
    await order.update(updates); 

    // Recalc both old and new bill totals
    if (previousBill != null) await recalcBillTotal(previousBill);
    if (order.billNumber != null && order.billNumber !== previousBill) {
      await recalcBillTotal(order.billNumber);
    }

    res.json({
      success: true,
      message: "سفارش با موفقیت به‌روزرسانی شد",
      order,
    });
  } catch (error) {
    console.error("updateOrder error:", error);
    res.status(500).json({
      message: "خطا در به‌روزرسانی سفارش",
      error: error.message,
    });
  }
};

/* ===========================
   Partial update
=========================== */
export const updateOrderProperties = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "سفارش یافت نشد" });
    }

    const allowed = [
      "billNumber",
      "name",
      "amount",
      "height",
      "width",
      "pricePerUnite",
      "receipt",
      "remained",
    ];
    
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const previousBill = order.billNumber;
    
    // The beforeSave hook triggers here too
    await order.update(updates);

    if (previousBill != null) await recalcBillTotal(previousBill);
    if (order.billNumber != null && order.billNumber !== previousBill) {
      await recalcBillTotal(order.billNumber);
    }

    res.json({
      success: true,
      message: "سفارش با موفقیت به‌روزرسانی شد",
      order,
    });
  } catch (error) {
    console.error("updateOrderProperties error:", error);
    res.status(500).json({
      message: "خطا در به‌روزرسانی سفارش",
      error: error.message,
    });
  }
};

/* ===========================
   Delete Order
=========================== */
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "سفارش یافت نشد" });
    }

    const billNumber = order.billNumber;
    await order.destroy();

    if (billNumber != null) await recalcBillTotal(billNumber);

    res.json({
      success: true,
      message: "سفارش با موفقیت حذف شد",
      deletedId: order.id,
    });
  } catch (error) {
    console.error("deleteOrder error:", error);
    res.status(500).json({
      message: "خطا در حذف سفارش",
      error: error.message,
    });
  }
};

/* ===========================
   Search Orders by name
=========================== */
export const searchOrders = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: "عبارت جستجو الزامی است" });
    }

    const search = q.trim();

    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          // You can add more fields here if you want to search by them (e.g. billNumber)
        ],
      },
      order: [["createdAt", "DESC"]],
      include: [{ model: Bill, as: "bill", attributes: ["id", "name"] }],
    });

    if (!orders.length) {
      return res.status(404).json({ message: "هیچ نتیجه‌ای یافت نشد" });
    }

    res.json(orders);
  } catch (error) {
    console.error("searchOrders error:", error);
    res.status(500).json({
      message: "خطا در جستجو",
      error: error.message,
    });
  }
};

/* =====================================================
   Helper: recompute a Bill's total from its orders
   ===================================================== */
async function recalcBillTotal(billId) {
  const orders = await Order.findAll({
    where: { billNumber: billId },
    attributes: ["total"],
  });

  const total = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const bill = await Bill.findByPk(billId);
  if (bill) {
    // beforeSave on Bill recomputes remaind + status
    await bill.update({ total });
  }
}