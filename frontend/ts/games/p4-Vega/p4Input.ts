type Movement = {
    isMovingRight: boolean;
    isMovingLeft: boolean;
    isMovingUp: boolean;
    isMovingDown: boolean;
};

type InputOptions = {
    keyboardTarget: Pick<Document, 'addEventListener' | 'removeEventListener'>;
    joysticks: readonly HTMLElement[];
    movement: () => Movement | undefined;
    canMove: () => boolean;
    canRestart: () => boolean;
    restart: () => void;
};

const directions = {
    ArrowRight: 'isMovingRight',
    ArrowLeft: 'isMovingLeft',
    ArrowUp: 'isMovingUp',
    ArrowDown: 'isMovingDown',
} as const;

const closest = (target: EventTarget | null, selector: string): boolean => {
    const element = target as Element | null;
    return typeof element?.closest === 'function' && element.closest(selector) !== null;
};

/** Keeps page controls keyboard-accessible and drops held movement across pause/restart. */
export function bindP4Input(options: InputOptions) {
    const cleanups: Array<() => void> = [];
    const joystickResets: Array<() => void> = [];

    const clearMovement = (): void => {
        const movement = options.movement();
        if (!movement) return;
        movement.isMovingRight = false;
        movement.isMovingLeft = false;
        movement.isMovingUp = false;
        movement.isMovingDown = false;
    };

    const keydown = (event: KeyboardEvent): void => {
        if (event.defaultPrevented || closest(event.target, 'input,select,textarea,[contenteditable]:not([contenteditable="false"])')) return;
        if (event.code === 'Space') {
            if (closest(event.target, 'button,a[href],[role="button"],[role="menuitem"]')) return;
            if (!options.canRestart() && !options.canMove()) return;
            event.preventDefault();
            if (options.canRestart() && !event.repeat) options.restart();
            return;
        }
        const direction = directions[event.code as keyof typeof directions];
        const movement = options.movement();
        if (!direction || !movement || !options.canMove()) return;
        event.preventDefault();
        // Flags sustain movement already; a held key must not re-engage after a pause.
        if (!event.repeat) movement[direction] = true;
    };

    const keyup = (event: KeyboardEvent): void => {
        const direction = directions[event.code as keyof typeof directions];
        const movement = options.movement();
        if (direction && movement) movement[direction] = false;
    };

    options.keyboardTarget.addEventListener('keydown', keydown as EventListener);
    options.keyboardTarget.addEventListener('keyup', keyup as EventListener);
    cleanups.push(() => {
        options.keyboardTarget.removeEventListener('keydown', keydown as EventListener);
        options.keyboardTarget.removeEventListener('keyup', keyup as EventListener);
    });

    options.joysticks.forEach((joystick) => {
        const thumb = joystick.querySelector<HTMLElement>('[data-p4-joystick-thumb]');
        if (!thumb) return;
        let pointerId: number | null = null;

        const reset = (): void => {
            const capturedPointer = pointerId;
            pointerId = null;
            clearMovement();
            thumb.style.transform = 'translate(0, 0)';
            if (capturedPointer !== null && joystick.hasPointerCapture(capturedPointer)) {
                joystick.releasePointerCapture(capturedPointer);
            }
        };
        joystickResets.push(reset);

        const move = (event: PointerEvent): void => {
            const movement = options.movement();
            if (event.pointerId !== pointerId || !movement || !options.canMove()) return;
            event.preventDefault();
            const bounds = joystick.getBoundingClientRect();
            const radius = bounds.width * .32;
            if (radius <= 0) return;
            const offsetX = event.clientX - (bounds.left + bounds.width * .5);
            const offsetY = event.clientY - (bounds.top + bounds.height * .5);
            const distance = Math.hypot(offsetX, offsetY);
            const scale = distance > radius ? radius / distance : 1;
            const x = offsetX * scale;
            const y = offsetY * scale;
            const threshold = radius * .22;
            thumb.style.transform = `translate(${x}px, ${y}px)`;
            movement.isMovingLeft = x < -threshold;
            movement.isMovingRight = x > threshold;
            movement.isMovingUp = y < -threshold;
            movement.isMovingDown = y > threshold;
        };

        const start = (event: PointerEvent): void => {
            if (!options.canMove() || !event.isPrimary || event.button !== 0 || pointerId !== null) return;
            pointerId = event.pointerId;
            joystick.setPointerCapture(pointerId);
            move(event);
        };
        const stop = (event: PointerEvent): void => {
            if (event.pointerId !== pointerId) return;
            event.preventDefault();
            reset();
        };
        const listeners = [
            ['pointerdown', start], ['pointermove', move],
            ['pointerup', stop], ['pointercancel', stop], ['lostpointercapture', stop],
        ] as const;
        listeners.forEach(([name, handler]) => {
            joystick.addEventListener(name, handler as EventListener);
            cleanups.push(() => joystick.removeEventListener(name, handler as EventListener));
        });
    });

    const clear = (): void => {
        clearMovement();
        joystickResets.forEach((reset) => reset());
    };
    return {
        clear,
        dispose(): void {
            cleanups.forEach((cleanup) => cleanup());
            clear();
        },
    };
}
