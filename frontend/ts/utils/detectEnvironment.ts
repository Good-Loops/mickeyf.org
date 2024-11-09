interface Environment {
    isApp: boolean;
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isDesktop: boolean;
}

export const detectEnvironment = (): Environment => {
    const userAgent = navigator.userAgent;

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