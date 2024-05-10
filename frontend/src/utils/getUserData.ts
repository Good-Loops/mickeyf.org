import { API_URL } from "./constants";

// Fetches user data from the backend
export default async function getUserData(): Promise<any> {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}