const hashInfo = () => {
    const url = window.location.href;
    const queryParameters = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    return {
        url,
        queryParameters,
        hash
    };
};

export default hashInfo;