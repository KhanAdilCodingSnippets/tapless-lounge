const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, default: 'user', enum: ['user', 'admin'] }, // NEW: Role
    createdAt:{ type: Date, default: Date.now },
    
    // NEW: Watch History (List of Room Names/Dates)
    history: [{
        roomName: String,
        videoUrl: String,
        date: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('User', UserSchema);