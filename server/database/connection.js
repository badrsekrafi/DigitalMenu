
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

const connectWithRetry = () => {
    mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 }).then(() => {
        console.log("Connected to MongoDB");
    }).catch((error) => {
        console.log("MongoDB connection failed:", error.message);
        console.log("Retrying MongoDB connection in 5 seconds...");
        setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

module.exports = mongoose; // Export the mongoose object 
