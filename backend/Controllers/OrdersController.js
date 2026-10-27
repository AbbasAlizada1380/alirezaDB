import { Order, Digital, Offset, Customer, Receipt, sequelize } from "../Models/index.js";
import { Op, Sequelize, fn, col, cast, where as sequelizeWhere, col as sequelizeCol } from "sequelize";

// ✅ Helper: Format receipt description
const buildReceiptDescription = (order, customDesc = null) => {
  if (customDesc) return customDesc;
  const custName = order.customer?.name || "مشتری";
  return `پرداخت برای سفارش #${order.id} - ${custName}`;
};

/* =========================================================
   CREATE ORDER (Supports both Permanent and Temporary)
   ========================================================= */
export const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      customerType = "temporary", // ✅ Added customerType
      customer, // JSON: { name, phone_number } OR a JSON with customerId for permanent
      digital = [],
      offset = [],
      recip = 0, 
      remained = 0,
      total = 0,
      digitalId,
      total_money_digital,
      total_money_offset,
    } = req.body;

    // 1. Create Order
    const order = await Order.create(
      {
        customerType, // ✅ Saving the type
        customer, 
        recip,
        remained,
        total,
        digitalId,
        total_money_digital,
        total_money_Offset: total_money_offset,
        isDelivered: false,
      },
      { transaction }
    );

    // 2. Insert Digital Items
    if (digital.length > 0) {
      await Digital.bulkCreate(
        digital.map((item) => ({ ...item, orderId: order.id })),
        { transaction }
      );
    }

    // 3. Insert Offset Items
    if (offset.length > 0) {
      await Offset.bulkCreate(
        offset.map((item) => ({ ...item, orderId: order.id })),
        { transaction }
      );
    }

    // 4. Create Initial Receipt (Payment) if recip > 0
    if (Number(recip) > 0) {
      await Receipt.create(
        {
          amount: Number(recip),
          name: customer?.name || "نامشخص",
          description: buildReceiptDescription(order),
          orderId: order.id,
          // If permanent, you can also link the actual Customer ID if you have it in customer JSON
          customer: customerType === "permanent" && customer?.id ? customer.id : null,
        },
        { transaction }
      );
    }

    await transaction.commit();

    const newOrder = await Order.findByPk(order.id, {
      include: [
        { model: Digital, as: "digital" },
        { model: Offset, as: "offset" },
        { model: Receipt, as: "receipts" },
      ],
    });

    res.status(201).json(newOrder);
  } catch (error) {
    await transaction.rollback();
    console.error("Create order error:", error);
    res.status(500).json({ message: "Error creating order", error: error.message });
  }
};

/* =========================================================
   UPDATE ORDER + Sync Payments
   ========================================================= */
export const updateOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      customerType,
      customer,
      recip,
      remained,
      total,
      digitalId,
      total_money_digital,
      total_money_offset,
      digital,
      offset,
    } = req.body;

    const order = await Order.findByPk(id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    const previousRecip = Number(order.recip || 0);

    // 1. Update order fields
    await order.update(
      {
        customerType: customerType ?? order.customerType, // ✅ Update customer type
        customer: customer ?? order.customer,
        recip: recip ?? order.recip,
        remained: remained ?? order.remained,
        total: total ?? order.total,
        digitalId: digitalId ?? order.digitalId,
        total_money_digital: total_money_digital ?? order.total_money_digital,
        total_money_Offset: total_money_offset ?? order.total_money_Offset,
      },
      { transaction }
    );

    // 2. Sync Digital Items
    if (digital) {
      await Digital.destroy({ where: { orderId: id }, transaction });
      if (digital.length > 0) {
        await Digital.bulkCreate(
          digital.map((item) => ({ ...item, orderId: id })),
          { transaction }
        );
      }
    }

    // 3. Sync Offset Items
    if (offset) {
      await Offset.destroy({ where: { orderId: id }, transaction });
      if (offset.length > 0) {
        await Offset.bulkCreate(
          offset.map((item) => ({ ...item, orderId: id })),
          { transaction }
        );
      }
    }

    // 4. Sync Payment (Receipt)
    const newRecip = Number(recip !== undefined ? recip : order.recip);
    
    if (newRecip > previousRecip) {
      const diff = newRecip - previousRecip;
      await Receipt.create(
        {
          amount: diff,
          name: order.customer?.name || "نامشخص",
          description: `پرداخت تکمیلی برای سفارش #${order.id}`,
          orderId: order.id,
        },
        { transaction }
      );
    } else if (newRecip < previousRecip) {
      const receipts = await Receipt.findAll({
        where: { orderId: order.id },
        order: [["createdAt", "DESC"]],
        transaction,
      });

      let diffToRemove = previousRecip - newRecip;

      for (const receipt of receipts) {
        if (diffToRemove <= 0) break;
        const rAmount = Number(receipt.amount);
        if (rAmount <= diffToRemove) {
          await receipt.destroy({ transaction });
          diffToRemove -= rAmount;
        } else {
          await receipt.update({ amount: rAmount - diffToRemove }, { transaction });
          diffToRemove = 0;
        }
      }
    }

    await transaction.commit();

    const updatedOrder = await Order.findByPk(id, {
      include: [
        { model: Digital, as: "digital" },
        { model: Offset, as: "offset" },
        { model: Receipt, as: "receipts" },
      ],
    });

    res.json(updatedOrder);
  } catch (error) {
    await transaction.rollback();
    console.error("Update order error:", error);
    res.status(500).json({ message: "Error updating order", error: error.message });
  }
};

