const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Room = require('../models/Room');

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

/**
 * Middleware: Authenticate Admin Privileges via JWT
 */
const requireAdmin = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ error: 'Authorization denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// ==========================================
// ADMIN ROUTES (GOD MODE)
// ==========================================

// Retrieve platform statistics and user ledger
router.post('/stats', requireAdmin, async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const roomCount = await Room.countDocuments();
        const users = await User.find({}, '-password').limit(20); 
        
        res.json({ userCount, roomCount, users });
    } catch (err) { 
        res.status(500).json({ error: 'Server error retrieving statistics.' }); 
    }
});

// Terminate a specific user account
router.post('/delete-user', requireAdmin, async (req, res) => {
    try {
        const { targetId } = req.body;
        if (!targetId) return res.status(400).json({ error: 'Target ID required.' });

        await User.findByIdAndDelete(targetId);
        res.json({ success: true, message: 'User terminated successfully.' });
    } catch (err) { 
        res.status(500).json({ error: 'Server error during user termination.' }); 
    }
});

// Force-close any active theater room
router.post('/force-delete-room', requireAdmin, async (req, res) => {
    try {
        const { roomId } = req.body;
        if (!roomId) return res.status(400).json({ error: 'Room ID required.' });

        await Room.findByIdAndDelete(roomId);
        res.json({ success: true, message: 'Room forcefully closed.' });
    } catch (err) { 
        res.status(500).json({ error: 'Server error during room termination.' }); 
    }
});

// ==========================================
// SECURED USER CONTROLS
// ==========================================

// Retrieve authenticated user's history
router.get('/history', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        
        res.json(user.history);
    } catch (err) { 
        res.status(500).json({ error: 'Server error retrieving history.' }); 
    }
});

// Update authenticated user's password
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ error: 'New password required.' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        
        await User.findByIdAndUpdate(req.user.id, { password: hash });
        res.json({ success: true, message: 'Password updated securely.' });
    } catch (err) { 
        res.status(500).json({ error: 'Server error updating password.' }); 
    }
});

// Delete authenticated user's account
router.post('/delete-self', requireAuth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.json({ success: true, message: 'Account deleted successfully.' });
    } catch (err) { 
        res.status(500).json({ error: 'Server error during account deletion.' }); 
    }
});

module.exports = router;