import mongoose from 'mongoose';

const {Schema} = mongoose;

const ChannelNotificationSchema = new Schema(
    {
        channelId: {type: Schema.Types.ObjectId, ref: 'Channel'},
        content: String,
        createdBy: {type: Schema.Types.ObjectId, ref: 'User'},
    },
    {
        timestamps: true,
    }
);

const ChannelNotification = mongoose.model('ChannelNotification', ChannelNotificationSchema);

export default ChannelNotification;