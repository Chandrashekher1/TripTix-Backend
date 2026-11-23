import { Server } from 'socket.io';
export declare const EXPIRY_SWEEP_INTERVAL_MS: number;
export declare function startLockExpiryWorker(io: Server, intervalMs?: number): () => void;
//# sourceMappingURL=lockExpiryWorker.d.ts.map