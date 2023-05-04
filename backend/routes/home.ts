import express from "express";

// Controllers
import { index } from "../controllers/HomeC";

const router = express.Router();

router.get("/", index);

export default router;