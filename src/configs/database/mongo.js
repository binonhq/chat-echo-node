import mongoose from 'mongoose';

export default async function connectMongoDB() {
    await mongoose.connect(
        process.env.MONGODB_URI
    );
}

