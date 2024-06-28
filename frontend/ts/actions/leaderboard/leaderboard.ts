import ILeaderboard, { ILeaderboardEntry } from './interfaces/ILeaderboard';
import Swal from 'sweetalert2';

/**
 * Creates a new leaderboard object.
 * @returns The leaderboard object.
 */
export default function leaderboard(): ILeaderboard {
    return {
        leaderboard: [] as ILeaderboardEntry[],
        isLoading: true,

        /**
         * Fetches the leaderboard data from the server.
         * @throws An error if the HTTP request fails or if the server returns an error.
         */
        fetchLeaderboard: async function (): Promise<void> {
            const environment: string = process.env.NODE_ENV as string; // Determine environment
            const apiUrl: string = environment === 'development' ? process.env.DEV_API_URL! : process.env.PROD_API_URL!; // Detertmine API URL
            try {
                const response = await fetch(`${apiUrl}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ type: 'get_leaderboard' }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (data.success) {
                    this.leaderboard = data.leaderboard;
                } else {
                    Swal.fire({
                        title: 'Error fetching leaderboard',
                        text: 'Could not retrieve leaderboard data',
                        icon: 'error',
                    });
                }
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'An error occurred while fetching the leaderboard',
                    icon: 'error',
                });
            } finally {
                this.isLoading = false;  // Set isLoading to false once data is fetched
            }
        },
    };
}
