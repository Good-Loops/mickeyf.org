import React, { useEffect, useRef, useState } from "react";
import { runDancingCircles } from "@/animations/dancing circles/runDancingCircles"; 
import FullscreenButton from "@/components/FullscreenButton";
import MusicControls from "@/components/MusicControls";
import AudioHandler from "@/animations/helpers/AudioHandler";

const DancingCircles: React.FC = () => {
	const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  	const inputRef = useRef<HTMLInputElement | null>(null);

	const [audioState, setAudioState] = useState(AudioHandler.state);
	const [hasAudio, setHasAudio] = useState(AudioHandler.hasAudio());

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
        return AudioHandler.subscribe((state) => {
            setAudioState(state);
            setHasAudio(AudioHandler.hasAudio());
        });
    }, []);


	useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        return AudioHandler.initializeUploadButton(input);
    }, []);

	// Stop audio on unmount
	useEffect(() => {
        return () => {
            AudioHandler.dispose();
        };
    }, []);

    const handlePlay = () => AudioHandler.play();
    const handlePause = () => AudioHandler.pause();
    const handleStop = () => AudioHandler.stop();

	return (
		<section className="dancing-circles">
			<h1 className="canvas-title">Dancing Circles</h1>

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
                        isPlaying={audioState.playing}
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
