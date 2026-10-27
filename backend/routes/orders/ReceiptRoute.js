import express from "express";
import {
  createReceipt,
  getReceipts,
  getReceiptById,
  getReceiptsByCustomer,
  getReceiptsByDateRange,
  getReceiptTotals,
  updateReceipt,
  updateReceiptProperties,
  deleteReceipt,
  searchReceipts,
} from "../../Controllers/orders/ReceiptController.js";

const ReceiptRoute = express.Router();

ReceiptRoute.post("/", createReceipt);

ReceiptRoute.get("/", getReceipts);
ReceiptRoute.get("/search", searchReceipts);                    // before /:id
ReceiptRoute.get("/totals", getReceiptTotals);                  // before /:id
ReceiptRoute.get("/range", getReceiptsByDateRange);             // before /:id
ReceiptRoute.get("/customer/:customerId", getReceiptsByCustomer); // before /:id
ReceiptRoute.get("/:id", getReceiptById);

ReceiptRoute.put("/:id", updateReceipt);
ReceiptRoute.patch("/:id", updateReceiptProperties);
ReceiptRoute.delete("/:id", deleteReceipt);

export default ReceiptRoute;