import {getUserDataFromRequest} from "../utils/utils.js";
import User from "../models/User.js";
import Feedback from "../models/Feedback.js";

class UserController {
    // [GET] /user
    async getAllUser(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);

        if (!currentUser) {
            return res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
        }

        const users = await User.find({email: {$ne: currentUser.email}});
        const result = users.map(u => {
            return {
                "userId": u._id,
                "email": u.email,
                "firstName": u.firstName,
                "lastName": u.lastName,
                "avatarId": u.avatarId,
                "createdAt": u.createdAt,
            }
        });
        res.json(result);
    }

    async getUserById(req, res) {
        const currentUser = await getUserDataFromRequest(req, res);
        if (!currentUser) {
            return res.status(401).json({
                "isAuthenticated": false,
                "message": "Unauthorized"
            });
        }
        const {userId} = req.params;
        if (!userId) {
            return res.status(400).json({
                "message": "User ID is required"
            });
        }
        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    "message": "User not found"
                });
            }

            const feedbacks = await Feedback.find({user: userId}).populate('createdBy').sort({createdAt: -1});

            res.json({
                user,
                feedbacks
            });

        } catch (error) {
            res.status(500).json({
                "message": "Internal server error"
            });
        }
    }

}

export default new UserController();