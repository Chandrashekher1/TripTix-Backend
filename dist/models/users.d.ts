import { Document, Model } from 'mongoose';
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    phone: number;
    image?: string;
    generateAuthToken(): string;
}
export declare const Users: Model<IUser>;
export { validateSignup, validateUser, validateUserUpdate, UserSignupInput, UserValidationInput, } from '../validations/user';
//# sourceMappingURL=users.d.ts.map