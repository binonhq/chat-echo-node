import express from 'express';
import controller from '../controllers/message.js';

const router = express.Router();
router.get('/:channelId', controller.getMessagesByChannelId);

export default router;