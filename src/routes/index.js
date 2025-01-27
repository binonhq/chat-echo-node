import authRouter from "./auth.js";
import messageRouter from "./message.js";
import channelRouter from "./channel.js";
import userRouter from "./user.js";

export default function createRoutes(app) {
    app.use('/auth', authRouter)
    app.use('/message', messageRouter)
    app.use('/channel', channelRouter)
    app.use('/user', userRouter)
}

