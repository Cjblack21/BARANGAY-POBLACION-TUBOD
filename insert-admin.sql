-- Create a new admin account for local development
-- Password: devadmin2026
-- The hash below is bcrypt hash for 'devadmin2026'

DELETE FROM users WHERE email = 'devadmin@local.com';

INSERT INTO users (users_id, email, password, name, role, isActive, createdAt, updatedAt) 
VALUES (
    '999999',
    'devadmin@local.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koiyUCvK/A5i',
    'Dev Admin',
    'ADMIN',
    1,
    NOW(),
    NOW()
);

SELECT 'Admin account created successfully!' as message;
SELECT users_id, email, name, role FROM users WHERE email = 'devadmin@local.com';