/* =========================================================
   PAY PERMANENT CUSTOMER (FIFO Allocation across unpaid Orders)
   ========================================================= */
export const payPermanentCustomer = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId, amount, description = null } = req.body;

    if (!customerId) {
      await transaction.rollback();
      return res.status(400).json({ message: "شناسه مشتری الزامی است" });
    }
    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "مبلغ نامعتبر است" });
    }

    const cust = await Customer.findByPk(customerId, { transaction });
    if (!cust) {
      await transaction.rollback();
      return res.status(404).json({ message: "مشتری یافت نشد" });
    }
    if (!cust.isActive) {
      await transaction.rollback();
      return res.status(400).json({ message: "مشتری غیرفعال است" });
    }

    // Fetch outstanding ORDERS (replaces Bills) for this permanent customer
    const orders = await Order.findAll({
      where: {
        // Assuming you store customerId in the JSON customer field, or add a customerId column to Order
        // If it's in JSON: 
        [Op.and]: [
          Sequelize.where(Sequelize.json("customer.id"), customerId),
          { customerType: "permanent" },
          { remained: { [Op.gt]: 0 } } // Unpaid
        ]
      },
      order: [["createdAt", "ASC"]], // Oldest first
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (orders.length === 0) {
      await transaction.rollback();
      return res.status(200).json({
        success: true,
        message: "هیچ سفارش پرداخت‌نشده‌ای برای این مشتری وجود ندارد",
        allocations: [],
        remaining: payAmount,
      });
    }

    let remaining = payAmount;
    const allocations = [];

    // Allocate FIFO across orders
    for (const order of orders) {
      if (remaining <= 0) break;

      const owe = Number(order.remained);
      if (owe <= 0) continue;

      const slice = Math.min(owe, remaining);
      remaining -= slice;

      const newRecip = Number(order.recip) + slice;
      const newRemained = Number(order.total) - newRecip;

      await order.update({ recip: newRecip, remained: newRemained }, { transaction });

      allocations.push({
        orderId: order.id,
        amount: slice,
        orderRemainedAfter: newRemained,
      });
    }

    const paidAmount = payAmount - remaining;

    const breakdown = allocations
      .map((a) => `سفارش #${a.orderId}: ${Number(a.amount).toLocaleString()} افغانی`)
      .join("، ");

    const autoDescription = `پرداخت از مشتری دائم — ${cust.fullname} — ${breakdown}`;

    const receipt = await Receipt.create(
      {
        amount: paidAmount,
        name: cust.fullname,
        description: description?.trim() || autoDescription,
        customer: cust.id, // ✅ Linked to Customer
        // Note: This receipt covers multiple orders, so orderId is null. 
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "پرداخت با موفقیت ثبت شد",
      customer: { id: cust.id, fullname: cust.fullname },
      receiptId: receipt.id,
      paid: paidAmount,
      unallocated: remaining,
      allocations,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("payPermanentCustomer error:", error);
    return res.status(500).json({ success: false, message: "خطا در ثبت پرداخت", error: error.message });
  }
};

/* =========================================================
   GET TEMPORARY DEBTORS (Orders with unpaid balance)
   ========================================================= */
export const getTemporaryDebtors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const where = {
      customerType: "temporary",
      remained: { [Op.gt]: 0 }, // Unpaid or partial
    };

    // Search logic (Matches JSON customer fields)
    if (req.query.q && String(req.query.q).trim()) {
      const q = String(req.query.q).trim();
      const numeric = Number(q);
      const searchConditions = [
        Sequelize.where(Sequelize.json("customer.name"), { [Op.like]: `%${q}%` }),
        Sequelize.where(Sequelize.json("customer.phone_number"), { [Op.like]: `%${q}%` }),
      ];
      if (Number.isFinite(numeric) && numeric > 0) {
        searchConditions.push({ id: numeric });
      }
      where[Op.and] = [{ [Op.or]: searchConditions }];
    }

    // Date range
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

    const { count, rows } = await Order.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const aggregates = await Order.findOne({
      where,
      attributes: [
        [fn("COUNT", col("id")), "totalOrders"],
        [fn("SUM", col("total")), "totalAmount"],
        [fn("SUM", col("remained")), "totalRemaining"],
      ],
      raw: true,
    });

    const totalPaid = Number(aggregates?.totalAmount || 0) - Number(aggregates?.totalRemaining || 0);

    res.json({
      orders: rows, // ✅ Changed from 'bills' to 'orders'
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
      summary: {
        totalOrders: Number(aggregates?.totalOrders || 0),
        totalAmount: Number(aggregates?.totalAmount || 0),
        totalRemaining: Number(aggregates?.totalRemaining || 0),
        totalPaid,
      },
    });
  } catch (error) {
    console.error("getTemporaryDebtors error:", error);
    res.status(500).json({ message: "خطا در دریافت حساب‌های مشتریان موقت", error: error.message });
  }
};

