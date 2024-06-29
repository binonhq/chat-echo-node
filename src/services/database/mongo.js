import mongoose from 'mongoose';

export default async function connectMongoDB() {
    await mongoose.connect(
        process.env.MONGODB_URI
    );
}

// const connection = mongoose.createConnection(process.env.MONGODB_URI)
// let gfs
// connection.once('open', () => {
//     gfs = new mongoose.mongo.GridFSBucket(connection.db, {
//         bucketName: 'uploads'
//     });
// })
// return {connection, gfs};

