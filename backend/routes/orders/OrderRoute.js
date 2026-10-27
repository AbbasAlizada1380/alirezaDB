import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  getOrdersByBill,
  updateOrder,
  updateOrderProperties,
  deleteOrder,
  searchOrders,
} from "../../Controllers/orders/OrderController.js";

const OrderRoute = express.Router();

OrderRoute.post("/", createOrder);
OrderRoute.get("/", getOrders);
OrderRoute.get("/search", searchOrders);          // must be before "/:id"
OrderRoute.get("/bill/:billNumber", getOrdersByBill); // must be before "/:id"
OrderRoute.get("/:id", getOrderById);
OrderRoute.put("/:id", updateOrder);
OrderRoute.patch("/:id", updateOrderProperties);
OrderRoute.delete("/:id", deleteOrder);

export default OrderRoute;