export interface ILeaderboardEntry {
    user_name: string;
    p4_score: number;
}

export default interface ILeaderboard {
    leaderboard: ILeaderboardEntry[];
    fetchLeaderboard: () => void;
}
