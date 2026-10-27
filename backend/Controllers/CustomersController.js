import {Customer} from "../Models/index.js";
import { Op } from "sequelize";

/* ===========================
   Create Customer
=========================== */
export const createCustomer = async (req, res) => {
  try {
    const { fullname, phoneNumber, isActive } = req.body;

    if (!fullname) {
      return res.status(400).json({ message: "نام کامل الزامی است" });
    }

    const customer = await Customer.create({
      fullname,
      phoneNumber,
      isActive: isActive ?? true,
    });

    res.status(201).json({
      success: true,
      message: "مشتری با موفقیت ثبت شد",
      customer,
    });
  } catch (error) {
    console.error("createCustomer error:", error);
    res.status(500).json({
      success: false,
      message: "خطا در ثبت مشتری",
      error: error.message,
    });
  }
};

/* ===========================
   Get Active Customers
=========================== */
export const getActiveCustomers = async (req, res) => {
  try {
    const activeCustomers = await Customer.findAll({
      where: { isActive: true },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      customers: activeCustomers,
      total: activeCustomers.length,
    });
  } catch (error) {
    console.error("getActiveCustomers error:", error);
    res.status(500).json({
      message: "خطا در دریافت مشتریان فعال",
      error: error.message,
    });
  }
};

/* ===========================
   Get Customers (Paginated)
=========================== */
export const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Customer.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]],
    });

    res.json({
      customers: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error("getCustomers error:", error);
    res.status(500).json({
      message: "خطا در دریافت مشتریان",
      error: error.message,
    });
  }
};

/* ===========================
   Get Customer by ID
=========================== */
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "مشتری یافت نشد" });
    }

    res.json(customer);
  } catch (error) {
    console.error("getCustomerById error:", error);
    res.status(500).json({
      message: "خطا در دریافت مشتری",
      error: error.message,
    });
  }
};

/* ===========================
   Update Customer (PUT — full)
=========================== */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, phoneNumber, isActive } = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "مشتری یافت نشد" });
    }

    await customer.update({
      fullname,
      phoneNumber,
      isActive,
    });

    res.json({
      success: true,
      message: "مشتری با موفقیت به‌روزرسانی شد",
      customer,
    });
  } catch (error) {
    console.error("updateCustomer error:", error);
    res.status(500).json({
      message: "خطا در به‌روزرسانی مشتری",
      error: error.message,
    });
  }
};

/* ===========================
   Partial Update (PATCH)
=========================== */
export const updateCustomerProperties = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "مشتری یافت نشد" });
    }

    // Only allow the model's fields
    const allowed = ["fullname", "phoneNumber", "isActive"];
    const filtered = Object.fromEntries(
      Object.entries(updateData).filter(([k]) => allowed.includes(k))
    );

    await customer.update(filtered);

    res.json({
      success: true,
      message: "مشتری با موفقیت به‌روزرسانی شد",
      customer,
    });
  } catch (error) {
    console.error("updateCustomerProperties error:", error);
    res.status(500).json({
      message: "خطا در به‌روزرسانی مشتری",
      error: error.message,
    });
  }
};

/* ===========================
   Delete Customer
=========================== */
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "مشتری یافت نشد" });
    }

    await customer.destroy();
    res.json({ message: "مشتری با موفقیت حذف شد" });
  } catch (error) {
    console.error("deleteCustomer error:", error);
    res.status(500).json({
      message: "خطا در حذف مشتری",
      error: error.message,
    });
  }
};

/* ===========================
   Search Customers
=========================== */
export const searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "عبارت جستجو الزامی است" });
    }

    const search = q.trim();

    const customers = await Customer.findAll({
      where: {
        [Op.or]: [
          { fullname: { [Op.like]: `%${search}%` } },
          { phoneNumber: { [Op.like]: `%${search}%` } },
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!customers.length) {
      return res.status(404).json({ message: "هیچ نتیجه‌ای یافت نشد" });
    }

    res.json(customers);
  } catch (error) {
    console.error("searchCustomers error:", error);
    res.status(500).json({
      message: "خطا در جستجو",
      error: error.message,
    });
  }
};