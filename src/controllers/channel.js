import Channel from "../models/Channel.js";
import {MessageType} from "../constants/constants.js";
import {getChannelName, getUserDataFromRequest} from "../utils/utils.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import ChannelNotification from "../models/ChannelNotification.js";
import {attachmentBucket} from "../main.js";

class ChannelController {
    // [POST] /channels
    async getOrCreateChannel(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);
        if (!currentUser) {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            return;
        }
        let {name, userIds, channelId} = req.body;

        if (channelId) {
            const channel = await Channel.findById(channelId).populate('userIds');
            if (!channel.userIds.map(u => u._id.valueOf()).includes(currentUser._id.valueOf())) {
                res.status(403).json({
                    "message": "You are not allowed to access this channel"
                });
                return;
            }
            if (channel) {
                res.json({
                    "_id": channel._id,
                    "name": getChannelName(currentUser, channel),
                    "type": channel.type,
                    "userIds": channel.userIds,
                    "onCall": channel.onCall,
                });
                return;
            }
        }

        if (userIds.length === 2) {
            let channel = await Channel.findOne({userIds: {$all: userIds, $size: 2}}).populate('userIds');
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
        }

        let type = MessageType.GROUP;
        if (userIds.length <= 2) {
            type = MessageType.DIRECT;
            name = ''
        }
        const channel = await Channel.create({
            userIds,
            type,
            name,
        });

        res.json(channel);
    }

    async getAllChannelOfUser(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);
        if (!currentUser) {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            return;
        }
        const channels = await Channel.find({userIds: currentUser._id}).populate('userIds');

        const result = (await Promise.all(channels.map(async channel => {
            const latestMessage = await Message.findOne({channelId: channel._id}).sort({createdAt: -1});
            if (!latestMessage) {
                return null;
            }
            let receiver = null;

            if (channel.type === MessageType.DIRECT) {
                receiver = channel.userIds.filter(u => u._id.valueOf() !== currentUser._id.valueOf())[0];
            }

            return {
                "_id": channel._id,
                "name": getChannelName(currentUser, channel),
                "type": channel.type,
                "message": latestMessage,
                "avatarId": receiver?.avatarId || channel.avatarId,
                "isUnread": !channel.seenBy.includes(currentUser._id),
                "userId": receiver?._id,
            }
        }))).filter(c => c !== null).sort((a, b) => b.message.createdAt - a.message.createdAt);
        res.json(result);
    }

    async getChannelById(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);

        if (!currentUser) {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            return;
        }
        const {channelId} = req.params;
        if (!channelId || channelId === 'undefined') {
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
        }

        if (!channel.userIds.map(u => u._id.valueOf()).includes(currentUser._id.valueOf())) {
            res.status(403).json({
                "message": "You are not allowed to access this channel"
            });
            return;
        }

        let avatarId = channel.avatarId;
        if (channel.type === MessageType.DIRECT) {
            avatarId = channel.userIds.filter(u => u._id.valueOf() !== currentUser._id.valueOf())[0].avatarId;
        }

        const images = (await attachmentBucket.find({
            "metadata.channelId": channelId,
            "metadata.type": {$regex: /^image/}
        }).sort({uploadDate: -1}).limit(5).toArray()).map(i => i._id);

        const attachments = (await attachmentBucket.find({
            "metadata.channelId": channelId,
            "metadata.type": {$not: /^image/}
        }).sort({uploadDate: -1}).toArray()).map((i) => {
            return {
                _id: i._id,
                name: i.metadata.name,
                createdAt: i.uploadDate,
            }
        });

        const response = {
            "_id": channel._id,
            "name": getChannelName(currentUser, channel),
            "type": channel.type,
            "userIds": channel.userIds,
            "avatarId": avatarId,
            "attachments": attachments,
            "images": images,
        }

        return res.json(response);
    }

    async deleteChannel(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);

        if (!currentUser) {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            return;
        }
        const {channelId} = req.params;
        if (!channelId || channelId === 'undefined') {
            res.status(400).json({
                "message": "Channel id is required"
            });
            return;
        }
        const channel = await Channel.findById(channelId)
        if (!channel) {
            res.status(404).json({
                "message": "Channel not found"
            });
        }
        if (!channel.userIds.includes(currentUser._id)) {
            res.status(403).json({
                "message": "You are not allowed to delete this channel"
            });
        }

        await Message.deleteMany({channelId});

        res.json({
            "status": "success",
            "message": "Channel deleted"
        });
    }

    async updateChannel(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);

        if (!currentUser) {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            return;
        }
        const {channelId} = req.params;
        if (!channelId || channelId === 'undefined') {
            res.status(400).json({
                "message": "Channel id is required"
            });
            return;
        }
        const channel = await Channel.findById(channelId)
        if (!channel) {
            res.status(404).json({
                "message": "Channel not found"
            });
        }
        if (!channel.userIds.includes(currentUser._id)) {
            res.status(403).json({
                "message": "You are not allowed to update this channel"
            });
        }
        const {name, userIds} = req.body;
        let isUpdated = false;
        if (name !== channel.name) {
            await ChannelNotification.create({
                createdBy: currentUser._id,
                content: `${currentUser.firstName} ${currentUser.lastName} changed the channel name to ${name}`,
                channelId: channelId
            });
            isUpdated = true;
        }

        if (JSON.stringify(userIds) !== JSON.stringify(channel.userIds)) {
            const addedUsers = userIds.filter(u => !channel.userIds.includes(u));
            const removedUsers = channel.userIds.filter(u => !userIds.includes(u));
            if (addedUsers.length > 0) {
                for (const addedUser of addedUsers) {
                    const user = await User.findById(addedUser);
                    await ChannelNotification.create({
                        createdBy: currentUser._id,
                        content: `${currentUser.firstName} ${currentUser.lastName} added ${user.firstName} ${user.lastName} to the channel`,
                        channelId: channelId,
                    });
                }
                isUpdated = true;
            }
            if (removedUsers.length > 0) {
                for (const removedUser of removedUsers) {
                    const user = await User.findById(removedUser);
                    await ChannelNotification.create({
                        createdBy: currentUser._id,
                        content: `${currentUser.firstName} ${currentUser.lastName} removed ${user.firstName} ${user.lastName} from the channel`,
                        channelId: channelId,
                    });
                }
                isUpdated = true;
            }
        }

        if (!isUpdated) {
            res.json({
                "status": "success",
                "message": "Channel is not updated"
            });
            return;
        }

        await Channel.updateOne({_id: channelId}, {name, userIds});

        res.json({
            "status": "success",
            "message": "Channel updated"
        });
    }
}

export default new ChannelController();