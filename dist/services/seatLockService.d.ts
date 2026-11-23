import { Types } from 'mongoose';
export declare const LOCK_TTL_MS: number;
export declare const MAX_SEATS_PER_LOCK = 10;
export type SeatLockErrorCode = 'INVALID_INPUT' | 'SEATS_UNAVAILABLE';
export declare class SeatLockError extends Error {
    code: SeatLockErrorCode;
    constructor(code: SeatLockErrorCode, message: string);
}
export interface LockResult {
    lockId: string;
    lockedUntil: Date;
    seatIds: string[];
}
export interface ReleasedLocks {
    tripId: string;
    seatIds: string[];
}
export declare function lockSeats(tripId: string, seatIds: string[], userId: string, options?: {
    now?: Date;
    ttlMs?: number;
}): Promise<LockResult>;
export declare function unlockSeats(tripId: string, seatIds: string[], userId: string): Promise<string[]>;
export declare function releaseExpiredLock(seatId: Types.ObjectId | string, lockId: string, now?: Date): Promise<boolean>;
export declare function releaseExpiredLocks(now?: Date): Promise<ReleasedLocks[]>;
//# sourceMappingURL=seatLockService.d.ts.map