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
// const pool = createPool({
//     host: 'localhost',
//     port: 3306,
//     user: process.env.DB_USER,
//     database: process.env.DB_NAME,
//     password: process.env.DB_PASS,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// Establish a connection to the database and log a success message if successful, or an error message if failed
pool.getConnection()
    .then(conn => console.log("Database connected successfully!"))
    .catch(err => console.error("Database connection failed:", err));

// Add logging for connection management
// Log a message when a new database connection is established
pool.on('connection', (connection) => {
    console.log('New DB Connection established');
});

// Log a message when a connection is acquired from the connection pool
pool.on('acquire', (connection) => {
    console.log('Connection %d acquired', connection.threadId);
});

// Log a message when a connection is released back to the connection pool
pool.on('release', (connection) => {
    console.log('Connection %d released', connection.threadId);
});

export default pool;
