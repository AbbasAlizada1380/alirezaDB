import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Order = sequelize.define(
  "Order",
  {
    billNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Bills",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "FK to the Bill this order belongs to",
    },

    size: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Jersey size, e.g. S, M, L, XL, XXL",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1 },
      comment: "Number of jerseys in this order",
    },
    athleteNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Number printed on the jersey (e.g. 10, 7, 99)",
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Logo image URL or identifier",
    },
    codeNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Code identifier, e.g. team code or internal SKU",
    },
    jerseyType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Type of jersey, e.g. home, away, goalkeeper, training",
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
      comment: "Unit price per jersey",
    },
    total: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
      comment: "Total = price × quantity",
    },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ["billNumber"] },
      { fields: ["size"] },
      { fields: ["athleteNumber"] },
      { fields: ["codeNumber"] },
      { fields: ["jerseyType"] },
    ],
  }
);

/* =====================================================
   Keep `total` derived from `price × quantity`
   ===================================================== */
Order.beforeSave((order) => {
  const price = Number(order.price) || 0;
  const quantity = Number(order.quantity) || 0;
  order.total = price * quantity;
});

export default Order;