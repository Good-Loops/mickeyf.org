import type MandelbrotSurfaces from "./MandelbrotSurfaces";
import type { MandelbrotView } from "./MandelbrotViewAnimator";

export type SwapBeginResult =
    | { kind: "no-op" }
    | { kind: "immediate"; committedView: MandelbrotView }
    | { kind: "fade-started"; pendingView: MandelbrotView };

export type SwapFinalizeResult =
    | { kind: "not-ready" }
    | { kind: "committed"; committedView: MandelbrotView };

export default class MandelbrotSwapController {
    private pendingSwap = false;
    private pendingView: MandelbrotView | null = null;

    isPending(): boolean {
        return this.pendingSwap;
    }

    getPendingView(): MandelbrotView | null {
        return this.pendingView;
    }

    clear(): void {
        this.pendingSwap = false;
        this.pendingView = null;
    }

    beginSwapToBack(params: {
        surfaces: MandelbrotSurfaces;
        frontComplete: boolean;
        computedView: MandelbrotView;
    }): SwapBeginResult {
        const crossfader = params.surfaces.crossfader;
        if (!crossfader || !params.surfaces.front || !params.surfaces.back) return { kind: "no-op" };

        // First ever completed frame: swap immediately (no fade from an uninitialized front).
        if (!params.frontComplete) {
            params.surfaces.swapFrontBackAndShowFront();
            this.clear();
            return { kind: "immediate", committedView: params.computedView };
        }

        // Crossfade avoids the visible "twitch" from a hard texture swap.
        if (crossfader.isFading() || this.pendingSwap) return { kind: "no-op" };

        this.pendingView = params.computedView;
        this.pendingSwap = true;

        crossfader.beginFadeTo(params.surfaces.back.texture);

        return { kind: "fade-started", pendingView: params.computedView };
    }

    finalizeSwapIfReady(params: {
        surfaces: MandelbrotSurfaces;
        deltaSeconds: number;
    }): SwapFinalizeResult {
        if (!this.pendingSwap) return { kind: "not-ready" };

        const crossfader = params.surfaces.crossfader;
        if (!crossfader) return { kind: "not-ready" };

        crossfader.step(params.deltaSeconds);
        if (crossfader.isFading()) return { kind: "not-ready" };

        const committedView = this.pendingView;
        if (!committedView) {
            this.clear();
            return { kind: "not-ready" };
        }

        params.surfaces.swapFrontBackAndShowFront();

        this.clear();
        return { kind: "committed", committedView };
    }
}
