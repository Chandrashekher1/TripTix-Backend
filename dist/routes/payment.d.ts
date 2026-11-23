import { PaymentModel } from '../models/payment';
import { Booking } from '../models/booking';
declare const router: import("express-serve-static-core").Router;
export interface FulfillPaymentResult {
    success: boolean;
    code?: string;
    message: string;
    booking?: InstanceType<typeof Booking> | null;
    payment?: InstanceType<typeof PaymentModel> | null;
    alreadyProcessed?: boolean;
}
/**
 * Shared atomic fulfillment function used by both client /verify and server-to-server /webhook.
 * Ensures strict idempotency: if already fulfilled, skips writes and returns existing booking.
 */
export declare function fulfillPayment({ orderId, paymentId, passengerDetails, }: {
    orderId: string;
    paymentId: string;
    passengerDetails?: {
        name: string;
        age: number;
        gender: string;
    }[];
}): Promise<FulfillPaymentResult>;
export default router;
//# sourceMappingURL=payment.d.ts.map