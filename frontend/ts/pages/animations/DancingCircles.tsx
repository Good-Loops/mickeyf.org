import React, { useEffect, useRef } from "react";
import { runDancingCircles } from "@/animations/dancing circles/runDancingCircles"; 
import FullscreenButton from "@/components/FullscreenButton";
import MusicControls from "@/components/MusicControls";
import audioEngine from "@/animations/helpers/audio/AudioEngine";
import useAudioEngineState from "@/hooks/useAudioEngineState";
import { CANVAS_WIDTH } from "@/utils/constants";

const DancingCircles: React.FC = () => {
	const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  	const inputRef = useRef<HTMLInputElement | null>(null);
	const audio = useAudioEngineState();

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

    // Hook upload button to audio engine
	useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        return audioEngine.initializeUploadButton(input);
    }, []);

	// Stop audio on unmount
	useEffect(() => {
        return () => {
            audioEngine.dispose();
        };
    }, []);

    const handlePlay = () => audioEngine.play();
    const handlePause = () => audioEngine.pause();
    const handleStop = () => audioEngine.stop();

	return (
		<section 
            className="dancing-circles"
            style={{ ["--canvas-width" as any]: `${CANVAS_WIDTH}px` }}
        >
			<h1 className="dancing-circles__title canvas-title">Dancing Circles</h1>

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
                        hasAudio={audio.hasAudio}
                        isPlaying={audio.playing}
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
