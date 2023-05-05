export interface userCreateInterface {
    created: boolean,
    user: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
    };
    createUser: () => void;
}