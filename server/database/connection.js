
require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/Digital_Menu";
const dnsServers = (process.env.MONGODB_DNS_SERVERS || "")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
}

let isConnecting = false;

async function connectToDatabase() {
    if (mongoose.connection.readyState >= 1) {
        return mongoose;
    }

    if (isConnecting) {
        return;
    }

    isConnecting = true;
    try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
    } finally {
        isConnecting = false;
    }
}

connectToDatabase();

module.exports = mongoose;
module.exports.connectToDatabase = connectToDatabase;
