import { Document, Model, Types } from 'mongoose';
export interface ITrip extends Document {
    busId: Types.ObjectId;
    departureDate: Date;
    createdAt: Date;
}
export declare const Trip: Model<ITrip>;
//# sourceMappingURL=trip.d.ts.map