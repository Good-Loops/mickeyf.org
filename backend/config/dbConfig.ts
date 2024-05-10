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
//     port: 3306,
//     user: 'cms_mickeyf',
//     database: 'cms',
//     password: '3691Dg123',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

pool.getConnection()
    .then(conn => console.log("Database connected successfully!"))
    .catch(err => console.error("Database connection failed:", err));

// Handle connection events
pool.on('connection', function (connection) {
    console.log("DB Connection established");

    connection.on('error', function (err) {
        console.error(new Date(), 'MySQL error', err.code);
    });

    connection.on('close', function (err) {
        console.error(new Date(), 'MySQL close', err);
    });
});

// Attempt to reconnect if connection is lost
pool.on('enqueue', function () {
    console.log('Waiting for available connection slot');
});