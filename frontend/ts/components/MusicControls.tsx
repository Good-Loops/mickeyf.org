import React from "react";

export interface MusicControlsProps {
    /** True when an audio file has been loaded and is controllable */
    hasAudio: boolean;
    /** True when audio is currently playing */
    isPlaying: boolean;

    /** Called when user clicks Play */
    onPlay: () => void;
    /** Called when user clicks Pause */
    onPause: () => void;
    /** Called when user clicks Stop */
    onStop: () => void;

    /** Optional extra class to position it (bottom-left, etc.) */
    className?: string;
}

/**
 * Reusable Play / Pause / Stop controls for any animation that uses audio.
 * Only becomes interactive when `hasAudio` is true.
 */
const MusicControls: React.FC<MusicControlsProps> = ({
    hasAudio,
    isPlaying,
    onPlay,
    onPause,
    onStop,
    className,
}) => {
    const rootClasses = [
        "music-controls",
        !hasAudio ? "music-controls--disabled" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");

    const handlePlay = () => {
        if (!hasAudio || isPlaying) return;
        onPlay();
    };

    const handlePause = () => {
        if (!hasAudio || !isPlaying) return;
        onPause();
    };

    const handleStop = () => {
        if (!hasAudio) return;
        onStop();
    };

    return (
        <div className={rootClasses} aria-label="Music controls">
            <button
                type="button"
                className="music-controls__btn music-controls__btn--play"
                onClick={handlePlay}
                disabled={!hasAudio || isPlaying}
                aria-label="Play"
            >
                <svg
                    className="music-controls__icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <polygon points="9,6 18,12 9,18" />
                </svg>
            </button>

            <button
                type="button"
                className="music-controls__btn music-controls__btn--pause"
                onClick={handlePause}
                disabled={!hasAudio || !isPlaying}
                aria-label="Pause"
            >
               <svg
                    className="music-controls__icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <rect x="7" y="5" width="4" height="14" />
                    <rect x="13" y="5" width="4" height="14" />
                </svg>
            </button>

            <button
                type="button"
                className="music-controls__btn music-controls__btn--stop"
                onClick={handleStop}
                disabled={!hasAudio}
                aria-label="Stop"
            >
                <svg
                    className="music-controls__icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <rect x="7" y="7" width="10" height="10" />
                </svg>
            </button>
        </div>
    );
};

export default MusicControls;
