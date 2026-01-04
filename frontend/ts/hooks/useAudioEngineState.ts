import { useEffect, useState } from "react";
import audioEngine, { type AudioState } from "@/animations/helpers/audio/AudioEngine";

export default function useAudioEngineState(): AudioState {
    const [state, setState] = useState<AudioState>(audioEngine.state);

    useEffect(() => {
        return audioEngine.subscribe(setState);
    }, []);

    return state;
}
