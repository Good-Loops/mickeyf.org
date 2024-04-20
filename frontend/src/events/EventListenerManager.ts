class EventListenerManager {
    static init() {
        this.initSidebarToggle();
    }

    private static initSidebarToggle() {
        const sidebar = document.querySelector('.sidebar') as HTMLElement;
        const toggleButton = document.querySelector('.sidebar-btn') as HTMLElement;

        if (sidebar && toggleButton) {
            toggleButton.addEventListener('click', () => {
                sidebar.classList.toggle('is-visible');
            });
        }
    }
}

export default EventListenerManager;