import { body } from "express-validator";

export const userStoreValidate = [
    body("firstName").escape().not().isEmpty().withMessage("Name missing"),
    body("lastName").escape().not().isEmpty().withMessage("Last name missing"),
    body("email").escape().not().isEmpty().isEmail().withMessage("Invalid email"),
    body("password").escape().not().isEmpty().withMessage("Password missing"),
];
