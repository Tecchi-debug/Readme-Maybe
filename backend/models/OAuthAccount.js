const mongoose = require('mongoose');

const oAuthAccountSchema = new mongoose.Schema({
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    Provider: { type: String, required: true, trim: true },
    ProviderAccountId: { type: String, required: true, trim: true },
    Email: { type: String, trim: true, lowercase: true, default: '' },
    AccessToken: { type: String, default: '' },
    RefreshToken: { type: String, default: '' },
    TokenExpiresAt: { type: Date, default: null },
    Scopes: [{ type: String, trim: true }],
    Profile: { type: mongoose.Schema.Types.Mixed, default: {} },
    LinkedAt: { type: Date, default: Date.now },
    LastLoginAt: { type: Date, default: null }
}, {
    timestamps: true
});

oAuthAccountSchema.index({ Provider: 1, ProviderAccountId: 1 }, { unique: true });

module.exports = mongoose.model('OAuthAccount', oAuthAccountSchema);