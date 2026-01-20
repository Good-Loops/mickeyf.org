/**
 * Fullscreen toggle button.
 * Bridges the DOM Fullscreen API into a small React control.
 * Subscribes to `fullscreenchange` and must unregister on unmount.
 */
import React, { useEffect, useState, useRef } from "react";

interface FullscreenButtonProps {
    targetRef?: React.RefObject<HTMLElement | HTMLDivElement | null>;
    className?: string;
    label?: string;
}

const FullscreenEnterIcon: React.FC = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        width="100%"
        height="100%"
    >
        <path
            d="M4 9V4h5
               M4 15v5h5
               M20 9V4h-5
               M20 15v5h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const FullscreenExitIcon: React.FC = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        width="100%"
        height="100%"
    >
        <path
            d="
                M5 9 H9 V5
                M5 15 H9 V19
                M19 9 H15 V5
                M19 15 H15 V19
            "
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);


const FullscreenButton: React.FC<FullscreenButtonProps> = ({
    targetRef,
    className = "",
    label,
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const target = targetRef?.current ?? document.documentElement;

    const toggle = async () => {
        if (!target) return;

        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await target.requestFullscreen();
        }
    };

    useEffect(() => {
        const update = () => {
            setIsFullscreen(document.fullscreenElement === target);
        };

        // Must unregister on unmount to prevent leaked listeners.
        document.addEventListener("fullscreenchange", update);

        return () =>
            document.removeEventListener("fullscreenchange", update);
    }, [target]);

    return (
        <button
            type="button"
            className={`fullscreen-btn ${className ?? ""}`}
            onClick={toggle}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            {label ?? (isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />)}
        </button>
    );
};

export default FullscreenButton;
