import { createPool } from 'mysql2/promise';

const { DB_USER, DB_PASS, DB_NAME } = process.env;

// For production
// const pool = createPool({
//     user: DB_USER,
//     database: DB_NAME,
//     password: DB_PASS,
//     socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

console.log("DB_USER:", DB_USER);
console.log("DB_NAME:", DB_NAME);
console.log("DB_PASS:", DB_PASS);

// For development
const pool = createPool({
    host: 'localhost',
    port: 3306,
    user: DB_USER,
    database: DB_NAME,
    password: DB_PASS,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

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
