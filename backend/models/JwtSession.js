const mongoose = require('mongoose');

const jwtSessionSchema = new mongoose.Schema({
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    Jti: { type: String, required: true, unique: true, index: true },
    TokenHash: { type: String, required: true },
    TokenType: { type: String, enum: ['access', 'refresh'], default: 'access' },
    DeviceName: { type: String, default: '' },
    IpAddress: { type: String, default: '' },
    UserAgent: { type: String, default: '' },
    IssuedAt: { type: Date, default: Date.now },
    ExpiresAt: { type: Date, required: true, index: true },
    RevokedAt: { type: Date, default: null },
    CreatedAt: { type: Date, default: Date.now }
});

jwtSessionSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('JwtSession', jwtSessionSchema);