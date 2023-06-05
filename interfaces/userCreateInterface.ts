interface userCreateInterface {
    user: {
        userName: string;
        email: string;
        password: string;
    };
    createUser: () => void;
}

export default userCreateInterface;