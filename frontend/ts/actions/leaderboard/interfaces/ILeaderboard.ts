/**
 * Interface representing a single entry in the leaderboard.
 */
export interface ILeaderboardEntry {
    /**
     * The username of the user.
     */
    user_name: string;

    /**
     * The score of the user in the game.
     */
    p4_score: number;
}

/**
 * Interface representing the structure of the leaderboard.
 */
export default interface ILeaderboard {
    /**
     * An array of leaderboard entries.
     */
    leaderboard: ILeaderboardEntry[];

    /**
     * A boolean indicating if the leaderboard data is currently being loaded.
     */
    isLoading: boolean;

    /**
     * Function to fetch the leaderboard data from the server.
     */
    fetchLeaderboard: () => void;
}
