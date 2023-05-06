export interface userCreateInterface {
    created: boolean,
    errors: {
        email_duplicated: boolean
    },
    user: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
    };
    createUser: () => void;
}