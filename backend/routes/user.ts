import express from "express";

// Controllers
import { store } from "../controllers/UserC";

// Validation
import { userStoreValidate } from "../validations/userCreation";

const router = express.Router();

router.post("/store", userStoreValidate, store);

export default router;