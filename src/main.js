import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectMongoDB from "./services/database/mongo.js";
import logger from "./utils/logger/logger.js";
import createRoutes from "./routes/index.js";
import initWebSocketServer from "./services/websocket/websocket.js";
import {GridFSBucket, MongoClient, ObjectId} from "mongodb";
import multer from 'multer';
import sharp from 'sharp';
import User from "./models/User.js";
import {getUserDataFromRequest} from "./utils/utils.js";
import Channel from "./models/Channel.js";

dotenv.config();
const port = process.env.PORT || 8080;

connectMongoDB().then(() => {
    logger.info("Connected to MongoDB successfully!");
}).catch((err) => {
    logger.error(new Error("Error connecting to MongoDB: ", err));
});

const mongodb = new MongoClient(process.env.MONGODB_URI);
await mongodb.connect();
const database = mongodb.db('chat-echo');

export const voiceSettingBucket = new GridFSBucket(database, {
    bucketName: 'voice_settings'
});

const imageBucket = new GridFSBucket(database, {
    bucketName: 'images'
});

export const attachmentBucket = new GridFSBucket(database, {
    bucketName: 'attachments'
});

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, true);
    }
});

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: '*'
}));

createRoutes(app);

app.get('/test', (req, res) => {
    res.send('Hello World!');
});

app.post('/upload', upload.single('file'), async (req, res) => {
    const userDoc = await getUserDataFromRequest(req, res);

    if (!userDoc) {
        return res.status(401).json({
            "isAuthenticated": false,
            "message": "Unauthorized"
        });
    }

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const {kind, channelId} = req.body;
    const file = req.file;

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const filePath = (new Date().getTime()) + "-" + originalName.replace(/\.[^/.]+$/, "") + ".webp";

    let bucket;

    switch (kind) {
        case 'voice_setting':
            bucket = voiceSettingBucket;
            break;
        case 'avatar':
        case 'cover':
        case 'avatar-group':
            bucket = imageBucket;
            break;
        case 'attachment':
            bucket = attachmentBucket;
            break;
        default:
            return res.status(400).send('Invalid kind.');
    }

    let webpBuffer = file.buffer;
    if (file.mimetype.startsWith('image/')) {
        webpBuffer = await sharp(file.buffer).webp({quality: 80}).toBuffer();
    }

    const uploadStream = bucket.openUploadStream(filePath, {
        chunkSizeBytes: 1048576, // 1 MB
        metadata: {
            name: originalName,
            size: webpBuffer.length,
            type: file.mimetype,
            userId: userDoc._id.valueOf(),
            channelId: channelId || null,
        }
    });

    if (kind === 'voice_setting') {
        try {
            await User.updateOne({_id: userDoc._id}, {voiceSettingId: uploadStream.id});
        } catch (error) {
            return res.status(500).send('Error updating voice setting user ID: ' + userDoc._id.valueOf());
        }
    }

    if (kind === 'avatar') {
        try {
            await User.updateOne({_id: userDoc._id}, {avatarId: uploadStream.id});
        } catch (error) {
            return res.status(500).send('Error updating avatar user ID: ' + userDoc._id.valueOf());
        }
    }

    if (kind === 'cover') {
        try {
            await User.updateOne({_id: userDoc._id}, {coverId: uploadStream.id});
        } catch (error) {
            return res.status(500).send('Error updating cover user ID: ' + userDoc._id.valueOf());
        }
    }

    if (kind === 'avatar-group') {
        const {channelId} = req.body;
        if (!channelId) {
            return res.status(400).send('Channel ID is required.');
        }
        try {
            await Channel.updateOne({_id: channelId}, {avatarId: uploadStream.id});
        } catch (error) {
            return res.status(500).send('Error updating avatar group ID: ' + channelId);
        }
    }

    uploadStream.end(webpBuffer);

    uploadStream.on('finish', () => {
        res.send({
            id: uploadStream.id,
        });
    });

    uploadStream.on('error', (err) => {
        res.status(500).send('Error uploading file: ' + err.message);
    });
});

app.get('/voice-settings', async (req, res) => {
    const {user_id} = req.query;
    if (!user_id) {
        return res.status(400).send('User ID is required.');
    }
    const files = await voiceSettingBucket.find({"metadata.userId": user_id}).sort({uploadDate: 1}).toArray();
    if (!files.length) {
        return res.json({
            settings: [],
            message: 'No settings found.'
        });
    }

    const settings = files.map(file => ({
        filename: file.filename,
        id: file._id,
        createAt: file.uploadDate,
    }));

    res.json({
        settings,
        message: 'Settings found.'
    });
});

app.get('/images/:id', async (req, res) => {
    const {id} = req.params;
    try {
        const objectId = new ObjectId(id);
        const file = await imageBucket.find({"_id": objectId}).toArray();
        if (!file.length) {
            return res.status(404).send('File not found.');
        }

        imageBucket.openDownloadStream(objectId).pipe(res);
    } catch (error) {
        logger.error(error);
    }
});

app.get('/attachments/:id', async (req, res) => {
    const {id} = req.params;
    const {option} = req.query;
    try {
        const objectId = new ObjectId(id);
        const file = await attachmentBucket.find({"_id": objectId}).toArray();
        if (!file.length) {
            return res.status(404).send('File not found.');
        }

        if (option === 'json') {
            res.json({
                type: file[0].metadata.type,
                name: file[0].metadata.name,
                size: file[0].length,
            });
            return;
        }

        attachmentBucket.openDownloadStream(objectId).pipe(res);
    } catch (error) {
        logger.error(error);
    }
});

export const server = app.listen(port, () => {
    logger.info(`Node server listening at ${port}`);
});

export default app;

initWebSocketServer({server});
