import express from 'express';
import controller from '../controllers/channel.js';

const router = express.Router();
router.post('/', controller.getOrCreateChannel);

export default router;