/* =========================================================
   GET ALL ORDERS (Paginated + Search + Date Filter)
   ========================================================= */
export const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = {};

    if (req.query.customerType) where.customerType = req.query.customerType;

    // Search Logic
    if (req.query.q && String(req.query.q).trim()) {
      const raw = String(req.query.q).trim();
      const numericOnly = raw.replace(/^#/, ""); 
      const numeric = Number(numericOnly);

      const searchConditions = [
        Sequelize.where(Sequelize.json("customer.name"), { [Op.like]: `%${raw}%` }),
        Sequelize.where(Sequelize.json("customer.phone_number"), { [Op.like]: `%${raw}%` }),
      ];

      if (Number.isFinite(numeric) && numeric > 0) {
        searchConditions.push({ id: numeric });
      }

      if (/^\d+$/.test(numericOnly)) {
        searchConditions.push(
          sequelizeWhere(cast(sequelizeCol("Order.id"), "CHAR"), {
            [Op.like]: `%${numericOnly}%`,
          })
        );
      }

      where[Op.and] = [...(where[Op.and] || []), { [Op.or]: searchConditions }];
    }

    // Date range
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

    const { count, rows } = await Order.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        { model: Digital, as: "digital" },
        { model: Offset, as: "offset" },
        { model: Receipt, as: "receipts" },
      ],
      distinct: true,
    });

    res.json({
      orders: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
      filters: {
        q: req.query.q || null,
        from: req.query.from || null,
        to: req.query.to || null,
        customerType: req.query.customerType || null,
      },
    });
  } catch (error) {
    console.error("getOrders error:", error);
    res.status(500).json({ message: "خطا در دریافت سفارشات", error: error.message });
  }
};

/* =========================================================
   ADD PAYMENT TO SINGLE ORDER
   ========================================================= */
export const addPaymentToOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "مبلغ نامعتبر است" });
    }

    const order = await Order.findByPk(id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    await Receipt.create(
      {
        amount: Number(amount),
        name: order.customer?.name || "نامشخص",
        description: `پرداخت جدید برای سفارش #${order.id}`,
        orderId: order.id,
      },
      { transaction }
    );

    const newRecip = Number(order.recip) + Number(amount);
    const newRemained = Number(order.total) - newRecip;

    await order.update({ recip: newRecip, remained: newRemained }, { transaction });

    await transaction.commit();
    res.json({ success: true, message: "پرداخت ثبت شد", order });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: "Error adding payment", error: error.message });
  }
};

/* =========================================================
   OTHER CRUD OPERATIONS (Get by ID, Delete, etc.)
   ========================================================= */
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Digital, as: "digital" },
        { model: Offset, as: "offset" },
        { model: Receipt, as: "receipts" },
      ],
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Error fetching order", error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: "Order not found" });
    }
    await order.destroy({ transaction });
    await transaction.commit();
    res.json({ message: "Order and all related data deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: "Error deleting order", error: error.message });
  }
};

