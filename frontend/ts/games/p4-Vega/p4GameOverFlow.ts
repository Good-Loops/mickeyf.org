type GameOverWork = {
    submitScore?: () => Promise<void>;
    showOverlay: () => Promise<void>;
    onReady: () => void;
    onScoreError: (error: unknown) => void;
    onDisplayError: (error: unknown) => void;
};

/** Restart readiness belongs to the end screen, regardless of score-request latency. */
export async function finishP4GameOver(work: GameOverWork): Promise<void> {
    if (work.submitScore) void work.submitScore().catch(work.onScoreError);
    try {
        await work.showOverlay();
    } catch (error) {
        work.onDisplayError(error);
    } finally {
        work.onReady();
    }
}
