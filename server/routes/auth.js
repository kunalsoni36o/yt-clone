import express from "express";
import { login, updateprofile, updateplan, verifyOtp, updateTheme } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyOtp);
routes.patch("/update/:id", updateprofile);
routes.patch("/plan/:id", updateplan);
routes.patch("/theme/:id", updateTheme);
export default routes;
