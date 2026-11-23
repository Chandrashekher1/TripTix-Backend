import { Document, Model, Types } from 'mongoose';
export interface IPassenger {
    name: string;
    age: number;
    gender: string;
}
export interface IBooking extends Document {
    userId: Types.ObjectId;
    busId: Types.ObjectId;
    tripId: Types.ObjectId;
    seatIds: Types.ObjectId[];
    passengerDetails: IPassenger[];
    status: 'confirmed' | 'cancelled';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    createdAt: Date;
}
export declare const Booking: Model<IBooking>;
//# sourceMappingURL=booking.d.ts.map