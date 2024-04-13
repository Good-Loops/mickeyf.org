import { createPool } from 'mysql2/promise';

console.log(process.env.DB_HOST);

export const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(conn => console.log("Database connected successfully!"))
    .catch(err => console.error("Database connection failed:", err));