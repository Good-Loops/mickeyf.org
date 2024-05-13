// Canvas dimensions
export const CANVAS_WIDTH: number = 1920;
export const CANVAS_HEIGHT: number = 1080;

// User-mangagement-related constants
export const INVALID_EMAIL: string = "INVALID_EMAIL";
export const INVALID_PASSWORD: string = "INVALID_PASSWORD";
export const EMPTY_FIELDS: string = "EMPTY_FIELDS";
export const DUPLICATE_USER: string = "DUPLICATE_USER";

console.log(process.env.DEV_API_URL);
console.log(process.env.NODE_ENV);
// API URL
export const API_URL: string = process.env.NODE_ENV === 'development' ? process.env.DEV_API_URL as string : process.env.PROD_API_URL as string;
