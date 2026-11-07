import Joi from 'joi';
export interface UserSignupInput {
    name: string;
    email: string;
    password: string;
    phone: number;
}
export interface UserUpdateInput {
    name?: string;
    email?: string;
    phone?: number;
}
export declare function validateSignup(data: UserSignupInput): Joi.ValidationResult<any>;
export declare function validateUserUpdate(data: UserUpdateInput): Joi.ValidationResult<any>;
export declare const validateUser: typeof validateSignup;
export type UserValidationInput = UserSignupInput;
//# sourceMappingURL=user.d.ts.map