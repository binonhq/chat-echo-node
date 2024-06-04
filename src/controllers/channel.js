import Channel from "../models/Channel.js";
import {MessageType} from "../constants/constants.js";
import {getChannelName, getUserDataFromRequest} from "../utils/utils.js";

class ChannelController {
    // [POST] /channels
    async getOrCreateChannel(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);
        let {name, userIds} = req.body;
        let channel = await Channel.findOne({userIds: {$all: userIds}}).populate('userIds');

        if (channel) {
            name = getChannelName(currentUser, channel);
            res.json({
                "_id": channel._id,
                "name": name,
                "type": channel.type,
                "userIds": channel.userIds,
            });
            return;
        }

        let type = MessageType.GROUP;
        if (userIds.length <= 2) {
            type = MessageType.DIRECT;
            name = ''
        }
        channel = await Channel.create({
            userIds,
            type,
            name,
        });

        res.json(channel);
    }
}

export default new ChannelController();