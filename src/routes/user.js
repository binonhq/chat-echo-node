import express from 'express';
import controller from '../controllers/user.js';

const router = express.Router();
router.get('/', controller.getAllUser);
router.get('/:userId', controller.getUserById);

export default router;