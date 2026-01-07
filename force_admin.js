const mongoose = require('mongoose');
const User = require('./models/User'); 
require('dotenv').config();

// We are targeting the username "admin" directly
const TARGET_USERNAME = "admin"; 

async function forceUpdate() {
    try {
        console.log("🔌 Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);
        
        // 1. Find User by Username (Case Insensitive)
        // This regex means it will find "admin", "Admin", "ADMIN", etc.
        const user = await User.findOne({ 
            username: { $regex: new RegExp(`^${TARGET_USERNAME}$`, 'i') } 
        });
        
        if (!user) {
            console.log(`❌ ERROR: Could not find any user named 'admin'`);
            process.exit();
        }

        // 2. Force the update
        user.role = 'admin';
        await user.save();
        
        console.log("------------------------------------------------");
        console.log(`✅ DATABASE UPDATED SUCCESSFULLY`);
        console.log(`👤 User: ${user.username}`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`🔑 Role is now: ${user.role.toUpperCase()}`);
        console.log("------------------------------------------------");
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

forceUpdate();