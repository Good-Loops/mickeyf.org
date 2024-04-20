class EventListenerManager {
    static init() {
        this.initSidebarToggle();
    }

    private static initSidebarToggle() {
        const sidebar = document.querySelector('.sidebar') as HTMLElement;
        const sideBarButton = document.querySelector('.sidebar-btn') as HTMLElement;
        const closeButton = document.querySelector('.close-btn') as HTMLElement;

        if (sidebar && sideBarButton) { // Check if sidebar and sidebar button exist
            sideBarButton.addEventListener('click', () => {
                sidebar.classList.toggle('is-visible'); // Toggle sidebar visibility
                sideBarButton.classList.toggle('is-visible'); // Toggle sidebar button visibility
                closeButton.classList.toggle('is-visible'); // Toggle close button visibility
            });
        }
    }
}

export default EventListenerManager;