import { Document, Model, Types } from 'mongoose';
export interface IPassenger {
    name: string;
    age: number;
    gender: string;
    seatId?: Types.ObjectId;
}
export interface ICancelledSeat {
    seatId: Types.ObjectId;
    seatNumber: string;
    passengerName: string;
    refundAmountPaise: number;
    razorpayRefundId: string;
    cancelledAt: Date;
}
export interface IBooking extends Document {
    userId: Types.ObjectId;
    busId: Types.ObjectId;
    tripId: Types.ObjectId;
    seatIds: Types.ObjectId[];
    passengerDetails: IPassenger[];
    cancelledSeats: ICancelledSeat[];
    status: 'confirmed' | 'partially_cancelled' | 'cancelled';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    createdAt: Date;
}
export declare const Booking: Model<IBooking>;
//# sourceMappingURL=booking.d.ts.map