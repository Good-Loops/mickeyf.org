type NoteSynth = {
    readonly sampleTime: number;
    now: () => number;
    triggerAttackRelease: (note: number, duration: number, time: number) => unknown;
};

/** Keep catch-up pickups audible without allowing optional audio to stop the game loop. */
export function createGameplayNotePlayback(synth: NoteSynth, onError: (error: unknown) => void) {
    let lastScheduledTime = -Infinity;
    let errorReported = false;

    return (selectNote: () => number): void => {
        try {
            const note = selectNote();
            // A render can contain several simulation steps sharing the same audio-clock value.
            const time = Math.max(synth.now(), lastScheduledTime + synth.sampleTime);
            lastScheduledTime = time;
            synth.triggerAttackRelease(note, .8, time);
        } catch (error) {
            if (!errorReported) {
                errorReported = true;
                onError(error);
            }
        }
    };
}
