const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @route   GET /api/auth/me
// @desc    Get current user's latest data (Auto Refresh)
router.get('/me', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        res.json(user);
    } catch (err) {
        res.status(401).json({ msg: 'Token invalid' });
    }
});

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'User exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ username, email, password: hashedPassword, role: 'user' });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 👇 THIS IS THE IMPORTANT PART 👇
        res.json({
            success: true,
            token,
            user: { 
                _id: user._id, 
                username: user.username, 
                email: user.email, 
                role: user.role // <--- THIS MUST BE HERE
            }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 👇 THIS IS THE IMPORTANT PART 👇
        res.json({
            success: true,
            token,
            user: { 
                _id: user._id, 
                username: user.username, 
                email: user.email, 
                role: user.role // <--- THIS MUST BE HERE
            }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;