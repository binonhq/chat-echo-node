import Message from "../models/Message.js";
import Channel from "../models/Channel.js";
import {getChannelName, getUserDataFromRequest} from "../utils/utils.js";


class MessageController {
    // [GET] /message/:channelId
    async getMessagesByChannelId(req, res) {
        const currentUser = await getUserDataFromRequest(req, res)
        const {channelId} = req.params;
        const channel = await Channel.findById(channelId).populate('userIds');
        if (!channel) {
            res.status(404).json({
                "message": "Channel not found"
            });
            return;
        }
        const {userIds} = channel;
        let name = getChannelName(currentUser, channel);
        let receiver = null;
        if (userIds.length <= 2) {
            receiver = channel.userIds.filter(u => u._id !== currentUser._id)[0];
        }
        const messages = await Message.find({channel: channelId});

        const result = {
            "name": name,
            "avatar": receiver?.avatar,
            "messages": messages
        };

        res.json(result);

    }
}

export default new MessageController();