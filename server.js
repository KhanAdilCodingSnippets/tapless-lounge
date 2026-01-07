const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io"); 
require('dotenv').config();

// === CRITICAL FIX: IMPORT THE ROOM MODEL ===
// Without this, the server crashes when you try to join!
const Room = require('./models/Room'); 

const app = express();
const server = http.createServer(app); 

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// === DATABASE ===
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB Error:', err));

// === ROUTES ===
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));

// === REAL-TIME SOCKET ENGINE ===
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    
    // 1. JOIN ROOM (FIXED)
    socket.on('join-room', async (roomId, userId, passwordInput) => {
        try {
            // FIX: Search by 'roomId' (the short string "vr0xb"), NOT '_id'
            const room = await Room.findOne({ roomId: roomId });
            
            // Validation
            if (!room) {
                socket.emit('error-message', 'Room not found.');
                return; 
            }

            // Password Check (Only if room is private)
            if (room.isPrivate && room.password) {
                if (passwordInput !== room.password) {
                    socket.emit('auth-failed', 'Incorrect Password'); 
                    return; // STOP execution
                }
            }

            // Success
            socket.join(roomId);
            socket.emit('auth-success'); 
            socket.to(roomId).emit('user-joined', userId);

        } catch (error) {
            console.error("Join Error:", error);
            socket.emit('error-message', 'Server Error during join.');
        }
    });

    // 2. Chat & Kick
    socket.on('send-message', (data) => {
        socket.to(data.roomId).emit('receive-message', { ...data, senderId: socket.id });
    });

    socket.on('kick-user', (data) => {
        io.to(data.targetSocketId).emit('you-are-kicked');
        const targetSocket = io.sockets.sockets.get(data.targetSocketId);
        if (targetSocket) targetSocket.leave(data.roomId);
    });

    socket.on('send-reaction', (data) => {
        socket.to(data.roomId).emit('receive-reaction', data.emoji);
    });

    // === RE-SYNC LOGIC ===
    socket.on('stream-reset', (roomId) => {
        socket.to(roomId).emit('stream-reset');
    });

    socket.on('request-connection', (data) => {
        io.to(data.targetId).emit('new-peer-request', { viewerId: socket.id });
    });

    // === WEBRTC SIGNALING ===
    socket.on('signal-offer', (data) => {
        io.to(data.target).emit('signal-offer', { sdp: data.sdp, sender: socket.id });
    });

    socket.on('signal-answer', (data) => {
        io.to(data.target).emit('signal-answer', { sdp: data.sdp, sender: socket.id });
    });

    socket.on('signal-ice', (data) => {
        io.to(data.target).emit('signal-ice', { candidate: data.candidate, sender: socket.id });
    });

    // === VIDEO SYNC ===
    socket.on('sync-action', (data) => {
        socket.to(data.roomId).emit('sync-action', data);
    });

    socket.on('disconnect', () => {
        io.emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));