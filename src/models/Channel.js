import mongoose from 'mongoose';

const {Schema} = mongoose;

const ChannelSchema = new Schema(
    {
        userIds: [{type: Schema.Types.ObjectId, ref: 'User'}],
        type: {
            type: String,
            enum: ['direct', 'group'],
            default: 'direct',
        },
        seenBy: [{type: Schema.Types.ObjectId, ref: 'User', default: []}],
        onCall: {type: Boolean, default: false},
        name: String,
        notification: [{type: Schema.Types.ObjectId, ref: 'Notification', default: []}],
        avatarId: String,
    },
    {
        timestamps: true,
    }
);

const Channel = mongoose.model('Channel', ChannelSchema);

export default Channel;