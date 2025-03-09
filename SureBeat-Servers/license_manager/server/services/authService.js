const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// This would typically connect to a users table in your database
// For a simple implementation, we'll use a hardcoded admin user
const adminUser = {
  username: process.env.ADMIN_USERNAME || 'admin',
  // In production, you should store hashed passwords, not plaintext
  passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2b$10$zG5Xb7eRfBgIsCKzPQ4xAufgfkehrtaYrNAqsyJEpCm1m8d85riPC' // Default hash for 'admin123'
};

const login = async (username, password) => {
  // In a real app, you would fetch from database
  if (username !== adminUser.username) {
    return { success: false, message: 'Invalid credentials' };
  }
  
  const passwordMatch = await bcrypt.compare(password, adminUser.passwordHash);
  if (!passwordMatch) {
    return { success: false, message: 'Invalid credentials' };
  }
  
  // Create JWT token
  const token = jwt.sign(
    { username: username },
    process.env.JWT_SECRET || 'license-manager-secret',
    { expiresIn: '24h' }
  );
  
  return { success: true, token };
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'license-manager-secret');
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

module.exports = {
  login,
  verifyToken
};