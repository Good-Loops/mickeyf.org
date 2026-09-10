export type P4RunResult = {
    outcome: 'defeat' | 'completed';
    score: number;
    submission: 'signed-out' | 'submitting' | 'submitted' | 'failed';
    personalBest: boolean;
};

type ResultDependencies = {
    submit: (score: number, signal: AbortSignal) => Promise<{ personalBest: boolean }>;
    onChange: (result: P4RunResult | null) => void;
    timeoutMs?: number;
};

/** Results never block restarting; each request belongs to exactly one finished run. */
export function createP4RunResults(dependencies: ResultDependencies) {
    let result: P4RunResult | null = null;
    let generation = 0;
    let request: AbortController | null = null;

    const publish = (): void => dependencies.onChange(result ? { ...result } : null);
    const clear = (): void => {
        generation++;
        request?.abort();
        request = null;
        result = null;
    };
    const submit = async (): Promise<void> => {
        if (!result || request) return;
        const version = generation;
        const currentRequest = new AbortController();
        request = currentRequest;
        result = { ...result, submission: 'submitting' };
        publish();
        const timeout = setTimeout(() => currentRequest.abort(), dependencies.timeoutMs ?? 10_000);
        try {
            const response = await dependencies.submit(result.score, currentRequest.signal);
            if (version !== generation || !result) return;
            result = { ...result, submission: 'submitted', personalBest: response.personalBest };
        } catch {
            if (version !== generation || !result) return;
            result = { ...result, submission: 'failed' };
        } finally {
            clearTimeout(timeout);
            if (version === generation) {
                request = null;
                publish();
            }
        }
    };

    return {
        finish(outcome: P4RunResult['outcome'], score: number, authenticated: boolean): Promise<void> {
            clear();
            result = { outcome, score, personalBest: false, submission: authenticated ? 'submitting' : 'signed-out' };
            publish();
            return authenticated ? submit() : Promise.resolve();
        },
        retry(): Promise<void> {
            return result?.submission === 'failed' ? submit() : Promise.resolve();
        },
        reset(): void { clear(); publish(); },
        dispose: clear,
    };
}
