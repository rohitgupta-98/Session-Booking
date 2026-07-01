import { Schema, model, Document, Types } from 'mongoose';
import { SessionStatus } from '../types';

export interface ISession extends Document {
  teacherId: Types.ObjectId;
  userId: Types.ObjectId | null;
  startTime: Date;
  endTime: Date;
  status: SessionStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.AVAILABLE,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for efficient date-based queries on available sessions
sessionSchema.index({ status: 1, startTime: 1 });
// Index for user session lookups
sessionSchema.index({ userId: 1, status: 1 });

export const Session = model<ISession>('Session', sessionSchema);
