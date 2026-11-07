import { Request } from 'express';
export interface JwtPayload {
    _id: string;
    isAdmin?: boolean;
}
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
//# sourceMappingURL=index.d.ts.map