const mongoose = require('mongoose');

const tableConfigSchema = new mongoose.Schema({
    number: {
        type: Number,
        required: true,
        min: 1,
        unique: true,
    },
    zone: {
        type: String,
        default: 'Main room',
        trim: true,
    },
    seats: {
        type: Number,
        required: true,
        min: 1,
        default: 4,
    },
    shape: {
        type: String,
        enum: ['round', 'square'],
        default: 'square',
    },
}, { timestamps: true });

module.exports = mongoose.model('TableConfig', tableConfigSchema);
