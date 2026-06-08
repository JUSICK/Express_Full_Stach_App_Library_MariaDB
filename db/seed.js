require('dotenv').config();
const bcrypt = require('bcrypt');
const { GetQuery, pool } = require('./database');

async function runSeed() {
    console.log("Starting seeding...");

    try {

        const saltRounds = 10;
        const hashedAdminPassword = await bcrypt.hash("admin", saltRounds);
        const hashedEditorPassword = await bcrypt.hash("editor", saltRounds);
        const hashedUserPassword = await bcrypt.hash("user", saltRounds);

        await GetQuery(
            `INSERT IGNORE INTO users (username, email, password_hash, role) VALUES 
            (?, ?, ?, ?),
            (?, ?, ?, ?),
            (?, ?, ?, ?)`,
            [
                "admin", "admin@admin.co", hashedAdminPassword, "admin",
                "editor", "editor@editor.co", hashedEditorPassword, "editor",
                "user", "user@user.co", hashedUserPassword, "user"
            ]
        );

        console.log("Users inserted successfully.");

        const adminUserRows = await GetQuery("SELECT id FROM users WHERE username = ? LIMIT 1;", ["admin"]);

        if (!adminUserRows || adminUserRows.length === 0) {
            throw new Error("Failed to retrieve admin user ID from database.");
        }

        const adminId = adminUserRows[0].id;

        await GetQuery(
            `INSERT IGNORE INTO books (title, author, year, genre, owner_id) VALUES 
            (?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?)`,
            [
                "Cybersecurity for Beginners", "John Smith", 2024, "IT", adminId,
                "Advanced Node.js", "Jane Doe", 2025, "Programming", adminId
            ]
        );

        console.log("Books inserted successfully.");

        console.log("Seeding ended successfully.");
    } catch (error) {
        console.error("ERROR:");
        console.error(error);
        process.exit(1); 
    } finally {
        if (pool) {
            await pool.end();
        }
        process.exit(0); 
    }
}

runSeed();