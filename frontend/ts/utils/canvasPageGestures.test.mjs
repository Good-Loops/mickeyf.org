import assert from 'node:assert/strict';
import test from 'node:test';
import { enableCanvasPageGestures } from './canvasPageGestures.ts';

test('embedded canvases allow vertical scrolling and pinch zoom instead of PIXI defaults', () => {
    const canvas = { style: { touchAction: 'none', width: '100%' } };
    const events = { autoPreventDefault: true };

    enableCanvasPageGestures(canvas, events);

    assert.equal(events.autoPreventDefault, false);
    assert.equal(canvas.style.touchAction, 'pan-y pinch-zoom');
    assert.equal(canvas.style.width, '100%');
});
