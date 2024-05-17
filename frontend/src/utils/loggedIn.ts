import { API_URL } from "./constants";

const loggedIn = async (): Promise<boolean> => {
    try {
        // Send a GET request to the /auth endpoint
        const response = await fetch(`${API_URL}/auth/verify-token`, {
            method: 'GET',
            credentials: 'include', // Include cookies in the request
        });

        // Parse the JSON response
        const data = await response.json();

        // If the server responded with { loggedIn: true }, the user is logged in
        if (data.loggedIn) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

export default loggedIn;