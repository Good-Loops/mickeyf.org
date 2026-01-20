/**
 * React hook exposing the current `AudioEngine` state to the UI layer.
 *
 * Boundary:
 * - Bridges an imperative audio pipeline (`audioEngine`) into React state updates.
 *
 * Ownership:
 * - The `audioEngine` singleton owns audio lifecycle and state production.
 * - This hook subscribes to state updates and unsubscribes on unmount.
 */
import { useEffect, useState } from "react";
import audioEngine, { type AudioState } from "@/animations/helpers/audio/AudioEngine";

/**
 * Subscribes to `audioEngine` and returns its current `AudioState`.
 *
 * Output:
 * - Returns the latest `AudioState` snapshot emitted by `audioEngine`.
 *
 * Update semantics:
 * - Updates occur when `audioEngine` publishes state changes via its subscription API.
 */
const useAudioEngineState = (): AudioState => {
    const [state, setState] = useState<AudioState>(audioEngine.state);

    useEffect(() => {
        /**
         * Subscription lifecycle:
         * - Subscribes on mount.
         * - Unsubscribes on unmount to avoid leaks/duplicate listeners.
         */
        return audioEngine.subscribe(setState);
}, []);

    return state;
}

export default useAudioEngineState;
