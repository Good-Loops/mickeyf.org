import { Application } from "pixi.js";
import FractalAnimation from "../interfaces/FractalAnimation";

export default class Tree implements FractalAnimation {
    init(app: Application): void {
        throw new Error("Method not implemented.");
    }
    
    step(deltaSeconds: number, timeMS: number): void {
        throw new Error("Method not implemented.");
    }

    scheduleDisposal(seconds: number): void {
        throw new Error("Method not implemented.");
    }

    startDisposal(): void {
        throw new Error("Method not implemented.");
    }

    dispose(): void {
        throw new Error("Method not implemented.");
    }
}