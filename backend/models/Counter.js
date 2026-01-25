const mongoose = require('mongoose');

// Counter for generating sequential roll numbers
const counterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: Number,
        default: 0
    }
});

// Get next roll number (0001, 0002, etc.)
counterSchema.statics.getNextRollNo = async function () {
    const counter = await this.findOneAndUpdate(
        { name: 'rollNo' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
    );
    return String(counter.value).padStart(4, '0');
};

module.exports = mongoose.model('Counter', counterSchema);
