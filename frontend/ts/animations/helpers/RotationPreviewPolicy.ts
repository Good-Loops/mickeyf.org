export type RotationPreviewMode = "in" | "out";

export function getPreviewRotationDelta(
    mode: RotationPreviewMode,
    smoothedPreviewDelta: number
): number {
    return mode === "out" ? 0 : smoothedPreviewDelta;
}
