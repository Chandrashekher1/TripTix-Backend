export interface InvoiceSeat {
    seatNumber: string;
    seatPreference: string;
}
export interface InvoiceData {
    invoiceNumber: string;
    bookingId: string;
    status: string;
    bookedAt: Date;
    customer: {
        name: string;
        email: string;
        phone: number | string;
    };
    bus: {
        operator: string;
        busNumber: string;
        busType: string;
        depTime: string;
        arrivalTime: string;
        isAc: boolean;
        isSleeper: boolean;
        isSeater: boolean;
        pricePerSeat: number;
    };
    route: {
        origin: string;
        destination: string;
        distance: number;
    };
    departureDate: Date | null;
    seats: InvoiceSeat[];
    passengers: {
        name: string;
        age: number;
        gender: string;
    }[];
    payment: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        amountInr: number;
        currency: string;
        status: string;
    };
}
export declare class InvoiceError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string);
}
export declare function getBookingInvoiceData(bookingId: string, requesterId: string, isAdmin?: boolean): Promise<InvoiceData>;
export declare function generateInvoicePdfBuffer(data: InvoiceData): Promise<Buffer>;
//# sourceMappingURL=invoiceService.d.ts.map