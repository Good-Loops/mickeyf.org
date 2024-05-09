import { createPool } from 'mysql2/promise';

let poolConfig = {
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    socketPath: undefined as string | undefined,
    host: undefined as string | undefined,
    port: undefined as number | undefined
};

if (process.env.NODE_ENV === 'production') {
    poolConfig.socketPath = `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`;
} else {
    poolConfig.host = '127.0.0.1';
    poolConfig.port = 3306;
}

export const pool = createPool(poolConfig);

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