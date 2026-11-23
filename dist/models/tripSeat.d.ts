import { Document, Model, Types } from 'mongoose';
export type TripSeatStatus = 'available' | 'locked' | 'booked';
export interface ITripSeat extends Document {
    tripId: Types.ObjectId;
    seatId: Types.ObjectId;
    status: TripSeatStatus;
    lockedBy: Types.ObjectId | null;
    lockedUntil: Date | null;
    lockId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const TripSeat: Model<ITripSeat>;
//# sourceMappingURL=tripSeat.d.ts.map