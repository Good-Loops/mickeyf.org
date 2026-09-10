type CanvasEventSystem = { autoPreventDefault: boolean };

/** PIXI owns its canvas listeners, but embedded canvases must not own page swipes. */
export function enableCanvasPageGestures(
    canvas: HTMLCanvasElement,
    events: CanvasEventSystem,
): void {
    events.autoPreventDefault = false;
    // PIXI sets this inline during initialization, so a stylesheet alone cannot undo it.
    canvas.style.touchAction = 'pan-y pinch-zoom';
}
