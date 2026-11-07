import { Document, Model, Types } from 'mongoose';
interface IPassenger {
    name: string;
    age: string;
    gender: string;
}
export interface IBooking extends Document {
    userId: Types.ObjectId;
    busId: Types.ObjectId;
    seatIds: Types.ObjectId[];
    passengerDetails: IPassenger[];
    status: string;
    createdAt: Date;
}
export declare const Booking: Model<IBooking>;
export {};
//# sourceMappingURL=booking.d.ts.map