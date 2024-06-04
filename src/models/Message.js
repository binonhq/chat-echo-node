import mongoose from 'mongoose';

const {Schema} = mongoose;

const MessageSchema = new Schema(
    {
        senderId: {type: Schema.Types.ObjectId, ref: 'User'},
        channelId: {type: Schema.Types.ObjectId, ref: 'Channel'},
        content: String,
        attachment: String,
        stickerId: String,
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model('Message', MessageSchema);

export default Message;