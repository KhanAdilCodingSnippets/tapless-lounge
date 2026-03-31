const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Middleware: Authenticate Standard User via JWT
 */
const requireAuth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ error: 'Authorization denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// @route   GET /api/auth/me
// @desc    Get current user's latest data (Auto Refresh)
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found.' });
        
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error retrieving user data.' });
    }
});

// @route   POST /api/auth/register
// @desc    Register a new standard user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'Account with this email already exists.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ 
            username, 
            email, 
            password: hashedPassword, 
            role: 'user' 
        });
        
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            token,
            user: { 
                _id: user._id, 
                username: user.username, 
                email: user.email, 
                role: user.role 
            }
        });
    } catch (err) { 
        res.status(500).json({ error: 'Server error during registration.' }); 
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials.' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            token,
            user: { 
                _id: user._id, 
                username: user.username, 
                email: user.email, 
                role: user.role 
            }
        });
    } catch (err) { 
        res.status(500).json({ error: 'Server error during login.' }); 
    }
});

module.exports = router;