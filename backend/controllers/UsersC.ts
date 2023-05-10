import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { User } from "../database/src/entity/User";

const index = async function (request: Request, response: Response) {
    try {
        const repo = getRepository(User);

        const users = await repo.find({select:["id", "firstName", "lastName"]})

        response.status(200).json(users);
    } catch (error) {
        console.log(error);
    }
};

export { index };