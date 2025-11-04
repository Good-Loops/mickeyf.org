import React, { useEffect, useRef } from "react";
import dancingCircles from "../../actions/animations/dancing circles/dancingCircles"; 

const DancingCircles: React.FC = () => {
	const initializedRef = useRef(false);

	useEffect(() => {
		const w = window as any;

		if (!w.eventListeners) w.eventListeners = {};
		if (!w.eventListeners["dancing-circles"]) {
			w.eventListeners["dancing-circles"] = [];
		}

		let cancelled = false;

		async function tryInit() {
			// don’t init twice (StrictMode / double render safety)
			if (initializedRef.current) return;

			// wait for the container to really be in the DOM
			const container = document.querySelector(
				"[data-dancing-circles]"
			) as HTMLElement | null;

			// if it’s not there yet or has 0 size, try again shortly
			if (!container || container.clientWidth === 0) {
				if (!cancelled) {
					// try again on the next frame
					requestAnimationFrame(tryInit);
				}
				return;
			}

			// at this point we have a real container
			initializedRef.current = true;

			// clean old canvases
			container.querySelectorAll("canvas").forEach((c) => c.remove());

			// run Pixi setup
			await dancingCircles();
		}

		// kick it off
		requestAnimationFrame(tryInit);

		return () => {
			cancelled = true;

			const ww = window as any;

			if (ww.danceCirclesAnimationID) {
				cancelAnimationFrame(ww.danceCirclesAnimationID);
				delete ww.danceCirclesAnimationID;
			}

			if (ww.__PIXI_APP__) {
				try {
					ww.__PIXI_APP__.destroy(true);
				} catch {}
				delete ww.__PIXI_APP__;
			}

			const wrap = document.querySelector("[data-dancing-circles]") as HTMLElement | null;
			if (wrap) {
				wrap.querySelectorAll("canvas").forEach((c) => c.remove());
			}

			if (ww.eventListeners?.["dancing-circles"]) {
				ww.eventListeners["dancing-circles"].forEach((l: any) => {
					if (l.element && l.event && l.handler) {
						l.element.removeEventListener(l.event, l.handler);
					}
				});
				delete ww.eventListeners["dancing-circles"];
			}
		};
	}, []);

	return (
		<section className="dancing-circles" data-dancing-circles>
		<h1 className="u-canvas-title">Dancing Circles</h1>

		<label
			className="dancing-circles__upload-btn floating"
			htmlFor="file-upload"
			data-upload-button
		>
			Upload Music
		</label>

		<input
			className="dancing-circles__input"
			id="file-upload"
			type="file"
			name="fileupload"
			accept="audio/*"
			data-file-upload
		/>
		</section>
	);
};

export default DancingCircles;
