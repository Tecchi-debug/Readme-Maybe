const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    FirstName: { type: String, required: true, trim: true },
    LastName: { type: String, required: true, trim: true },
    Login: { type: String, required: true, unique: true, trim: true, lowercase: true },
    Email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    EmailVerified: { type: Boolean, default: true },
    EmailVerifiedAt: { type: Date, default: null },
    hashedPassword: { type: String, required: true },
    Role: { type: String, enum: ['user', 'admin'], default: 'user' },
    Status: { type: String, enum: ['active', 'pending', 'disabled'], default: 'active' },
    GithubProfile: {
        Username: { type: String, default: '', trim: true },
        ProfileUrl: { type: String, default: '', trim: true },
        AvatarUrl: { type: String, default: '', trim: true },
        IsConnected: { type: Boolean, default: false },
        LastSyncedAt: { type: Date, default: null }
    },
    Preferences: {
        OutputFormat: { type: String, enum: ['markdown', 'html'], default: 'markdown' },
        IncludeSetupInstructions: { type: Boolean, default: true },
        IncludeApiDescriptions: { type: Boolean, default: true },
        IncludeFileStructure: { type: Boolean, default: true },
        SaveGeneratedDocs: { type: Boolean, default: true }
    },
    Usage: {
        RepositoriesAnalyzed: { type: Number, default: 0, min: 0 },
        ReadmesGenerated: { type: Number, default: 0, min: 0 },
        LastGenerationAt: { type: Date, default: null }
    },
    LastLoginAt: { type: Date, default: null }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    toJSON: {
        transform: (_doc, ret) => {
            delete ret.hashedPassword;
            return ret;
        }
    }
});

userSchema.virtual('FullName').get(function fullName() {
    return `${this.FirstName} ${this.LastName}`.trim();
});

module.exports = mongoose.model('User', userSchema);
