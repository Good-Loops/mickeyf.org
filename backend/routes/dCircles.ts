import express from "express";

// Controllers
import { index } from "../controllers/dCirclesC";

const router = express.Router();

router.get("/dancing-circles", index);

export default router;