export interface ILeaderboardEntry {
    user_name: string;
    p4_score: number;
}

/**
 * Represents the leaderboard interface.
 */
export default interface ILeaderboard {
    leaderboard: ILeaderboardEntry[];
    fetchLeaderboard: () => void;
}
