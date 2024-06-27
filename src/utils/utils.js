import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function getUserDataFromRequest(req, res) {
    return new Promise((resolve, reject) => {
        const token = req.headers['authorization'];
        if (token) {
            jwt.verify(token, process.env.JWT_SECRET, {}, async (err, userData) => {
                if (err) {
                    res.status(401).json({
                        "isAuthenticated": false,
                        "message": "Unauthorized"
                    });
                    reject();
                }
                const userDoc = await User.findOne({email: userData.email});
                if (!userDoc) {
                    res.status(401).json({
                        "isAuthenticated": false,
                        "message": "Unauthorized"
                    });
                    reject()
                }

                resolve(userDoc);
            });
        } else {
            res.json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            reject();
        }
    });
}

export function getChannelName(currentUser, channel) {
    if (channel.type === 'group') return channel.name

    const userIdsBuf = channel.userIds
    const userIds = JSON.parse(JSON.stringify(userIdsBuf))
    if (!userIds || !userIds.length) return 'Unknown'
    const otherUser = userIds.filter(u => u.email !== currentUser.email)[0]

    return otherUser.firstName + ' ' + otherUser.lastName
}