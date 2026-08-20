import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  likecomment,
  dislikecomment,
  reportcomment,
} from "../controllers/comment.js";

const routes = express.Router();
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.patch("/editcomment/:id", editcomment);
routes.patch("/like/:id", likecomment);
routes.patch("/dislike/:id", dislikecomment);
routes.post("/report/:id", reportcomment);

export default routes;
