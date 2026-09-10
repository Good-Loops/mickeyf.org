const MAX_TAP_MOVEMENT = 10;

/** Keeps scrolling and dragging over the game-over canvas from starting a new run. */
export const bindP4RestartTap = (
    canvas: HTMLCanvasElement,
    canRestart: () => boolean,
    restart: () => void,
): (() => void) => {
    let tap: { pointerId: number; x: number; y: number } | null = null;

    const cancel = (): void => { tap = null; };
    const exceedsMovementLimit = (event: PointerEvent): boolean => tap !== null
        && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > MAX_TAP_MOVEMENT;

    const start = (event: PointerEvent): void => {
        cancel();
        if (!canRestart() || !event.isPrimary || event.button !== 0) return;
        tap = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent): void => {
        if (event.pointerId === tap?.pointerId && exceedsMovementLimit(event)) cancel();
    };
    const end = (event: PointerEvent): void => {
        if (event.pointerId !== tap?.pointerId) return;
        const shouldRestart = event.button === 0 && !exceedsMovementLimit(event) && canRestart();
        cancel();
        if (shouldRestart) restart();
    };

    canvas.addEventListener('pointerdown', start, { passive: true });
    canvas.addEventListener('pointermove', move, { passive: true });
    canvas.addEventListener('pointerup', end, { passive: true });
    canvas.addEventListener('pointercancel', cancel, { passive: true });
    canvas.addEventListener('pointerleave', cancel, { passive: true });

    return () => {
        cancel();
        canvas.removeEventListener('pointerdown', start);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', end);
        canvas.removeEventListener('pointercancel', cancel);
        canvas.removeEventListener('pointerleave', cancel);
    };
};
