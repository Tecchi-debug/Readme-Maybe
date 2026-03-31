const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    FirstName : { type: String, required: true },
    LastName : { type: String, required: true },
    Login: { type: String, required: true, unique: true },
    Email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);