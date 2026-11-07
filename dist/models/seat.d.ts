import { Document, Model, Types } from 'mongoose';
export interface ISeat extends Document {
    seatNumber: string;
    status: string;
    lockedUntil: Date | null;
    seatPreference: string;
    busId: Types.ObjectId;
    userId: Types.ObjectId | null;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Seat: Model<ISeat>;
//# sourceMappingURL=seat.d.ts.map