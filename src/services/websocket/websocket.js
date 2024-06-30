import logger from "../../utils/logger/logger.js";
import {WebSocketServer} from 'ws';
import url from 'url';
import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import Channel from "../../models/Channel.js";
import Message from "../../models/Message.js";
import {MessageType} from "../../constants/constants.js";
import {getChannelName} from "../../utils/utils.js";

export default function initWebSocketServer(server) {
    const webSocket = new WebSocketServer(server);

    function notifyAboutOnlinePeople() {
        const uniqueUsers = new Map();

        webSocket.clients.forEach(client => {
            if (client.user) {
                uniqueUsers.set(client.user._id.toString(), {
                    userId: client.user._id,
                    email: client.user.email,
                    firstName: client.user.firstName,
                    lastName: client.user.lastName,
                    avatarId: client.user.avatarId,
                });
            }
        });

        webSocket.clients.forEach(client => {
            client.send(JSON.stringify({
                type: 'online-users',
                data: Array.from(uniqueUsers.values()),
            }));
        });
    }

    webSocket.on('connection', (connection, request) => {
        const requestUrl = new url.URL(request.url, `ws://${request.headers.host}`);
        const token = requestUrl.searchParams.get('token');
        logger.info('Websocket client connected');

        connection.on('disconnect', () => {
            logger.info('Client disconnected');

        });

        connection.on('error', (err) => {
            logger.error("Connect websocket error", err);
        });

        connection.isAlive = true;

        if (token) {
            jwt.verify(token, process.env.JWT_SECRET, {}, async (err, userData) => {
                if (err) {
                    logger.error("Error verifying token", err);
                    return
                }
                const userDoc = await User.findOne({email: userData.email});
                if (!userDoc) {
                    logger.error("User not found");
                    return
                }
                connection.user = userDoc
                notifyAboutOnlinePeople();
            });
        }

        connection.timer = setInterval(() => {
            connection.ping();
            connection.deathTimer = setTimeout(() => {
                connection.isAlive = false;
                clearInterval(connection.timer);
                connection.terminate();
                notifyAboutOnlinePeople();
                logger.info(`Connection dead, userId: ${connection.user?._id}`);
            }, 1000);
        }, 5000);

        connection.on('pong', () => {
            clearTimeout(connection.deathTimer);
        });

        connection.on('message', async (message) => {
            const messageData = JSON.parse(message.toString());
            logger.info('Message received ' + JSON.stringify(messageData));
            const {type, data} = messageData;
            switch (type) {
                case 'send-message':
                    await handleSendMessage(data);
                    break;
                case 'new-call':
                    await handleNewCall(data);
                    break;
                case 'cancel-call':
                    await handleCancelCall(data);
                    break;
                case 'accept-call':
                    await handleAcceptCall(data);
                    break;
                case 'peer-signal':
                    await handleSendPeerSignal(data);
                    break;
                default:
                    break;
            }
        });


        notifyAboutOnlinePeople();

        const handleSendMessage = async (data) => {
            const {senderId, channelId, content, attachmentId, stickerId} = data;
            let channel = await Channel.findById(channelId);

            if (!channel) {
                logger.error("Channel not found");
                connection.send(JSON.stringify({
                    type: 'error',
                    data: {
                        message: "Channel not found"
                    }
                }));
                return;
            }

            if (!channel.userIds.includes(senderId)) {
                logger.error("User not in channel");
                connection.send(JSON.stringify({
                    type: 'error',
                    data: {
                        message: "You are not in this channel"
                    }
                }));
                return;
            }

            const newMessage = await Message.create({
                senderId: senderId,
                content: content,
                attachmentId: attachmentId,
                stickerId: stickerId,
                channelId: channelId
            });

            await Channel.updateOne({_id: channelId}, {seenBy: [senderId]});
            const sender = await User.findById(senderId);

            for (const c1 of [...webSocket.clients]
                .filter(c => channel.userIds.includes(c.user._id))) {
                const channels = await Channel.find({userIds: c1.user._id}).populate('userIds');

                const channelReturn = (await Promise.all(channels.map(async channel => {
                    const latestMessage = await Message.findOne({channelId: channel._id}).sort({createdAt: -1});
                    if (!latestMessage) {
                        return null;
                    }
                    let receiver = null;
                    if (channel.type === MessageType.DIRECT) {
                        receiver = channel.userIds.filter(u => u._id.valueOf() !== c1.user._id.valueOf())[0];
                    }

                    return {
                        "_id": channel._id,
                        "name": getChannelName(c1.user, channel),
                        "type": channel.type,
                        "message": latestMessage,
                        "avatarId": receiver?.avatarId,
                        "isUnread": !channel.seenBy.includes(c1.user._id),
                    }
                }))).filter(c => c !== null).sort((a, b) => b.message.createdAt - a.message.createdAt);

                c1.send(JSON.stringify({
                    type: 'message',
                    data: {
                        message: {
                            sender: {
                                firstName: sender.firstName,
                                lastName: sender.lastName,
                                avatarId: sender.avatarId
                            },
                            senderName: `${sender.firstName} ${sender.lastName}`,
                            senderId: senderId,
                            content: content,
                            attachmentId: attachmentId,
                            stickerId: stickerId,
                            channelId: channelId,
                            createdAt: Date.now(),
                            _id: newMessage._id,
                            avatarId: sender.avatarId
                        },
                        history: channelReturn
                    },
                }))
            }
        }

        const handleNewCall = async (data) => {
            const {callerId, channelId, option} = data;
            let channel = await Channel.findById(channelId).populate('userIds');

            if (!channel) {
                logger.error("Channel not found");
                connection.send(JSON.stringify({
                    type: 'error',
                    data: {
                        message: "Channel not found"
                    }
                }));
                return;
            }

            const caller = await User.findById(callerId);

            if (caller.inCall) {
                connection.send(JSON.stringify({
                    type: 'error',
                    data: {
                        message: "You are in a call"
                    }
                }));
                return;
            }

            if (!caller) {
                logger.error("Caller not found");
                connection.send(JSON.stringify({
                    type: 'error',
                    data: {
                        message: "Caller not found"
                    }
                }));
                return;
            }

            const otherUser = channel.userIds.filter(u => u._id.valueOf() !== callerId)[0];
            if (otherUser.inCall) {
                connection.send(JSON.stringify({
                    type: 'error',
                    data: {
                        message: otherUser.firstName + ' ' + otherUser.lastName + " is in other call!"
                    }
                }));
                return;
            }

            channel.userIds.forEach(u => {
                u.inCall = true;
                u.save();
            });

            const channelUserIds = channel.userIds.map(u => u._id.valueOf());
            for (const c1 of [...webSocket.clients]
                .filter(c => channelUserIds.includes(c.user._id.valueOf()))) {
                c1.send(JSON.stringify({
                    type: 'new-call',
                    data: {
                        caller: caller,
                        channel: channel,
                        option: option
                    }
                }))
            }
        }

        const handleCancelCall = async (data) => {
            const {actionUserId, channelId} = data;
            let channel = await Channel.findById(channelId).populate('userIds');

            if (!channel) {
                logger.error("Channel not found");
                connection.send(JSON.stringify({
                    type: 'error',
                    data: {
                        message: "Channel not found"
                    }
                }));
                return;
            }
            channel.onCall = false;
            await channel.save();

            channel.userIds.forEach(u => {
                u.inCall = false;
                u.save();
            });

            const channelUserIds = channel.userIds.map(u => u._id.valueOf());
            for (const c1 of [...webSocket.clients]
                .filter(c => channelUserIds.includes(c.user._id.valueOf()))) {
                c1.send(JSON.stringify({
                    type: 'cancel-call',
                    data: {
                        actionUserId: actionUserId,
                        channelId: channelId
                    }
                }))
            }
        }

        const handleAcceptCall = async (data) => {
            const {channelId, option} = data;
            let channel = await Channel.findById(channelId);
            if (!channel) {
                logger.error("Channel not found");
                connection.send(JSON.stringify({
                    type: 'error',
                    data: {
                        message: "Channel not found"
                    }
                }));
                return;
            }

            channel.onCall = true;
            await channel.save();

            for (const c1 of [...webSocket.clients]
                .filter(c => channel.userIds.includes(c.user._id))) {
                c1.send(JSON.stringify({
                    type: 'join-call',
                    data: {
                        channelId: channelId,
                        option: option
                    }
                }))
            }
        }

        const handleSendPeerSignal = async (data) => {
            const {channelId, peerId, senderId} = data;
            let channel = await Channel.findById(channelId);
            if (!channel) {
                logger.error("Channel not found");
                connection.send(JSON.stringify({
                    type: 'error',
                    data: {
                        message: "Channel not found"
                    }
                }));
                return
            }
            for (const c1 of [...webSocket.clients]
                .filter(c => channel.userIds.includes(c.user?._id) && c.user._id.valueOf() !== senderId)) {
                c1.send(JSON.stringify({
                    type: 'peer-signal',
                    data: {
                        channelId: channelId,
                        peerId: peerId,
                    }
                }))
            }

        }
    });

    return webSocket;
}


