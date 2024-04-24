// Fetches user data from the backend
export default async function getUserData(): Promise<any> {
    try {
        const response = await fetch('http://localhost:3000/api/users');
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