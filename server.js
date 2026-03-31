const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io"); 
require('dotenv').config();

const Room = require('./models/Room'); 

const app = express();
const server = http.createServer(app); 

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// === DATABASE ===
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected securely.'))
  .catch(err => console.log('❌ DB Connection Error:', err));

// === API ROUTES ===
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));

// === REAL-TIME SOCKET ENGINE ===
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

/**
 * IN-MEMORY STATE: Tracks active rooms and connected sockets to manage Host Migration.
 * Structure: { "room123": { hostSocket: 'xyz', participants: Set(['xyz', 'abc']) } }
 */
const activeSessions = {};

io.on('connection', (socket) => {
    console.log(`[Network] Peer Connected: ${socket.id}`);
    
    // ==========================================
    // 1. ROOM AUTHENTICATION & JOIN LOGIC
    // ==========================================
    socket.on('join-room', async (roomId, userId, passwordInput) => {
        try {
            const room = await Room.findOne({ roomId: roomId });
            
            if (!room) {
                socket.emit('error-message', 'Room not found or has been closed.');
                return; 
            }

            // Enforce Private Room Passwords
            if (room.isPrivate && room.password && passwordInput !== room.password) {
                socket.emit('auth-failed', 'Incorrect Password'); 
                return; 
            }

            // Tag the socket with identifying data for disconnect handling
            socket.join(roomId);
            socket.currentRoom = roomId;
            socket.dbUserId = userId; // Store their MongoDB ID on the socket

            // Initialize room in memory if it doesn't exist
            if (!activeSessions[roomId]) {
                activeSessions[roomId] = { hostSocket: null, participants: new Set() };
            }

            // Add user to the participant tracker
            activeSessions[roomId].participants.add(socket.id);

            // If this user matches the DB host, officially assign them as the Active Host
            if (room.host.toString() === userId) {
                activeSessions[roomId].hostSocket = socket.id;
            }

            // Notify Client & Room
            socket.emit('auth-success'); 
            socket.to(roomId).emit('user-joined', socket.id); // Triggers WebRTC connection
            io.to(roomId).emit('receive-message', { user: 'System', text: 'A new peer has entered the theater.', isSystem: true });

        } catch (error) {
            console.error("Join Error:", error);
            socket.emit('error-message', 'Critical server error during authentication.');
        }
    });

    // ==========================================
    // 2. WEBRTC P2P SIGNALING (SCREEN SHARE/LOCAL FILE)
    // ==========================================
    socket.on('signal-offer', (data) => {
        io.to(data.target).emit('signal-offer', { sdp: data.sdp, sender: socket.id });
    });

    socket.on('signal-answer', (data) => {
        io.to(data.target).emit('signal-answer', { sdp: data.sdp, sender: socket.id });
    });

    socket.on('signal-ice', (data) => {
        io.to(data.target).emit('signal-ice', { candidate: data.candidate, sender: socket.id });
    });

    // ==========================================
    // 3. MEDIA SYNC & CHAT LOGIC
    // ==========================================
    socket.on('sync-action', (data) => {
        // Only allow the active host to dictate media playback state
        const session = activeSessions[data.roomId];
        if (session && session.hostSocket === socket.id) {
            socket.to(data.roomId).emit('sync-action', data);
        }
    });

    socket.on('send-message', (data) => {
        socket.to(data.roomId).emit('receive-message', { ...data, senderId: socket.id });
    });

    socket.on('send-reaction', (data) => {
        socket.to(data.roomId).emit('receive-reaction', data.emoji);
    });

    // ==========================================
    // 4. DISCONNECT & HOST MIGRATION
    // ==========================================
    socket.on('disconnect', async () => {
        const roomId = socket.currentRoom;
        console.log(`[Network] Peer Disconnected: ${socket.id}`);

        if (roomId && activeSessions[roomId]) {
            const session = activeSessions[roomId];
            
            // Remove from active list
            session.participants.delete(socket.id);
            
            // Tell WebRTC to sever the peer connection
            io.to(roomId).emit('user-left', socket.id);

            // If room is empty, clear memory
            if (session.participants.size === 0) {
                delete activeSessions[roomId];
                console.log(`[Memory] Room ${roomId} is empty. State cleared.`);
            } 
            // HOST MIGRATION: If the person who left was the Host
            else if (session.hostSocket === socket.id) {
                const nextHostSocketId = Array.from(session.participants)[0];
                const nextHostSocket = io.sockets.sockets.get(nextHostSocketId);
                
                if (nextHostSocket) {
                    session.hostSocket = nextHostSocketId;
                    
                    try {
                        // Update MongoDB so the new host is permanently recognized
                        await Room.findOneAndUpdate(
                            { roomId: roomId }, 
                            { host: nextHostSocket.dbUserId }
                        );

                        // Broadcast the change
                        io.to(roomId).emit('receive-message', { user: 'System', text: 'Host connection lost. A new Host has been assigned.', isSystem: true });
                        
                        // Tell the specific new host to refresh their UI and take control
                        io.to(nextHostSocketId).emit('host-migrated');
                        console.log(`[Migration] Passed host controls in ${roomId} to ${nextHostSocketId}`);
                    } catch (err) {
                        console.error("Failed to update host in DB", err);
                    }
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Tapless Engine running on port ${PORT}`));