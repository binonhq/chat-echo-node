import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {RESPONSE_STATUS} from "../constants/constants.js";
import User from "../models/User.js";
import {getUserDataFromRequest} from "../utils/utils.js";
import {voiceSettingBucket} from "../main.js";
import {ObjectId} from "mongodb";
import Feedback from "../models/Feedback.js";

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET;
const jwtSecretRefresh = process.env.JWT_SECRET_REFRESH;
const jwtTokenLife = process.env.JWT_TOKEN_LIFE;
const jwtRefreshTokenLife = process.env.JWT_REFRESH_TOKEN_LIFE;

class AuthController {
    // [POST] /auth/register
    async register(req, res) {
        const {firstName, lastName, email, password, confirmPassword} = req.body;
        const userDoc = await User.findOne({email});
        if (userDoc) {
            return res.status(400).json({
                "status": RESPONSE_STATUS.EMAIL_EXISTED,
                "message": "Email already existed, please try another email"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                "status": RESPONSE_STATUS.INVALID_PASSWORD,
                "message": "Password and confirm password do not match"
            });
        }

        try {
            await User.create({
                firstName,
                lastName,
                email,
                password: bcrypt.hashSync(password, bcryptSalt),
            });
            res.status(201).json({
                "status": RESPONSE_STATUS.SUCCESS,
                "message": "Register successfully",
            });
        } catch (error) {
            res.status(400).json({error});
        }
    }

    // [POST] /auth/login
    async login(req, res) {
        const {email, password} = req.body;
        const userDoc = await User.findOne({email});

        if (userDoc) {
            const checkPass = bcrypt.compareSync(password, userDoc.password);
            if (checkPass) {
                const token = jwt.sign({email: userDoc.email, id: userDoc._id}, jwtSecret, {expiresIn: jwtTokenLife});
                const refreshToken = jwt.sign({
                    email: userDoc.email,
                    id: userDoc._id
                }, jwtSecretRefresh, {expiresIn: jwtRefreshTokenLife});

                const response = {
                    "status": RESPONSE_STATUS.SUCCESS,
                    "token": token,
                    "refreshToken": refreshToken,
                    "user": {
                        "userId": userDoc._id,
                        "email": userDoc.email,
                        "firstName": userDoc.firstName,
                        "lastName": userDoc.lastName,
                        "createdAt": userDoc.createdAt,
                        "about": userDoc.about,
                        "phone": userDoc.phone,
                        "avatarId": userDoc.avatarId,
                        "coverId": userDoc.coverId,
                        "voiceSettingId": userDoc.voiceSettingId,
                        "privateVoiceSettings": userDoc.privateVoiceSettings,
                    }
                }
                return res.json(response);
            } else {
                return res.status(400).json({
                    "status": RESPONSE_STATUS.INVALID_PASSWORD,
                    "message": "Invalid password, please try again"
                });
            }
        }
        return res.status(400).json(
            {
                "status": RESPONSE_STATUS.INVALID_EMAIL,
                "message": "Invalid email, please try again"
            }
        )
    }

    // [POST] /auth/logout
    async logout(req, res) {
        res.json('ok');
    }

    // [GET] /auth/current
    async currentUser(req, res) {
        const userDoc = await getUserDataFromRequest(req, res);
        if (!userDoc) {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            return;
        }
        if (userDoc._id) {
            res.json({
                "isAuthenticated": true,
                "user": {
                    "userId": userDoc._id,
                    "email": userDoc.email,
                    "firstName": userDoc.firstName,
                    "lastName": userDoc.lastName,
                    "createdAt": userDoc.createdAt,
                    "about": userDoc.about,
                    "phone": userDoc.phone,
                    "avatarId": userDoc.avatarId,
                    "coverId": userDoc.coverId,
                    "voiceSettingId": userDoc.voiceSettingId,
                    "privateVoiceSettings": userDoc.privateVoiceSettings,
                }
            });
        } else {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
        }
    }

    async updateVoiceSetting(req, res) {
        const userDoc = await getUserDataFromRequest(req, res);
        if (!userDoc) {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            return;
        }
        if (userDoc._id) {
            const {voice_setting_id} = req.query;
            try {
                await User.updateOne({_id: userDoc._id}, {voiceSettingId: voice_setting_id});
                res.json({
                    "status": RESPONSE_STATUS.SUCCESS,
                    "message": "User voice setting updated successfully"
                });
            } catch (error) {
                return res.status(500).send('Error updating user voice setting ID: ' + error.message);
            }
        }
    }

