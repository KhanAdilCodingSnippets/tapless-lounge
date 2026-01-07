const mongoose = require('mongoose');
const User = require('./models/User'); 
require('dotenv').config();

// 👇 ENTER YOUR EMAIL HERE
const TARGET_EMAIL = "admin@tap.com"; 

async function promoteToAdmin() {
    try {
        console.log("🔌 Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);
        
        // Find the user by EMAIL this time
        const user = await User.findOne({ email: TARGET_EMAIL });
        
        if (!user) {
            console.log(`❌ No user found with email: '${TARGET_EMAIL}'`);
            console.log("👉 Tip: Make sure you have registered on the site first!");
            process.exit();
        }

        // Update Role
        user.role = 'admin';
        await user.save();
        
        console.log(`✅ SUCCESS!`);
        console.log(`👤 User: ${user.username} (${user.email})`);
        console.log(`🔑 Role updated to: ADMIN`);
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

promoteToAdmin();