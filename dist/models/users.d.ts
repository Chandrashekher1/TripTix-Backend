import { Document, Model } from 'mongoose';
import Joi from 'joi';
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    phone: number;
    image?: string;
    generateAuthToken(): string;
}
export interface UserValidationInput {
    name: string;
    email: string;
    password: string;
    phone: number;
}
export declare function validateUser(user: UserValidationInput): Joi.ValidationResult<any>;
export declare const Users: Model<IUser>;
//# sourceMappingURL=users.d.ts.map