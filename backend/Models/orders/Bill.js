import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Bill = sequelize.define(
  "Bill",
  {
    /* ---------------- Customer type ---------------- */
    customerType: {
      type: DataTypes.ENUM("permanent", "temporary"),
      allowNull: false,
      defaultValue: "temporary",
      comment: "Type of customer this bill belongs to",
    },

    /* ---------------- Payment status ---------------- */
    status: {
      type: DataTypes.ENUM("unpaid", "partial", "paid"),
      allowNull: false,
      defaultValue: "unpaid",
      comment:
        "Derived from remaind: unpaid = nothing paid, partial = some paid, paid = fully settled",
    },

    /* ---------------- Customer identity ---------------- */
    customer: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Customers", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "Customer ID — set for permanent customers, null for temporary",
    },
    // Merged from Order.customer (JSON snapshot)
    customerSnapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      comment: "JSON snapshot of customer info (name, phone, address, etc.)",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Customer full name (snapshot for temporary customers)",
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Customer phone number",
    },

    /* ---------------- Money ---------------- */
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
      comment: "Total amount of the bill",
    },
    receipt: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: "Array of payments, e.g. [1000, 2000, 2000]",
    },
    remaind: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
      comment: "Remaining balance = total - sum(receipt)",
    },

    /* ---------------- Merged from Order ---------------- */
    total_money_digital: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: "Total money from linked Digital items",
    },
    total_money_Offset: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: "Total money from linked Offset items",
    },
    isDelivered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    digitalId: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Legacy single-digital reference (kept for compatibility)",
    },
  },
  {
    tableName: "bills",
    timestamps: true,
    indexes: [
      { fields: ["customerType"] },
      { fields: ["status"] },
      { fields: ["customer"] },
    ],
  }
);

/* =====================================================
   Keep `remaind`, `status`, and `total_money_*` derived
   so they can never drift out of sync.
   ===================================================== */
Bill.beforeSave((bill) => {
  const total = Number(bill.total) || 0;
  const receipts = Array.isArray(bill.receipt) ? bill.receipt : [];
  const paid = receipts.reduce((sum, n) => sum + (Number(n) || 0), 0);

  bill.remaind = Number((total - paid).toFixed(2));

  if (bill.remaind <= 0) {
    bill.status = "paid";
  } else if (paid > 0) {
    bill.status = "partial";
  } else {
    bill.status = "unpaid";
  }

  // Derived digital/offset totals are recomputed on demand
  // via the helper below — not in beforeSave (associations
  // may not be loaded yet).
});

/* Optional helper — call after creating/updating Digital/Offset */
Bill.recalcTotals = async function (billId) {
  const bill = await Bill.findByPk(billId, {
    include: [
      { association: "digital" },
      { association: "offset" },
    ],
  });
  if (!bill) return null;

  const digital = bill.digital || [];
  const offset = bill.offset || [];

  bill.total_money_digital = digital.reduce(
    (s, d) => s + Number(d.money || 0),
    0
  );
  bill.total_money_Offset = offset.reduce(
    (s, o) => s + Number(o.money || 0),
    0
  );
  await bill.save();
  return bill;
};

export default Bill;

/* =====================================================
   Child models (unchanged from Order model file)
   ===================================================== */

export const Digital = sequelize.define(
  "Digital",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    quantity: DataTypes.FLOAT,
    price_per_unit: DataTypes.FLOAT,
    money: DataTypes.FLOAT,
    height: DataTypes.FLOAT,
    area: DataTypes.FLOAT,
    weight: DataTypes.FLOAT,
  },
  { tableName: "digitals", timestamps: true }
);

export const Offset = sequelize.define(
  "Offset",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    quantity: DataTypes.FLOAT,
    money: DataTypes.FLOAT,
    price_per_unit: DataTypes.FLOAT,
  },
  { tableName: "offsets", timestamps: true }
);

/* ---------------- Associations ---------------- */
Bill.hasMany(Digital, { as: "digital", foreignKey: "billId" });
Digital.belongsTo(Bill, { foreignKey: "billId" });

Bill.hasMany(Offset, { as: "offset", foreignKey: "billId" });
Offset.belongsTo(Bill, { foreignKey: "billId" });