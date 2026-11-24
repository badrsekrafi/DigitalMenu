
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

let connectionPromise;

async function connectToDatabase() {
    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }

    if (!connectionPromise) connectionPromise = mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 }).then(() => {
        console.log("Connected to MongoDB");
        return mongoose;
    }).catch(error => {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }).finally(() => { connectionPromise = null; });
    return connectionPromise;
}

connectToDatabase().catch(() => {});

module.exports = mongoose;
module.exports.connectToDatabase = connectToDatabase;
