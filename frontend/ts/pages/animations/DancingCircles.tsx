import React, { useEffect, useRef } from "react";
import runDancingCircles from "@/animations/dancing circles/runDancingCircles"; 
import FullscreenButton from "@/components/FullscreenButton";

const DancingCircles: React.FC = () => {
	const containerRef = useRef<HTMLDivElement | null>(null);
  	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (!containerRef.current || !inputRef.current) return;

		let dispose: (() => void) | undefined;

		(async () => {
			dispose = await runDancingCircles({
				container: containerRef.current!,
				fileInput: inputRef.current!,
			});
		})();

		return () => {
			dispose?.();
		};
	}, []);

	return (
		<section className="dancing-circles">
			<h1 className="u-canvas-title">Dancing Circles</h1>

			<div className="dancing-circles__canvas-wrapper" ref={containerRef}>
				<FullscreenButton
					targetRef={containerRef}
					className="dancing-circles__fullscreen-btn"
				/>
    	   </div>

			<label
				className="dancing-circles__upload-btn floating"
				htmlFor="file-upload"
			>
				Upload Music
			</label>
			<input
				className="dancing-circles__input"
				id="file-upload"
				type="file"
				name="fileupload"
				accept="audio/*"
				ref={inputRef}
			/>
		</section>
	);
};

export default DancingCircles;
