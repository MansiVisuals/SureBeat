const express = require('express');
const router = express.Router();
const authService = require('../services/authService'); // Fix the path here

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    
    const result = await authService.login(username, password);
    if (!result.success) {
      return res.status(401).json({ success: false, message: result.message });
    }
    
    res.json({ success: true, token: result.token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;