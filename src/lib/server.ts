import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var mysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),

    // Connection management
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 100,

    // Connection timeout
    connectTimeout: 5000,

    // Keep TCP connection alive
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    charset: "utf8mb4",
  });
}

export const pool =
  globalThis.mysqlPool ?? createPool();

globalThis.mysqlPool ??= pool;