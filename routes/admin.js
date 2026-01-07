const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');
const bcrypt = require('bcryptjs');

// === MIDDLEWARE: Check if Admin ===
// In a real app, we'd verify the JWT token here. 
// For now, we'll trust the client sends the role (Simple Version).
const isAdmin = async (req, res, next) => {
    const { userId } = req.body; // Client sends their ID
    const user = await User.findById(userId);
    if (user && user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access Denied: Admins Only' });
    }
};

// 1. GET ALL STATS (Admin Dashboard)
router.post('/stats', isAdmin, async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const roomCount = await Room.countDocuments();
        const users = await User.find({}, '-password').limit(20); // Get list of users (hide passwords)
        res.json({ userCount, roomCount, users });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. DELETE ANY USER (Admin)
router.post('/delete-user', isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.body.targetId);
        res.json({ success: true, message: 'User Terminated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. USER: GET MY HISTORY
router.get('/history/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        res.json(user.history);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. USER: UPDATE PASSWORD
router.post('/change-password', async (req, res) => {
    const { userId, newPassword } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        await User.findByIdAndUpdate(userId, { password: hash });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. USER: DELETE SELF
router.post('/delete-self', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.body.userId);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;