function component() {
    const render = () => {
        return /*html*/`
            <section class='leaderboard' x-data='leaderboard()' x-init='fetchLeaderboard()'>
                <div x-show='!isLoading'>
                    <h1 class='leaderboard__title'>Leaderboard</h1>
                    <ul class='leaderboard__list'>
                        <template x-for='entry in leaderboard' :key='entry.user_name'>
                            <li class='leaderboard__list-item'>
                                <div class='leaderboard__item-container'>
                                    <span class='leaderboard__user-name' x-text='entry.user_name'></span>
                                    <span class='leaderboard__score' x-text='entry.p4_score'></span>
                                </div>
                            </li>
                        </template>
                    </ul>
                </div>
                <div x-show='isLoading'>
                    <h1 class='leaderboard__title'>Loading...</h1>
                </div>
            </section>
        `;
    };

    return {
        render,
    };
}

export default component();
