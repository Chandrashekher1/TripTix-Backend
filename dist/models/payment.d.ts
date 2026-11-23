import { Document, Model, Types } from 'mongoose';
import { IPassenger } from './booking';
export interface IPayment extends Document {
    userId: Types.ObjectId;
    tripId: Types.ObjectId;
    seatIds: Types.ObjectId[];
    bookingId?: Types.ObjectId;
    amountPaise: number;
    currency: 'INR';
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    status: 'pending' | 'completed' | 'failed';
    passengerDetails?: IPassenger[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const PaymentModel: Model<IPayment>;
//# sourceMappingURL=payment.d.ts.map