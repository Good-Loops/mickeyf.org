/**
 * Class to handle general events such as sidebar toggle, token verification, and logout.
 */
export default class GeneralEvents {
    /**
     * Initializes all general event handlers.
     */
    static init() {
        this.initSidebarToggle();
        this.initTokenVerification();
        this.initLogoutButton();
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

    /**
     * Initializes token verification by checking the session token in local storage.
     */
    private static initTokenVerification() {
        const token = localStorage.getItem('sessionToken');

        const environment = process.env.NODE_ENV as string;
        const apiUrl =
            environment === 'development'
                ? process.env.DEV_API_URL!
                : process.env.PROD_API_URL!;

        if (token) {
            fetch(`${apiUrl}/auth/verify-token`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.loggedIn) {
                        window.isLoggedIn = true;
                        // Hide login and signup links
                        const loginSignupItems =
                            document.getElementsByClassName(
                                'login-signup'
                            ) as HTMLCollectionOf<HTMLElement>;
                        Array.from(loginSignupItems).forEach(function (item) {
                            item.style.display = 'none';
                        });
                        // Show logged in message
                        const username = localStorage.getItem('user_name');
                        const loggedInMessages =
                            document.getElementsByClassName(
                                'logged-in-message'
                            ) as HTMLCollectionOf<HTMLElement>;
                        Array.from(loggedInMessages).forEach(function (item) {
                            item.style.display = 'list-item';
                            item.innerText = `Logged in as: ${username}`;
                        });
                        // Show log out button
                        const logoutItems = document.getElementsByClassName(
                            'logout'
                        ) as HTMLCollectionOf<HTMLElement>;
                        Array.from(logoutItems).forEach(function (item) {
                            item.style.display = 'list-item';
                        });
                    } else {
                        window.isLoggedIn = false;
                    }
                })
                .catch((error) =>
                    console.error('Error verifying token:', error)
                );
        }
    }

    /**
     * Initializes the logout button functionality.
     */
    private static initLogoutButton() {
        const logoutButton = document.querySelector(
            '[data-logout-btn]'
        ) as HTMLElement;
        if (logoutButton) {
            logoutButton.addEventListener('click', (event) => {
                event.preventDefault();
                localStorage.removeItem('sessionToken');
                localStorage.removeItem('user_name');
                window.isLoggedIn = false;
                location.reload();
            });
        }
    }
}
