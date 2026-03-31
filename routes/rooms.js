const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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

// @route   POST /api/rooms/create
// @desc    Securely create a room bound to the authenticated user
router.post('/create', requireAuth, async (req, res) => {
    const { name, videoUrl, password } = req.body;
    
    // Generates a 5-character short ID for the room URL
    const shortId = Math.random().toString(36).substring(2, 7);

    try {
        const newRoom = new Room({
            roomId: shortId, 
            name,
            videoUrl,
            password: password || "",
            isPrivate: !!password,
            host: req.user.id // Security Fix: Extracted from JWT, not body!
        });
        
        await newRoom.save();
        res.json(newRoom);
    } catch (err) {
        res.status(500).json({ error: 'Server error during room creation.' });
    }
});

// @route   GET /api/rooms/list
// @desc    Fetch active rooms (Protected route)
router.get('/list', requireAuth, async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 }).populate('host', 'username');
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: 'Server error retrieving rooms.' });
    }
});

// @route   POST /api/rooms/delete
// @desc    Securely delete a room (Must be the owner)
router.post('/delete', requireAuth, async (req, res) => {
    const { roomId } = req.body;
    
    try {
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ error: 'Room not found.' });
        
        // Security Fix: Compare room host against the verified JWT token
        if (room.host.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied. You do not own this room.' });
        }

        await Room.findByIdAndDelete(roomId);
        res.json({ success: true, message: 'Theater closed successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error during room deletion.' });
    }
});

module.exports = router;