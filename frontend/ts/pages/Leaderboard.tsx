import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { API_BASE } from '@/config/apiConfig';

interface LeaderboardEntry {
  user_name: string;
  p4_score: number;
}

const Leaderboard: React.FC = () => {
  	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchLeaderboard = async () => {

			try {
				const res = await fetch(`${API_BASE}/api/users`, {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
					},
					body: JSON.stringify({ type: 'get_leaderboard' }),
				});

				if (!res.ok) {
					throw new Error(`HTTP error! status: ${res.status}`);
				}

				const data = await res.json();

				if (data.success) {
					setLeaderboard(data.leaderboard as LeaderboardEntry[]);
				} else {
					Swal.fire({
						title: 'Error fetching leaderboard',
						text: 'Could not retrieve leaderboard data',
						icon: 'error',
					});
				}
			} catch (err) {
				console.error('Error fetching leaderboard:', err);
				Swal.fire({
					title: 'Error',
					text: 'An error occurred while fetching the leaderboard',
					icon: 'error',
				});
			} finally {
				setIsLoading(false);
			}
		};
		fetchLeaderboard();
	}, []);

  if (isLoading) {
		return (
			<section className="leaderboard">
				<h1 className="leaderboard__title">Loading...</h1>
			</section>
		);
  	}

  return (
    <section className="leaderboard">
      <h1 className="leaderboard__title">Leaderboard</h1>
      	<ul className="leaderboard__list">
			{leaderboard.map((entry) => (
				<li key={entry.user_name} className="leaderboard__list-item">
					<div className="leaderboard__item-container">
					<span className="leaderboard__user-name">{entry.user_name}</span>
					<span className="leaderboard__score">{entry.p4_score}</span>
					</div>
				</li>
			))}
    	</ul>
    </section>
  );
};

export default Leaderboard;

