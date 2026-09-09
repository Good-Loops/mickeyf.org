mergeInto(LibraryManager.library, {
    MickeyfThreeBossesCanvasTopRatio: function () {
        var canvas = Module.canvas;
        if (!canvas) return 0;
        var bounds = canvas.getBoundingClientRect();
        return bounds.height > 0 ? bounds.top / bounds.height : 0;
    },

    MickeyfThreeBossesScrollPage: function (normalizedDelta) {
        try {
            var scrollPage = window.MickeyfThreeBossesScrollPage;
            if (typeof scrollPage === 'function') scrollPage(normalizedDelta);
        } catch (error) {
            console.warn('The Three Bosses page-scroll bridge failed.', error);
        }
    },
});
