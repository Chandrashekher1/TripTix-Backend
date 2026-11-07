import { Document, Model, Types } from 'mongoose';
export interface IBus extends Document {
    operator: string;
    dep_time: string;
    arrivalTime: string;
    isAc: boolean;
    isSeater: boolean;
    isSleeper: boolean;
    isWifi: boolean;
    price: number;
    totalSeat: number;
    busType: string;
    busNumber: string;
    routesId: Types.ObjectId;
    images: string[];
    date: Date;
    rating: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const BusModel: Model<IBus>;
export default BusModel;
//# sourceMappingURL=buses.d.ts.map