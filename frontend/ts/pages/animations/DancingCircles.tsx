import React, { useEffect, useRef, useState } from "react";
import { runDancingCircles } from "@/animations/dancing circles/runDancingCircles"; 
import FullscreenButton from "@/components/FullscreenButton";
import MusicControls from "@/components/MusicControls";
import AudioHandler from "@/animations/helpers/AudioHandler";

const DancingCircles: React.FC = () => {
	const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  	const inputRef = useRef<HTMLInputElement | null>(null);

	const [audioPlaying, setAudioPlaying] = useState(false);
	const [hasAudio, setHasAudio] = useState(false);

	useEffect(() => {
		if (!canvasWrapperRef.current) return;

		let dispose: (() => void) | undefined;

		(async () => {
			dispose = await runDancingCircles({
				container: canvasWrapperRef.current!,
			});
		})();

		return () => {
			dispose?.();
		};
	}, []);

	useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        const cleanup = AudioHandler.initializeUploadButton(
            input,
            (playing: boolean) => {
                setAudioPlaying(playing);
                if (playing) setHasAudio(true);
            }
        );

        return () => cleanup();
    }, []);

	// Stop audio on unmount
	useEffect(() => {
        return () => {
            AudioHandler.stop();
        };
    }, []);

    const handlePlay = () => AudioHandler.play();
    const handlePause = () => AudioHandler.pause();
    const handleStop = () => AudioHandler.stop();

	return (
		<section className="dancing-circles">
			<h1 className="u-canvas-title">Dancing Circles</h1>

			<div 
				className="dancing-circles__canvas-wrapper" 
				ref={canvasWrapperRef}
			>
				<FullscreenButton
					targetRef={canvasWrapperRef}
					className="dancing-circles__fullscreen-btn"
				/>
    	   </div>

			<div className="dancing-circles__transport">
                <div className="dancing-circles__transport-controls">
                    <MusicControls
                        hasAudio={hasAudio}
                        isPlaying={audioPlaying}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onStop={handleStop}
                    />
                </div>

                <div className="dancing-circles__upload floating">
                    <label
                        className="dancing-circles__upload-btn"
                        htmlFor="dancing-circles-file-upload"
                    >
                        Upload Music
                    </label>
                    <input
                        id="dancing-circles-file-upload"
                        type="file"
                        accept="audio/*"
                        className="dancing-circles__input"
                        ref={inputRef}
                    />
                </div>
            </div>
		</section>
	);
};

export default DancingCircles;
