import React, { useEffect, useRef } from "react";
import startDancingCircles from "../../actions/animations/dancing circles/dancingCirclesRunner"; 

const DancingCircles: React.FC = () => {
	const wrapRef = useRef<HTMLElement | null>(null);
  	const uploadRef = useRef<HTMLLabelElement | null>(null);
  	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (!wrapRef.current || !uploadRef.current || !inputRef.current) return;

		let cleanup: (() => void) | undefined;

		(async () => {
			cleanup = await startDancingCircles({
				container: wrapRef.current!,
				uploadButton: uploadRef.current!,
				fileInput: inputRef.current!,
			});
		})();

		return () => {
			cleanup?.();
		};
	}, []);

	return (
		<section className="dancing-circles" ref={wrapRef}>
		<h1 className="u-canvas-title">Dancing Circles</h1>

		<label
			className="dancing-circles__upload-btn floating"
			htmlFor="file-upload"
			ref={uploadRef}
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
