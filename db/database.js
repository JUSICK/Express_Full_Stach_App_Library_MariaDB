const maria = require('mariadb');
require('dotenv').config();

const pool = maria.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

async function GetQuery(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(sql, params);
    return rows;
  } catch (err) {
    console.error("Database error:", err);
    throw err;
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch (releaseErr) {
        console.error("Error releasing connection:", releaseErr);
      }
    }
  }
}

async function closeDB() {
    if (pool) await pool.end();
}

module.exports = { GetQuery, closeDB };