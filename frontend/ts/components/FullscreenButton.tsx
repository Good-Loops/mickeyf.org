import React, { useEffect, useState, useRef } from "react";

interface FullscreenButtonProps {
    targetRef?: React.RefObject<HTMLElement | HTMLDivElement | null>;
    className?: string;
    label?: string;
}

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

        document.addEventListener("fullscreenchange", update);

        return () =>
            document.removeEventListener("fullscreenchange", update);
    }, [target]);

    return (
        <button
            type="button"
            className={`fullscreen-btn ${isFullscreen ? "fullscreen-btn--active" : ""} ${className}`}
            onClick={toggle}
        >
            {label ?? (isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen")}
        </button>
    );
};

export default FullscreenButton;
