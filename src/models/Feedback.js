import mongoose from 'mongoose';

const {Schema} = mongoose;

const FeedbackSchema = new Schema(
    {
        createdBy: {type: Schema.Types.ObjectId, ref: 'User'},
        content: String,
        user: {type: Schema.Types.ObjectId, ref: 'User'},
    },
    {
        timestamps: true,
    }
);

const Feedback = mongoose.model('Feedback', FeedbackSchema);

export default Feedback;