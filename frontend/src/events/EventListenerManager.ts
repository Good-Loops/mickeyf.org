class EventListenerManager {
    static init() {
        this.initSidebarToggle();
    }

    private static initSidebarToggle() {
        const sidebar = document.querySelector('.sidebar') as HTMLElement;
        const sideBarButton = document.querySelector('.sidebar-btn') as HTMLElement;
        const closeButton = document.querySelector('.close-btn') as HTMLElement;

        if (sidebar && sideBarButton && closeButton) { // Check if sidebar, sidebar button, and close button exist
            const toggleVisibility = () => {
                sidebar.classList.toggle('is-visible'); // Toggle sidebar visibility
                sideBarButton.classList.toggle('is-visible'); // Toggle sidebar button visibility
                closeButton.classList.toggle('is-visible'); // Toggle close button visibility
            };

            sideBarButton.addEventListener('click', toggleVisibility);
            closeButton.addEventListener('click', toggleVisibility);
        }
    }
}

export default EventListenerManager;