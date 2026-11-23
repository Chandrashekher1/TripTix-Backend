import { ClientSession, Types } from 'mongoose';
import { ITrip } from '../models/trip';
export type TripServiceErrorCode = 'BUS_NOT_FOUND' | 'NO_SEAT_LAYOUT' | 'TRIP_EXISTS' | 'TRIP_NOT_FOUND';
export declare class TripServiceError extends Error {
    code: TripServiceErrorCode;
    constructor(code: TripServiceErrorCode, message: string);
}
export declare function generateTripInventory(tripId: Types.ObjectId | string, busId: Types.ObjectId | string, session?: ClientSession): Promise<number>;
export declare function createTrip(busId: string, departureDate: Date): Promise<ITrip>;
//# sourceMappingURL=tripService.d.ts.map