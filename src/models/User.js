import mongoose from 'mongoose';

const {Schema} = mongoose;

const UserSchema = new Schema(
    {
        firstName: String,
        lastName: String,
        email: {type: String, unique: true},
        password: String,
        avatar: String,
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model('User', UserSchema);

export default User;
