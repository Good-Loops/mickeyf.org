import React, { useEffect, useRef } from "react";
import dancingCirclesRunner from "../../actions/animations/dancing circles/dancingCirclesRunner"; 

const DancingCircles: React.FC = () => {
	const containerRef = useRef<HTMLElement | null>(null);
  	const uploadRef = useRef<HTMLLabelElement | null>(null);
  	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (!containerRef.current || !uploadRef.current || !inputRef.current) return;

		let dispose: (() => void) | undefined;

		(async () => {
			dispose = await dancingCirclesRunner({
				container: containerRef.current!,
				uploadButton: uploadRef.current!,
				fileInput: inputRef.current!,
			});
		})();

		return () => {
			dispose?.();
		};
	}, []);

	return (
		<section className="dancing-circles" ref={containerRef}>
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
