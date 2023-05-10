import express from "express";
import cors from "cors";

import "../database/src";

// Routes
import home from "../routes/home";
import user from "../routes/user";
import users from "../routes/users";

const app = express();

app.use(express.json());

app.use(cors({
    origin: ["http://localhost:5000"]
}));

app.use("/", home);
app.use("/user", user);
app.use("/users", users);

app.listen(3000, function () {
    console.log("servidor rodando ☻");
})