import Message from "../models/Message.js";
import Channel from "../models/Channel.js";
import {getChannelName, getUserDataFromRequest} from "../utils/utils.js";


class MessageController {
    // [GET] /message/:channelId
    async getMessagesByChannelId(req, res) {
        try {
            const currentUser = await getUserDataFromRequest(req, res)
            if (!currentUser) {
                res.status(401).json({
                    "isAuthenticated": false,
                    "message": "Unauthorized"
                });
                return;
            }
            const {channelId} = req.params;
            const {index = 0} = req.query;
            const limit = 20;
            if (!channelId) {
                res.status(400).json({
                    "message": "Channel id is required"
                });
                return;
            }
            const channel = await Channel.findById(channelId).populate('userIds');
            if (!channel) {
                res.status(404).json({
                    "message": "Channel not found"
                });
                return;
            }

            await Channel.updateOne({_id: channelId}, {$addToSet: {seenBy: currentUser._id}});
            const {userIds} = channel;
            let name = getChannelName(currentUser, channel);
            let receiver = null;
            if (userIds.length <= 2) {
                receiver = channel.userIds.filter(u => u._id.valueOf() !== currentUser._id.valueOf())[0];
            }
            const messages = await Message.find({channelId: channelId}).populate('senderId').sort({createdAt: -1}).skip(index * limit)
                .limit(limit);

            const result = {
                type: channel.type,
                name: name,
                avatarId: receiver?.avatarId,
                messages: messages.map(m => {
                    return {
                        senderId: m.senderId?._id,
                        content: m.content,
                        attachmentId: m.attachmentId,
                        stickerId: m.stickerId,
                        createdAt: m.createdAt,
                        senderName: `${m.senderId?.firstName} ${m.senderId?.lastName}`,
                        avatarId: m.senderId?.avatarId,
                        _id: m._id
                    }
                }).reverse(),
                isEndOfList: messages.length < limit
            };

            res.json(result);
        } catch (e) {
            res.status(500).json({
                "message": "Internal server error"
            });
        }
    }
}

export default new MessageController();