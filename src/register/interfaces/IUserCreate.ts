export default interface IUserCreate {
    user: {
        user_name: string;
        email: string;
        password: string;
    };
    createUser: () => void;
}