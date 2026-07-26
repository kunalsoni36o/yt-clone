import express from "express";
import { getallvideo, uploadvideo, getvideo } from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadvideo);
routes.get("/getall", getallvideo);
routes.get("/:id", getvideo);
export default routes;
