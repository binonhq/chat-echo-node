import express from 'express';
import controller from '../controllers/auth.js';
import {jwtMiddleware} from "../middlewares/jwt_middleware.js";

const router = express.Router();
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/logout', jwtMiddleware, controller.logout);
router.get('/current-user', jwtMiddleware, controller.currentUser);
router.put('/update_voice', jwtMiddleware, controller.updateVoiceSetting);
router.put('/update_password', jwtMiddleware, controller.updatePassword);
router.put('/update_profile', jwtMiddleware, controller.updateProfile);
router.delete('/delete_voice_setting', jwtMiddleware, controller.removeVoiceSetting);
router.put('/publish_voice_setting', jwtMiddleware, controller.publishVoiceSetting);
router.post('/clone_voice_setting', jwtMiddleware, controller.cloneVoiceSetting);
router.post('/give_feedback', jwtMiddleware, controller.giveFeedback);

export default router;