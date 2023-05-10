import express from "express";

// Controllers
import { store, show } from "../controllers/UserC";

// Validation
import { userStoreValidate } from "../validations/userCreation";

const router = express.Router();

router.post("/store", userStoreValidate, store);
router.get("/show", show);

export default router;