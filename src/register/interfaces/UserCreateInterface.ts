export default interface UserCreateInterface {
    user: {
        userName: string;
        email: string;
        password: string;
    };
    createUser: () => void;
}