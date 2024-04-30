export default interface IUserCreate {
    user: {
        user_name: string;
        email: string;
        user_password: string;
    };
    createUser: () => void;
}