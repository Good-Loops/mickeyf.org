import { createPool } from 'mysql2/promise';

// For production
export const pool = createPool({
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// For development
// export const pool = createPool({
//     host: 'localhost',
//     user: 'cms_mickeyf',
//     password: '*<HLecm?,el(S>@H',
//     database: 'cms',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

pool.getConnection()
    .then(conn => console.log("Database connected successfully!"))
    .catch(err => console.error("Database connection failed:", err));