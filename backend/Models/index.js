// models/index.js
import sequelize from "../dbconnection.js";
// Import all models
import Staff from "./staff/staff.js";
import SalaryList from "./staff/salary/salaryList.js";
import Attendance from "./staff/salary/Attendence.js";
import PaidSalary from "./staff/salary/paidSalary.js"; // ✅ NEW
import Bill from "./orders/Bill.js"; // Note: Kept import in case you need it elsewhere, but associations removed below

// 👇 THIS IS THE LINE THAT FIXES IT 👇
import  {Order, Digital, Offset } from "./Orders.js"; 

import Customer from "./Customer.js";
import Receipt from "./orders/Receipt.js";
import Holder from "./holder/Holder.js";
import Valet from "./holder/Valet.js";

/* ---------- Holder <-> Valet ---------- */
Holder.hasMany(Valet, {
  foreignKey: "holder",
  as: "valets",
  onUpdate: "CASCADE",
  onDelete: "RESTRICT",
});

Valet.belongsTo(Holder, {
  foreignKey: "holder",
  as: "holderInfo",
  onUpdate: "CASCADE",
  onDelete: "RESTRICT",
});

/* ---------- Customer <-> Receipt ---------- */
Customer.hasMany(Receipt, {
  foreignKey: "customer",
  as: "receipts",
  onUpdate: "CASCADE",
  onDelete: "SET NULL",
});

Receipt.belongsTo(Customer, {
  foreignKey: "customer",
  as: "customerInfo",
  onUpdate: "CASCADE",
  onDelete: "SET NULL",
});

/* ---------- Order <-> Receipt (NEW) ----------
   Replaces the old Bill <-> Order association.
   Tracks payments directly against the order.
*/
Order.hasMany(Receipt, {
  foreignKey: "orderId",
  as: "receipts",
  onUpdate: "CASCADE",
  onDelete: "CASCADE", // If an order is deleted, remove its payment records
});

Receipt.belongsTo(Order, {
  foreignKey: "orderId",
  as: "order",
  onUpdate: "CASCADE",
  onDelete: "CASCADE",
});

/* ---------- SalaryList <-> Attendance ---------- */
SalaryList.hasMany(Attendance, {
  foreignKey: "list",
  as: "attendances",
  onUpdate: "CASCADE",
  onDelete: "CASCADE",
});

Attendance.belongsTo(SalaryList, {
  foreignKey: "list",
  as: "salaryList",
  onUpdate: "CASCADE",
  onDelete: "CASCADE",
});

/* ---------- Staff <-> Attendance ---------- */
Staff.hasMany(Attendance, {
  foreignKey: "staffId",
  as: "attendances",
  onUpdate: "CASCADE",
  onDelete: "RESTRICT",
});

Attendance.belongsTo(Staff, {
  foreignKey: "staffId",
  as: "staff",
  onUpdate: "CASCADE",
  onDelete: "RESTRICT",
});

/* ---------- ✅ Attendance <-> PaidSalary (NEW) ----------
   One attendance record can have many payments (partial payments supported).
   Deleting an attendance cascades and removes its payments too.
*/
Attendance.hasMany(PaidSalary, {
  foreignKey: "attendanceId",
  as: "payments",
  onUpdate: "CASCADE",
  onDelete: "CASCADE",
});

PaidSalary.belongsTo(Attendance, {
  foreignKey: "attendanceId",
  as: "attendance",
  onUpdate: "CASCADE",
  onDelete: "CASCADE",
});

export {
  sequelize,
  Staff,
  SalaryList,
  Attendance,
  PaidSalary,
  Bill,
  Order,
  Digital, // ✅ Now this will work
  Offset,  // ✅ Now this will work
  Customer,
  Receipt,
  Valet,
  Holder,
};

export default {
  sequelize,
  Staff,
  SalaryList,
  Attendance,
  PaidSalary,
  Bill,
  Order,
  Digital, // ✅ Now this will work
  Offset,  // ✅ Now this will work
  Customer,
  Receipt,
  Valet,
  Holder,
};