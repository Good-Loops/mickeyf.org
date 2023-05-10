import express from "express";

// Controllers
import { index } from "../controllers/UsersC";

const router = express.Router();

router.get("/", index);

export default router;