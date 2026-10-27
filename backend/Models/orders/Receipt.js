import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Receipt = sequelize.define(
  "Receipt",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
      comment: "Payment amount in AFN",
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Name of the person who received or made the payment",
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Optional note describing the payment",
    },

    customer: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Customers",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "Customer this receipt belongs to (nullable for walk-in payments)",
    },
  },
  {
    timestamps: true,
    tableName: "Receipts",
    indexes: [
      { fields: ["customer"] },
      { fields: ["createdAt"] },
    ],
  }
);

export default Receipt;