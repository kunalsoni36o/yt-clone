import express from "express";
import {
  getPlans,
  createOrder,
  verifyPayment,
  getSubscriptionHistory,
  checkPremiumAccess,
} from "../controllers/subscription.js";

const routes = express.Router();

routes.get("/plans", getPlans);
routes.post("/create-order", createOrder);
routes.post("/verify", verifyPayment);
routes.get("/history/:userId", getSubscriptionHistory);
routes.get("/access/:userId", checkPremiumAccess);

export default routes;
