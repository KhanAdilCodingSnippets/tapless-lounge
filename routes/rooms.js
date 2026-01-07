const express = require('express');
const router = express.Router();
const Room = require('../models/Room'); 

// @route   POST /api/rooms/create
router.post('/create', async (req, res) => {
    const { name, videoUrl, hostId, password } = req.body;
    
    // Generates short ID (e.g. "shury")
    const shortId = Math.random().toString(36).substring(2, 7);

    try {
        const newRoom = new Room({
            roomId: shortId, 
            name,
            videoUrl,
            password: password || "",
            isPrivate: !!password,
            host: hostId
        });
        await newRoom.save();
        res.json(newRoom);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/rooms/list
router.get('/list', async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 }).populate('host', 'username');
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/rooms/delete
router.post('/delete', async (req, res) => {
    const { roomId, hostId } = req.body;
    try {
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ msg: 'Room not found' });
        
        if (room.host.toString() !== hostId) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Room.findByIdAndDelete(roomId);
        res.json({ msg: 'Room removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;