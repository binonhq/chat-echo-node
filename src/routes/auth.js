import express from 'express';
import controller from '../controllers/auth.js';
import {jwtMiddleware} from "../middlewares/jwt_middleware.js";

const router = express.Router();
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/logout', jwtMiddleware, controller.logout);
router.get('/current-user', jwtMiddleware, controller.currentUser);

export default router;