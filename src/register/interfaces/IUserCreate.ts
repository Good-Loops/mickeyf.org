export default interface IUserCreate {
    user: {
        userName: string;
        email: string;
        password: string;
    };
    createUser: () => void;
}