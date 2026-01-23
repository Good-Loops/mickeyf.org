/**
 * Represents the environment in which the application is running.
 * 
 * @interface Environment
 * @property {boolean} isApp - Indicates if the environment is an application.
 * @property {boolean} isMobile - Indicates if the environment is a mobile device.
 * @property {boolean} isIOS - Indicates if the environment is an iOS device.
 * @property {boolean} isAndroid - Indicates if the environment is an Android device.
 * @property {boolean} isDesktop - Indicates if the environment is a desktop device.
 */
export interface Environment {
    isApp: boolean;
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isDesktop: boolean;
}

/**
 * Detects the current environment based on the user agent and URL.
 *
 * @returns {Environment} An object containing boolean flags indicating the environment:
 * - `isApp`: True if the URL contains 'app=true'.
 * - `isMobile`: True if the user agent indicates a mobile device.
 * - `isIOS`: True if the user agent indicates an iOS device.
 * - `isAndroid`: True if the user agent indicates an Android device.
 * - `isDesktop`: True if the environment is not mobile and not an app.
 */
export function detectEnvironment(): Environment {
    const { userAgent } = navigator;

    const isApp = window.location.href.includes('app=true');
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);

    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);

    return {
        isApp,
        isMobile,
        isIOS,
        isAndroid,
        isDesktop: !isMobile && !isApp,
    };
};