    async updatePassword(req, res) {
        const userDoc = await getUserDataFromRequest(req, res);
        if (!userDoc) {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            return;
        }
        if (userDoc._id) {
            const {oldPassword, newPassword, confirmPassword} = req.body;
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    "status": RESPONSE_STATUS.INVALID_PASSWORD,
                    "message": "Password and confirm password do not match"
                });
            }
            const checkPass = bcrypt.compareSync(oldPassword, userDoc.password);
            if (checkPass) {
                try {
                    await User.updateOne({_id: userDoc._id}, {password: bcrypt.hashSync(newPassword, bcryptSalt)});
                    res.json({
                        "status": RESPONSE_STATUS.SUCCESS,
                        "message": "Password updated successfully"
                    });
                } catch (error) {
                    return res.status(500).send('Error updating user password: ' + error.message);
                }
            } else {
                return res.status(400).json({
                    "status": RESPONSE_STATUS.INVALID_PASSWORD,
                    "message": "Invalid password, please try again"
                });
            }
        }
    }

    async updateProfile(req, res) {
        const userDoc = await getUserDataFromRequest(req, res);
        if (!userDoc) {
            res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
            return;
        }
        if (userDoc._id) {
            const {firstName, lastName, about, phone} = req.body;
            try {
                await User.updateOne({_id: userDoc._id}, {firstName, lastName, about, phone});
                res.json({
                    "status": RESPONSE_STATUS.SUCCESS,
                    "message": "Profile updated successfully"
                });
            } catch (error) {
                return res.status(500).send('Error updating user profile: ' + error.message);
            }
        }
    }

    async removeVoiceSetting(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);
        if (!currentUser) {
            return res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
        }
        const {voice_setting_id} = req.query;
        if (!voice_setting_id) {
            return res.status(400).json({
                "message": "Voice setting ID is required"
            });
        }

        try {
            const objectId = new ObjectId(voice_setting_id)

            const voiceSettings = await voiceSettingBucket.find({"_id": objectId}).toArray();
            if (!voiceSettings.length) {
                return res.status(404).send('File not found.');
            }
            if (voiceSettings[0].metadata.userId !== currentUser._id.valueOf()) {
                return res.status(403).send('You are not allowed to remove this voice setting.');
            }
            await voiceSettingBucket.delete(objectId);

            res.json({
                "status": RESPONSE_STATUS.SUCCESS,
                "message": "Voice setting removed successfully"
            });
        } catch (error) {
            return res.status(500).send('Error removing voice setting: ' + error.message);
        }
    }

    async publishVoiceSetting(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);
        if (!currentUser) {
            return res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
        }
        const {voice_setting_id, option} = req.query;
        if (!voice_setting_id) {
            return res.status(400).json({
                "message": "Voice setting ID is required"
            });
        }

        try {
            const objectId = new ObjectId(voice_setting_id)

            const voiceSettings = await voiceSettingBucket.find({"_id": objectId}).toArray();
            if (!voiceSettings.length) {
                return res.status(404).send('File not found.');
            }
            if (voiceSettings[0].metadata.userId !== currentUser._id.valueOf()) {
                return res.status(403).send('You are not allowed to publish this voice setting.');
            }

            const oldPrivateVoiceSettings = currentUser.privateVoiceSettings || [];

            if (option === 'publish') {
                if (!oldPrivateVoiceSettings.includes(voice_setting_id)) {
                    return res.status(403).send('This voice setting is already published.');
                } else {
                    await User.updateOne({_id: currentUser._id}, {privateVoiceSettings: oldPrivateVoiceSettings.filter(id => id !== voice_setting_id)});
                }
            }

            if (option === 'unpublish') {
                if (oldPrivateVoiceSettings.includes(voice_setting_id)) {
                    return res.status(403).send('This voice setting is already private.');
                } else {
                    await User.updateOne({_id: currentUser._id}, {privateVoiceSettings: [...oldPrivateVoiceSettings, voice_setting_id]});
                }
            }

            res.json({
                "status": RESPONSE_STATUS.SUCCESS,
                "message": "Voice setting update successfully"
            });
        } catch (error) {
            return res.status(500).send('Error publishing voice setting: ' + error.message);
        }
    }

    async cloneVoiceSetting(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);
        if (!currentUser) {
            return res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
        }
        const {voice_setting_id} = req.query;
        if (!voice_setting_id) {
            return res.status(400).json({
                "message": "Voice setting ID is required"
            });
        }

        try {
            const objectId = new ObjectId(voice_setting_id)

            const voiceSettings = await voiceSettingBucket.find({"_id": objectId}).toArray();
            if (!voiceSettings.length) {
                return res.status(404).send('File not found.');
            }

            const newVoiceSetting = {
                filename: voiceSettings[0].filename,
                metadata: {
                    userId: currentUser._id.valueOf(),
                    createdAt: new Date().toISOString(),
                }
            }

            const uploadStream = voiceSettingBucket.openUploadStream(newVoiceSetting.filename, {metadata: newVoiceSetting.metadata});
            voiceSettingBucket.openDownloadStream(objectId).pipe(uploadStream);

            uploadStream.on('finish', () => {
                res.json({
                    "status": RESPONSE_STATUS.SUCCESS,
                    "message": "Voice setting cloned successfully"
                });
            });

            uploadStream.on('error', (err) => {
                res.status(500).send('Error cloning voice setting: ' + err.message);
            });
        } catch (error) {
            return res.status(500).send('Error cloning voice setting: ' + error.message);
        }
    }

    async giveFeedback(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);
        if (!currentUser) {
            return res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
        }
        const {content, userId} = req.body;
        if (!content || !userId) {
            return res.status(400).json({
                "message": "Content and user ID are required"
            });
        }

        try {
            await Feedback.create({
                content,
                user: userId,
                createdBy: currentUser._id.valueOf(),
            });
            res.json({
                "status": RESPONSE_STATUS.SUCCESS,
                "message": "Feedback added successfully"
            });
        } catch (error) {
            return res.status(500).send('Error adding feedback: ' + error.message);
        }
    }
}

export default new AuthController();