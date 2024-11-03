interface Environment {
    isApp: boolean;
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isDesktop: boolean;
}

export const detectEnvironment = (): Environment => {
    const userAgent: string = navigator.userAgent;

    const isApp: boolean = window.location.href.includes('app=true');
    const isMobile: boolean = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);

    const isIOS: boolean = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid: boolean = /Android/i.test(userAgent);

    return {
        isApp,
        isMobile,
        isIOS,
        isAndroid,
        isDesktop: !isMobile && !isApp,
    };
};