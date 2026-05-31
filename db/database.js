const maria = require('mariadb');

const pool = maria.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'app_user',
  password: '1234',
  database: 'lab10',
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