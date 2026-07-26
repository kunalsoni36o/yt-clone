import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
  deleteHistory,
} from "../controllers/history.js";

const routes = express.Router();
routes.get("/:userId", getallhistoryVideo);
routes.post("/views/:videoId", handleview);
routes.post("/:videoId", handlehistory);
routes.delete("/:historyId", deleteHistory);
export default routes;
