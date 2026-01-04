// Central debug flags used across animation modules.
// Keep these as compile-time constants so bundlers can dead-code-eliminate
// debug-only branches and logging.

export const DEBUG_ZOOM_OUT_ROT = true;
export const DEBUG_ZOOM = true; // Enable for manual zoom safety diagnostics.
export const DEBUG_ZOOM_OUT_FORCE_ROTATION_PASSTHROUGH = true; // Temporary toggle to bypass preview rotation policy.
export const DEBUG_ZOOM_OUT_LOG_INTERVAL_MS = 150;
export const DEBUG_ANIMATION_SPEED = 8; // 1 = normal speed, >1 = faster (testing only)
