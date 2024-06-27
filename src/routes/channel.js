import express from 'express';
import controller from '../controllers/channel.js';

const router = express.Router();
router.post('/', controller.getOrCreateChannel);
router.get('/', controller.getAllChannelOfUser);
router.get('/:channelId', controller.getChannelById);
router.delete('/:channelId', controller.deleteChannel);
router.put('/:channelId', controller.updateChannel);

export default router;