export const updateOrderProperties = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    await order.update(req.body);
    const updatedOrder = await Order.findByPk(req.params.id);
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: "Error updating order", error: error.message });
  }
};

export const getOrdersByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateCondition = (startDate && endDate)
      ? {
          createdAt: {
            [Op.between]: [
              new Date(`${startDate}T00:00:00`),
              new Date(`${endDate}T23:59:59`),
            ],
          },
        }
      : {};

    const orders = await Order.findAll({
      where: dateCondition,
      include: [
        { model: Digital, as: "digital" },
        { model: Offset, as: "offset" },
        { model: Receipt, as: "receipts" },
      ],
      order: [["id", "DESC"]],
    });

    res.json({ totalOrders: orders.length, dateRange: { startDate, endDate }, orders });
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders by date", error: error.message });
  }
};

export const searchOrders = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") return res.status(400).json({ message: "عبارت جستجو الزامی است" });

    const cleaned = q.trim();
    const isId = !isNaN(cleaned) && cleaned.length <= 6;
    let whereClause = {};

    if (isId) {
      whereClause = { id: Number(cleaned) };
    } else {
      whereClause = {
        [Op.or]: [
          Sequelize.where(Sequelize.json("customer.name"), { [Op.like]: `%${cleaned}%` }),
          Sequelize.where(Sequelize.json("customer.phone_number"), { [Op.like]: `%${cleaned}%` }),
        ],
      };
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        { model: Digital, as: "digital" },
        { model: Offset, as: "offset" },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!orders.length) return res.status(404).json({ message: "هیچ نتیجه‌ای یافت نشد" });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "خطا در جستجو", error: error.message });
  }
};


/* =========================================================
   GET CUSTOMER TYPE REPORT (Permanent vs Temporary)
   ========================================================= */
export const getCustomerTypeReport = async (req, res) => {
  try {
    const { customerType } = req.params; // "permanent" or "temporary"
    const { from, to, customerId } = req.query;

    if (!["permanent", "temporary"].includes(customerType)) {
      return res.status(400).json({ 
        message: "نوع مشتری نامعتبر است. باید permanent یا temporary باشد" 
      });
    }

    // 1. Build the base WHERE clause
    const where = { customerType };

    // 2. Filter by specific customer if provided and type is permanent
    if (customerType === "permanent" && customerId) {
      where[Op.and] = [
        Sequelize.where(Sequelize.json("customer.id"), customerId)
      ];
    }

    // 3. ✅ Date range filter (already here, just verifying)
    if (from || to) {
      where.createdAt = {};
      if (from) {
        const f = new Date(from);
        f.setHours(0, 0, 0, 0); // Start of the day
        where.createdAt[Op.gte] = f;
      }
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999); // End of the day
        where.createdAt[Op.lte] = t;
      }
    }

    // 4. Fetch overall aggregates
    const aggregates = await Order.findOne({
      where,
      attributes: [
        [fn("COUNT", col("id")), "totalOrders"],
        [fn("SUM", col("total")), "totalAmount"],
        [fn("SUM", col("recip")), "totalPaid"],
        [fn("SUM", col("remained")), "totalRemaining"],
      ],
      raw: true,
    });

    // 5. Count fully paid vs unpaid (remained > 0)
    const [paidCount, unpaidCount] = await Promise.all([
      Order.count({ 
        where: { 
          ...where, 
          remained: { [Op.lte]: 0 } 
        } 
      }),
      Order.count({ 
        where: { 
          ...where, 
          remained: { [Op.gt]: 0 } 
        } 
      }),
    ]);

    // 6. Return the formatted report
    res.json({
      customerType,
      customerId: customerId || null,
      dateRange: { from: from || null, to: to || null },
      summary: {
        totalOrders: Number(aggregates?.totalOrders || 0),
        totalAmount: Number(aggregates?.totalAmount || 0),
        totalPaid: Number(aggregates?.totalPaid || 0),
        totalRemaining: Number(aggregates?.totalRemaining || 0),
        paidCount,
        unpaidCount,
      },
    });

  } catch (error) {
    console.error("getCustomerTypeReport error:", error);
    res.status(500).json({ 
      message: "خطا در دریافت گزارش مشتریان", 
      error: error.message 
    });
  }
};