import mysql from 'mysql2/promise';

const isProd = process.env.NODE_ENV === 'production';

const base: mysql.PoolOptions = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const prodViaSocket: mysql.PoolOptions = {
  ...base,
  socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
};

const devLocalhost: mysql.PoolOptions = {
  ...base,
  host: process.env.DB_HOST ?? 'localhost',
  port: +(process.env.DB_PORT ?? 3306),
};

export const pool = mysql.createPool(isProd ? prodViaSocket : devLocalhost);

pool
  .getConnection()
  .then((c) => {
    c.release();
    if (!isProd) console.log('DB connection OK');
  })
  .catch((err) => {
    console.error('DB bootstrap error:', err?.message);
  });