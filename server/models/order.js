const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
   name: {
        type:String,
        require:true,
   },
   PhoneNumber: {
        type:String,
        require:true,
   },
   email: {
        type:String,
        require:true,
   },
   TableNumber: {
        type:Number,
   },
   serviceType: {
        type: String,
        enum: ['dine-in', 'reservation'],
        default: 'dine-in',
   },
   seatCount: {
        type: Number,
        min: 1,
        default: 1,
   },
   reservationDate: {
        type: String,
   },
   reservationTime: {
        type: String,
   },
   reservationAt: {
        type: Date,
   },
   comment: {
        type: String,
        trim: true,
        maxlength: 800,
        default: '',
   },
   items: [{
        itemName: {
            type: String,
            required: true,
        },
        itemPrice: {
            type: Number,
            default: 0,
        },
        itemQty: {
            type: Number,
            default: 1,
            min: 1,
        },
        status: {
            type: String,
            enum: ['pending', 'en_cours', 'pret', 'cancel'],
            default: 'pending',
        },
    }],
    totalPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active',
    },
    closedAt: {
        type: Date,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    feedback: {
        type: String,
        trim: true,
        maxlength: 500,
        default: '',
    },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
