/**
 * Class to handle general events such as sidebar toggle, token verification, and logout.
 */
export default class GeneralEvents {
    /**
     * Initializes all general event handlers.
     */
    static init() {
        this.initSidebarToggle();
    }

    /**
     * Initializes the sidebar toggle functionality.
     */
    private static initSidebarToggle() {
        const sidebar = document.querySelector('.menu') as HTMLElement;
        const sideBarButton = document.querySelector(
            '.menu-btn'
        ) as HTMLElement;
        const closeButton = document.querySelector('.close-btn') as HTMLElement;

        if (sidebar && sideBarButton && closeButton) {
            const toggleVisibility = () => {
                sidebar.classList.toggle('is-visible');
                sideBarButton.classList.toggle('is-visible');
                closeButton.classList.toggle('is-visible');
            };

            sideBarButton.addEventListener('click', toggleVisibility);
            closeButton.addEventListener('click', toggleVisibility);
        }
    }
}
