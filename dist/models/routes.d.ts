import { Document, Model } from 'mongoose';
export interface IRoute extends Document {
    origin: string;
    destination: string;
    distance: number;
}
export declare const Routes: Model<IRoute>;
//# sourceMappingURL=routes.d.ts.map