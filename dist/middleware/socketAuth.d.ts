import { Socket } from 'socket.io';
export interface SocketUser {
    _id: string;
    isAdmin?: boolean;
}
declare module 'socket.io' {
    interface SocketData {
        user: SocketUser;
    }
}
export declare function socketAuth(socket: Socket, next: (err?: Error) => void): void;
//# sourceMappingURL=socketAuth.d.ts.map