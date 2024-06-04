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
        name: String,
    },
    {
        timestamps: true,
    }
);

const Channel = mongoose.model('Channel', ChannelSchema);

export default Channel;