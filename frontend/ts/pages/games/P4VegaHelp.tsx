import type { RefObject } from 'react';

type P4VegaHelpProps = {
    dialogRef: RefObject<HTMLDialogElement | null>;
};

/** Native modal keeps keyboard focus inside the guide, including in fullscreen. */
export default function P4VegaHelp({ dialogRef }: P4VegaHelpProps) {
    return (
        <dialog
            ref={dialogRef}
            className="p4-vega__help-card"
            aria-labelledby="p4-help-heading"
            // Keep game-over Space shortcuts from reaching the document while reading.
            onKeyDown={(event) => event.stopPropagation()}
        >
            <div className="p4-vega__help-header">
                <div>
                    <span className="p4-vega__pause-eyebrow">p4-Vega</span>
                    <h2 id="p4-help-heading">How to play</h2>
                </div>
                <form method="dialog">
                    <button type="submit" className="p4-vega__help-close" aria-label="Close guide" autoFocus>
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                    </button>
                </form>
            </div>
            <div className="p4-vega__help-body">
                <dl>
                    <div>
                        <dt>The goal</dt>
                        <dd>Collect water for 10 points per pickup. Each adds a moving black hole; touching one ends your run.</dd>
                    </div>
                    <div>
                        <dt>Movement</dt>
                        <dd>Use the <kbd>↑ ↓ ← →</kbd> arrow keys, or drag the touch joystick.</dd>
                    </div>
                    <div>
                        <dt>Pause &amp; restart</dt>
                        <dd>Use the pause icon, then Resume. After Game Over, press <kbd>Space</kbd> or tap/click the game to retry.</dd>
                    </div>
                    <div>
                        <dt>Make it musical</dt>
                        <dd>Background Music toggles the soundtrack. Notes Playing enables pickup sounds; Key and Scale shape those notes.</dd>
                    </div>
                    <div>
                        <dt>On your phone</dt>
                        <dd>Use the corner icon for fullscreen and choose Left or Right for its joystick. Outside fullscreen, swipe away from controls to scroll.</dd>
                    </div>
                    <div>
                        <dt>Your best score</dt>
                        <dd>Log in or sign up before playing. Scores submit at Game Over; the leaderboard keeps your personal best.</dd>
                    </div>
                </dl>
                <p className="p4-vega__help-note">An active run stays paused after closing this guide. Choose Resume to continue.</p>
            </div>
        </dialog>
    );
}
