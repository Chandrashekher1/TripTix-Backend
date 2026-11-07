import Joi from 'joi';
export interface LoginInput {
    email: string;
    password: string;
}
export declare function validateAuth(data: LoginInput): Joi.ValidationResult<any>;
export declare const validateLogin: typeof validateAuth;
//# sourceMappingURL=auth.d.ts.map