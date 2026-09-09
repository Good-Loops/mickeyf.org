import assert from 'node:assert/strict';
import test from 'node:test';
import { bindP4Input } from './p4Input.ts';

const eventTarget = () => {
    const listeners = new Map();
    return {
        listeners,
        addEventListener(name, handler) { listeners.set(name, handler); },
        removeEventListener(name, handler) {
            assert.equal(listeners.get(name), handler);
            listeners.delete(name);
        },
        emit(name, overrides = {}) {
            const event = {
                defaultPrevented: false, repeat: false, target: null,
                pointerId: 1, isPrimary: true, button: 0, clientX: 85, clientY: 50,
                preventDefault() { this.defaultPrevented = true; },
                ...overrides,
            };
            listeners.get(name)?.(event);
            return event;
        },
    };
};

const fixture = () => {
    const keyboard = eventTarget();
    const thumb = { style: { transform: '' } };
    const captures = new Set();
    const joystick = {
        ...eventTarget(),
        querySelector: () => thumb,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100 }),
        setPointerCapture: (pointer) => captures.add(pointer),
        hasPointerCapture: (pointer) => captures.has(pointer),
        releasePointerCapture: (pointer) => captures.delete(pointer),
    };
    const movement = { isMovingRight: false, isMovingLeft: false, isMovingUp: false, isMovingDown: false };
    let running = true;
    let restartReady = false;
    let restarts = 0;
    const input = bindP4Input({
        keyboardTarget: keyboard, joysticks: [joystick], movement: () => movement,
        canMove: () => running, canRestart: () => restartReady,
        restart: () => { restarts++; },
    });
    return {
        input, keyboard, joystick, movement, captures, thumb,
        setRunning: (value) => { running = value; },
        setRestartReady: (value) => { restartReady = value; },
        get restarts() { return restarts; },
    };
};

test('clearing held arrows and ignoring repeats prevents stuck movement across pause', () => {
    const f = fixture();
    f.keyboard.emit('keydown', { code: 'ArrowRight' });
    assert.equal(f.movement.isMovingRight, true);
    f.setRunning(false);
    f.input.clear();
    f.keyboard.emit('keydown', { code: 'ArrowLeft' });
    assert.equal(f.movement.isMovingLeft, false);
    f.setRunning(true);
    f.keyboard.emit('keydown', { code: 'ArrowRight', repeat: true });
    assert.equal(f.movement.isMovingRight, false);
    f.keyboard.emit('keyup', { code: 'ArrowRight' });
    f.keyboard.emit('keydown', { code: 'ArrowRight' });
    assert.equal(f.movement.isMovingRight, true);
    f.keyboard.emit('keyup', { code: 'ArrowRight' });
    assert.equal(f.movement.isMovingRight, false);
});

test('Space activates page buttons normally and restarts only a finished game-over', () => {
    const f = fixture();
    f.keyboard.emit('keydown', { code: 'Space' });
    assert.equal(f.restarts, 0);
    f.setRunning(false);
    f.setRestartReady(true);
    const button = { closest: (selector) => selector.includes('button') ? {} : null };
    const press = f.keyboard.emit('keydown', { code: 'Space', target: button });
    assert.equal(press.defaultPrevented, false);
    assert.equal(f.restarts, 0);
    f.keyboard.emit('keydown', { code: 'Space', repeat: true });
    assert.equal(f.restarts, 0);
    f.keyboard.emit('keydown', { code: 'Space' });
    assert.equal(f.restarts, 1);
});

test('editable fields retain arrows and Space; focused game buttons retain movement arrows', () => {
    const f = fixture();
    const input = { closest: (selector) => selector.includes('input') ? {} : null };
    const press = f.keyboard.emit('keydown', { code: 'ArrowRight', target: input });
    assert.equal(press.defaultPrevented, false);
    assert.equal(f.movement.isMovingRight, false);
    const button = { closest: (selector) => selector.includes('button') ? {} : null };
    f.keyboard.emit('keydown', { code: 'ArrowRight', target: button });
    assert.equal(f.movement.isMovingRight, true);
});

test('pause releases joystick capture, centers its thumb and ignores the old pointer after resume', () => {
    const f = fixture();
    f.joystick.emit('pointerdown');
    assert.equal(f.movement.isMovingRight, true);
    assert.equal(f.captures.has(1), true);
    f.setRunning(false);
    f.input.clear();
    assert.equal(f.captures.size, 0);
    assert.equal(f.thumb.style.transform, 'translate(0, 0)');
    assert.equal(f.movement.isMovingRight, false);
    f.joystick.emit('pointerdown', { pointerId: 2 });
    assert.equal(f.captures.size, 0);
    f.setRunning(true);
    f.joystick.emit('pointermove');
    assert.equal(f.movement.isMovingRight, false);
    f.joystick.emit('pointerdown', { pointerId: 3 });
    assert.equal(f.movement.isMovingRight, true);
});

test('pointer cancellation and disposal remove input ownership', () => {
    const f = fixture();
    f.joystick.emit('pointerdown');
    f.joystick.emit('pointercancel');
    assert.equal(f.movement.isMovingRight, false);
    assert.equal(f.captures.size, 0);
    f.joystick.emit('pointerdown', { pointerId: 2 });
    f.input.dispose();
    assert.equal(f.captures.size, 0);
    assert.equal(f.keyboard.listeners.size, 0);
    assert.equal(f.joystick.listeners.size, 0);
});
