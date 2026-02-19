const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
    console.log('🔧 Setting up admin account...\n');

    // Create connection
    // First connect without database to ensure it exists
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        multipleStatements: true
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS pms_local');
    await connection.query('USE pms_local');

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash('admin2026', 12);

        // Delete existing admin if exists
        await connection.execute(
            'DELETE FROM users WHERE email = ?',
            ['localadmin@pms.com']
        );

        // Insert new admin
        const userId = Math.floor(100000 + Math.random() * 900000).toString();
        await connection.execute(
            `INSERT INTO users (users_id, email, password, name, role, isActive, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [userId, 'localadmin@pms.com', hashedPassword, 'Local Admin', 'ADMIN', 1]
        );

        console.log('✅ Admin account created successfully!\n');
        console.log('┌─────────────────────────────────────────────┐');
        console.log('│      LOCAL DEVELOPMENT ADMIN ACCOUNT        │');
        console.log('├─────────────────────────────────────────────┤');
        console.log('│ Email:    localadmin@pms.com                │');
        console.log('│ Password: admin2026                         │');
        console.log('│ User ID:  ' + userId.padEnd(33) + '│');
        console.log('└─────────────────────────────────────────────┘');
        console.log('\n✨ You can now login with these credentials!');

    } catch (error) {
        console.error('❌ Error:', error.message);

        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n⚠️  The users table does not exist.');
            console.log('Please run: npx prisma db push');
        }
    } finally {
        await connection.end();
    }
}

setupAdmin().catch(console.error);
