/**
 * Interface representing the structure for user creation.
 */
export default interface IUserCreate {
    /**
     * The user details.
     */
    user: {
        /**
         * The username of the user.
         */
        user_name: string;

        /**
         * The email of the user.
         */
        email: string;

        /**
         * The password of the user.
         */
        user_password: string;
    };

    /**
     * Function to create a new user.
     */
    createUser: () => void;
}
