/**
 * Database pool configuration and process-wide pool construction.
 *
 * Responsibility:
 * - Defines the canonical MySQL connection settings for this service.
 * - Selects production vs development connectivity and exports a shared pool singleton.
 *
 * Non-responsibilities:
 * - Request handling, query composition, transactions, or domain logic.
 *
 * Side effects:
 * - Creates the pool at module initialization (import-time).
 * - Performs a one-time bootstrap connectivity check and may emit logs.
 *
 * Environment contract:
 * - NODE_ENV selects production socket mode vs local TCP mode.
 * - DB_USER / DB_PASS / DB_NAME provide credentials and schema name.
 * - CLOUD_SQL_CONNECTION_NAME is required in production socket mode.
 * - DB_HOST / DB_PORT are optional in development mode (default host=localhost, port=3306).
 */
import mysql from 'mysql2/promise';

/**
 * Environment selector for DB connectivity mode.
 *
 * Invariants:
 * - Evaluated once at module initialization.
 * - When true, the pool uses a Cloud SQL Unix socket path.
 * - When false, the pool uses TCP against a configurable host/port.
 */
const isProd = process.env.NODE_ENV === 'production';

/**
 * Shared pool options applied to all environments.
 *
 * Invariants:
 * - Credential and database identifiers are sourced from process environment.
 * - Pool behavior is configured for concurrent request usage.
 *
 * Notes:
 * - connectionLimit is the maximum number of active connections maintained by the pool.
 * - queueLimit=0 allows an unbounded queue (driver-managed) when all connections are busy.
 */
const base: mysql.PoolOptions = {
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
};

/**
 * Production connectivity via Cloud SQL Unix domain socket.
 *
 * Invariants:
 * - Uses socketPath in the form "/cloudsql/<CLOUD_SQL_CONNECTION_NAME>".
 *
 * Environment contract:
 * - CLOUD_SQL_CONNECTION_NAME must be defined for production socket mode.
 */
const prodViaSocket: mysql.PoolOptions = {
	...base,
	socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
};

/**
 * Development connectivity via TCP.
 *
 * Defaults:
 * - host defaults to "localhost" when DB_HOST is undefined.
 * - port defaults to 3306 when DB_PORT is undefined.
 *
 * Invariants:
 * - port is coerced to a number before being passed to the driver.
 */
const devLocalhost: mysql.PoolOptions = {
	...base,
	host: process.env.DB_HOST ?? 'localhost',
	port: +(process.env.DB_PORT ?? 3306),
};

/**
 * Process-wide MySQL connection pool.
 *
 * Ownership:
 * - Module-owned singleton; shared across the service process.
 *
 * Side effects:
 * - Constructed at module initialization (import-time).
 *
 * Failure modes:
 * - Misconfiguration may surface during the bootstrap connection check or on first query,
 *   depending on driver behavior and network availability.
 */
export const pool = mysql.createPool(isProd ? prodViaSocket : devLocalhost);

/**
 * One-time bootstrap connectivity check.
 *
 * Side effects:
 * - Acquires and releases a single pooled connection to validate connectivity.
 * - Logs success only in non-production environments.
 * - Logs a bootstrap error message on failure.
 */
pool
	.getConnection()
	.then((c) => {
		c.release();
		if (!isProd) console.log('DB connection OK');
	})
	.catch((err) => {
		console.error('DB bootstrap error:', err?.message);
	});