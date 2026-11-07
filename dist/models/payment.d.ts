import { Document, Model, Types } from 'mongoose';
export interface IPayment extends Document {
    bookinId: Types.ObjectId;
    userId: Types.ObjectId;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    trainsactionId: string;
    createdAt: Date;
}
export declare const Payment: Model<IPayment>;
//# sourceMappingURL=payment.d.ts.map