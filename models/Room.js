const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  host: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['youtube', 'local'], 
    default: 'youtube'
  },
  videoUrl: {
    type: String, 
    default: ''
  },
  password: {  // <--- ADDED THIS FIELD
    type: String,
    default: ""
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewers: [
    {
      socketId: String,
      username: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);