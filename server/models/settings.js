
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    restaurantName: {
        type: String,
        default: '',
    },
    address: {
        type: String,
        default: '',
    },
    phone: {
        type: String,
        default: '',
    },
    openingHours: {
        type: String,
        default: '',
    },
    currency: {
        type: String,
        default: 'DNT',
    },
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
