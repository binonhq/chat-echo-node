import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectMongoDB from "./src/configs/database/mongo.js";
import logger from "./src/utils/logger/logger.js";
import createRoutes from "./src/routes/index.js";
import initWebSocketServer from "./src/configs/websocket/websocket.js";

dotenv.config();
const port = process.env.PORT || 8080;
const host = process.env.HOST || 'localhost';

connectMongoDB().then(() => {
    logger.info("Connected to MongoDB successfully!");
}).catch((err) => {
    logger.error(new Error("Error connecting to MongoDB: ", err));
})

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

const server = app.listen(port, host, () => {
    logger.info(`Node server listening at http://${host}:${port}`);
});

initWebSocketServer({server});

