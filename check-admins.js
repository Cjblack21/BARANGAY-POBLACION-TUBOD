const mysql = require('mysql2/promise');

async function checkUsers() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pms_local'
    });

    try {
        const [rows] = await connection.execute(
            'SELECT users_id, email, name, role FROM users WHERE role = "ADMIN" LIMIT 10'
        );

        console.log('\n📋 Admin accounts in your database:\n');
        if (rows.length === 0) {
            console.log('❌ No admin accounts found!');
        } else {
            rows.forEach(user => {
                console.log(`ID: ${user.users_id}`);
                console.log(`Email: ${user.email}`);
                console.log(`Name: ${user.name}`);
                console.log(`Role: ${user.role}`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkUsers().catch(console.error);
