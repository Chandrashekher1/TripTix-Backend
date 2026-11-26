"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingConfirmationEmail = sendBookingConfirmationEmail;
const resend_1 = require("resend");
const invoiceService_1 = require("./invoiceService");
const getResendClient = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('[Email] RESEND_API_KEY is not configured; skipping email notification.');
        return null;
    }
    return new resend_1.Resend(apiKey);
};
const titleCase = (val) => val.replace(/\b\w/g, (c) => c.toUpperCase());
const formatDate = (val) => {
    if (!val)
        return 'N/A';
    const d = new Date(val);
    if (Number.isNaN(d.getTime()))
        return 'N/A';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatTime = (val) => {
    const d = new Date(val);
    if (Number.isNaN(d.getTime()))
        return val;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};
function buildBookingEmailHtml(data) {
    const seatList = data.seats.map((s) => `${s.seatNumber} (${titleCase(s.seatPreference)})`).join(', ');
    const passengerRows = data.passengers
        .map((p, idx) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${titleCase(p.name)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${p.age}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${titleCase(p.gender)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${data.seats[idx]?.seatNumber || '-'}</td>
      </tr>`)
        .join('');
    return `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <div style="background:#059468;color:#ffffff;padding:20px 24px;">
      <h1 style="margin:0;font-size:22px;">TripTix Booking Confirmed</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Invoice ${data.invoiceNumber} &bull; Status: ${data.status.toUpperCase()}</p>
    </div>

    <div style="padding:24px;color:#111827;">
      <p style="margin-top:0;">Hi <strong>${titleCase(data.customer.name)}</strong>,</p>
      <p>Your bus ticket is confirmed! Your PDF e-ticket &amp; tax invoice is attached to this email.</p>

      <div style="background:#f5fefa;border:1px solid #d1fae5;border-radius:6px;padding:16px;margin:16px 0;">
        <h2 style="margin:0 0 8px;font-size:17px;color:#065f46;">
          ${titleCase(data.route.origin)} &rarr; ${titleCase(data.route.destination)}
        </h2>
        <p style="margin:4px 0;font-size:14px;"><strong>Bus:</strong> ${data.bus.operator} (${data.bus.busNumber}) &bull; ${data.bus.busType}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Journey Date:</strong> ${formatDate(data.departureDate)}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Departure:</strong> ${formatTime(data.bus.depTime)} &nbsp;|&nbsp; <strong>Arrival:</strong> ${formatTime(data.bus.arrivalTime)}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Seats:</strong> ${seatList || 'N/A'}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:8px 10px;">#</th>
            <th style="padding:8px 10px;">Passenger</th>
            <th style="padding:8px 10px;">Age</th>
            <th style="padding:8px 10px;">Gender</th>
            <th style="padding:8px 10px;">Seat</th>
          </tr>
        </thead>
        <tbody>${passengerRows}</tbody>
      </table>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px 16px;font-size:14px;">
        <p style="margin:4px 0;"><strong>Total Paid:</strong> <span style="color:#059468;font-weight:bold;">${data.payment.currency} ${data.payment.amountInr.toFixed(2)}</span></p>
        <p style="margin:4px 0;font-size:12px;color:#4b5563;">Order ID: ${data.payment.razorpayOrderId}</p>
        <p style="margin:4px 0;font-size:12px;color:#4b5563;">Payment ID: ${data.payment.razorpayPaymentId}</p>
      </div>

      <p style="font-size:12px;color:#6b7280;margin-top:20px;">
        Please carry a valid government photo ID during boarding. Have a safe journey!
      </p>
    </div>
  </div>`;
}
async function sendBookingConfirmationEmail(bookingId, userId) {
    const resend = getResendClient();
    if (!resend)
        return;
    try {
        const invoiceData = await (0, invoiceService_1.getBookingInvoiceData)(bookingId, userId, true);
        if (!invoiceData.customer.email) {
            console.warn(`[Email] Booking ${bookingId} has no customer email; skipping.`);
            return;
        }
        const pdfBuffer = await (0, invoiceService_1.generateInvoicePdfBuffer)(invoiceData);
        const from = process.env.RESEND_FROM_EMAIL || 'TripTix <onboarding@resend.dev>';
        const { data, error } = await resend.emails.send({
            from,
            to: [invoiceData.customer.email],
            subject: `TripTix Ticket Confirmed: ${titleCase(invoiceData.route.origin)} to ${titleCase(invoiceData.route.destination)} (${invoiceData.invoiceNumber})`,
            html: buildBookingEmailHtml(invoiceData),
            attachments: [
                {
                    filename: `TripTix-${invoiceData.invoiceNumber}.pdf`,
                    content: pdfBuffer,
                },
            ],
        });
        if (error) {
            console.error(`[Email] Resend failed for booking ${bookingId}:`, error);
            return;
        }
        console.log(`[Email] Confirmation & PDF invoice sent to ${invoiceData.customer.email} (id: ${data?.id})`);
    }
    catch (err) {
        const error = err;
        console.error(`[Email] Unexpected error sending confirmation for booking ${bookingId}:`, error.message);
    }
}
//# sourceMappingURL=emailService.js.map