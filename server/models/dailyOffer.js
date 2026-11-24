const mongoose = require('mongoose');

const dailyOfferSchema = new mongoose.Schema({
    day: { type: String, required: true, unique: true },
    itemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItems' }],
}, { timestamps: true });

module.exports = mongoose.model('DailyOffer', dailyOfferSchema);
