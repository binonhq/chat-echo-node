import logger from "../../utils/logger/logger.js";
import {WebSocketServer} from 'ws';
import url from 'url';
import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import Channel from "../../models/Channel.js";
import Message from "../../models/Message.js";

export default function initWebSocketServer(server) {
    const webSocket = new WebSocketServer(server);

    function notifyAboutOnlinePeople() {
        [...webSocket.clients].forEach(client => {
            client.send(JSON.stringify({
                online: [...webSocket.clients].map(c => {
                    const user = c.user
                    if (!user) {
                        return;
                    }

                    return {
                        userId: c.user._id,
                        email: c.user.email,
                        firstName: c.user.firstName,
                        lastName: c.user.lastName,
                    }
                }),
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
            const {senderId, receiverId, content, file, stickerId, type} = messageData;
            let channel = await Channel.findOne({
                users: {$all: [senderId, receiverId]}
            });
            if (!channel) {
                channel = await Channel.create({
                    userIds: [senderId, receiverId],
                    type: type
                })
            }
            await Message.create({
                senderId: senderId,
                content: content,
                attachment: file,
                stickerId: stickerId,
                channelId: channel._id
            });
        });

        notifyAboutOnlinePeople();
    });

    return webSocket;
}
