import { API_URL } from "../utils/constants";

class EventListenerManager {
    static init() {
        this.initSidebarToggle();
        this.initTokenVerification();
    }

    private static initSidebarToggle() {
        const sidebar = document.querySelector('.menu') as HTMLElement;
        const sideBarButton = document.querySelector('.menu-btn') as HTMLElement;
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

    private static initTokenVerification() {
        const token = localStorage.getItem('sessionToken');
        if (token) {
            fetch(`${API_URL}/auth/verify-token`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
            .then(response => response.json())
            .then(data => {
                if (data.loggedIn) {
                    window.isLoggedIn = true;
                    // Hide login and signup links
                    const loginSignupItems = document.getElementsByClassName('login-signup') as HTMLCollectionOf<HTMLElement>;
                    Array.from(loginSignupItems).forEach(function (item) {
                        item.style.display = 'none';
                    });
                    // Show logged in message
                    const username = localStorage.getItem('user_name');
                    const loggedInMessages = document.getElementsByClassName('logged-in-message') as HTMLCollectionOf<HTMLElement>;
                    Array.from(loggedInMessages).forEach(function (item) {
                        item.style.display = 'list-item';
                        item.innerText = `Logged in as: ${username}`;
                    });
                } else {
                    window.isLoggedIn = false;
                }
            })
            .catch(error => console.error('Error verifying token:', error));
        }
    }

}

export default EventListenerManager;