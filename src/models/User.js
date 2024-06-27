import mongoose from 'mongoose';

const {Schema} = mongoose;

const UserSchema = new Schema(
    {
        firstName: String,
        lastName: String,
        email: {type: String, unique: true},
        password: String,
        avatarId: String,
        voiceSettingId: String,
        inCall: {type: Boolean, default: false},
        about: String,
        phone: String,
        coverId: String,
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model('User', UserSchema);

export default User;
