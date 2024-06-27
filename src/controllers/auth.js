import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {RESPONSE_STATUS} from "../constants/constants.js";
import User from "../models/User.js";
import {getUserDataFromRequest} from "../utils/utils.js";

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
}

export default new AuthController();