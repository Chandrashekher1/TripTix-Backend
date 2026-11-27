import PDFDocument from 'pdfkit'
import { Booking } from '../models/booking'
import { PaymentModel } from '../models/payment'

export interface InvoiceSeat {
  seatId: string
  seatNumber: string
  seatPreference: string
  isCancelled: boolean
}

export interface InvoiceCancelledSeat {
  seatNumber: string
  passengerName: string
  refundAmountInr: number
  razorpayRefundId: string
  cancelledAt: Date
}

export interface InvoiceData {
  invoiceNumber: string
  bookingId: string
  status: string
  bookedAt: Date
  customer: {
    name: string
    email: string
    phone: number | string
  }
  bus: {
    operator: string
    busNumber: string
    busType: string
    depTime: string
    arrivalTime: string
    isAc: boolean
    isSleeper: boolean
    isSeater: boolean
    pricePerSeat: number
  }
  route: {
    origin: string
    destination: string
    distance: number
  }
  departureDate: Date | null
  seats: InvoiceSeat[]
  passengers: {
    name: string
    age: number
    gender: string
    isCancelled?: boolean
  }[]
  cancelledSeats: InvoiceCancelledSeat[]
  payment: {
    razorpayOrderId: string
    razorpayPaymentId: string
    amountInr: number
    refundedAmountInr: number
    netAmountInr: number
    currency: string
    status: string
  }
}

export class InvoiceError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'InvoiceError'
  }
}

export async function getBookingInvoiceData(
  bookingId: string,
  requesterId: string,
  isAdmin = false
): Promise<InvoiceData> {
  const booking = await Booking.findById(bookingId)
    .populate('userId', 'name email phone')
    .populate({
      path: 'busId',
      select: 'operator busNumber busType dep_time arrivalTime isAc isSleeper isSeater price routesId',
      populate: { path: 'routesId', select: 'origin destination distance' },
    })
    .populate('tripId', 'departureDate')
    .populate({
      path: 'seatIds',
      select: 'seatId',
      populate: { path: 'seatId', select: 'seatNumber seatPreference' },
    })
    .lean()

  if (!booking) {
    throw new InvoiceError(404, 'Booking not found.')
  }

  const user = booking.userId as unknown as {
    _id: { toString(): string }
    name: string
    email: string
    phone: number
  } | null

  if (!user || (user._id.toString() !== requesterId.toString() && !isAdmin)) {
    throw new InvoiceError(403, 'Access denied. You do not own this booking.')
  }

  const bus = booking.busId as unknown as {
    operator: string
    busNumber: string
    busType: string
    dep_time: string
    arrivalTime: string
    isAc: boolean
    isSleeper: boolean
    isSeater: boolean
    price: number
    routesId?: { origin: string; destination: string; distance: number }
  } | null

  const trip = booking.tripId as unknown as { departureDate?: Date } | null

  const tripSeats = (booking.seatIds || []) as unknown as Array<{
    _id?: { toString(): string }
    seatId?: { seatNumber?: string; seatPreference?: string }
  }>

  const cancelledMap = new Map<string, any>()
  for (const cs of booking.cancelledSeats || []) {
    cancelledMap.set(cs.seatId.toString(), cs)
  }

  const seats: InvoiceSeat[] = tripSeats.map((ts, idx) => {
    const tsId = ts._id ? ts._id.toString() : ''
    const isCancelled = cancelledMap.has(tsId)
    return {
      seatId: tsId,
      seatNumber: ts.seatId?.seatNumber || `Seat ${idx + 1}`,
      seatPreference: ts.seatId?.seatPreference || 'Standard',
      isCancelled,
    }
  })

  const cancelledSeats: InvoiceCancelledSeat[] = (booking.cancelledSeats || []).map((cs) => ({
    seatNumber: cs.seatNumber,
    passengerName: cs.passengerName,
    refundAmountInr: cs.refundAmountPaise / 100,
    razorpayRefundId: cs.razorpayRefundId,
    cancelledAt: cs.cancelledAt,
  }))

  const paymentDoc = await PaymentModel.findOne({
    $or: [{ bookingId: booking._id }, ...(booking.razorpayOrderId ? [{ razorpayOrderId: booking.razorpayOrderId }] : [])],
  }).lean()

  const originalAmountInr = paymentDoc
    ? paymentDoc.amountPaise / 100
    : (bus?.price || 0) * Math.max(seats.length, 1)

  const refundedAmountInr = paymentDoc && paymentDoc.refundedAmountPaise
    ? paymentDoc.refundedAmountPaise / 100
    : cancelledSeats.reduce((acc, curr) => acc + curr.refundAmountInr, 0)

  const netAmountInr = Math.max(0, originalAmountInr - refundedAmountInr)

  const shortId = booking._id.toString().slice(-8).toUpperCase()

  return {
    invoiceNumber: `INV-${shortId}`,
    bookingId: booking._id.toString(),
    status: booking.status,
    bookedAt: booking.createdAt,
    customer: {
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
    bus: {
      operator: bus?.operator || 'N/A',
      busNumber: bus?.busNumber || 'N/A',
      busType: bus?.busType || 'N/A',
      depTime: bus?.dep_time || 'N/A',
      arrivalTime: bus?.arrivalTime || 'N/A',
      isAc: Boolean(bus?.isAc),
      isSleeper: Boolean(bus?.isSleeper),
      isSeater: Boolean(bus?.isSeater),
      pricePerSeat: bus?.price || 0,
    },
    route: {
      origin: bus?.routesId?.origin || 'N/A',
      destination: bus?.routesId?.destination || 'N/A',
      distance: bus?.routesId?.distance || 0,
    },
    departureDate: trip?.departureDate || null,
    seats,
    passengers: (booking.passengerDetails || []).map((p, idx) => {
      const s = seats[idx]
      return {
        name: p.name,
        age: Number(p.age),
        gender: p.gender,
        isCancelled: s ? s.isCancelled : false,
      }
    }),
    cancelledSeats,
    payment: {
      razorpayOrderId: booking.razorpayOrderId || paymentDoc?.razorpayOrderId || 'N/A',
      razorpayPaymentId: booking.razorpayPaymentId || paymentDoc?.razorpayPaymentId || 'N/A',
      amountInr: originalAmountInr,
      refundedAmountInr,
      netAmountInr,
      currency: paymentDoc?.currency || 'INR',
      status: paymentDoc?.status || 'completed',
    },
  }
}

const formatTime = (val: string): string => {
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return val
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (val: Date | null): string => {
  if (!val) return 'N/A'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const titleCase = (val: string): string =>
  val.replace(/\b\w/g, (c) => c.toUpperCase())

export function generateInvoicePdfBuffer(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (err) => reject(err))

    const pageWidth = doc.page.width - 96

    // Header Banner
    const isCancelled = data.status === 'cancelled'
    const isPartiallyCancelled = data.status === 'partially_cancelled'
    const bannerColor = isCancelled ? '#dc2626' : isPartiallyCancelled ? '#d97706' : '#059468'

    doc.rect(48, 40, pageWidth, 68).fill(bannerColor)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('TripTix', 64, 54)
    doc.font('Helvetica').fontSize(10).text('E-TICKET & TAX INVOICE', 64, 82)

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(data.invoiceNumber, 360, 56, { width: 170, align: 'right' })
    doc
      .font('Helvetica')
      .fontSize(9)
      .text(`Status: ${data.status.replace('_', ' ').toUpperCase()}`, 360, 74, { width: 170, align: 'right' })
    doc
      .text(`Issued: ${formatDate(data.bookedAt)}`, 360, 88, { width: 170, align: 'right' })

    doc.fillColor('#111827')
    let y = 128

    // Route & Trip Highlight Box
    doc.roundedRect(48, y, pageWidth, 78, 6).fillAndStroke('#f5fefa', '#d1fae5')
    doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(14).text(
      `${titleCase(data.route.origin)}  ->  ${titleCase(data.route.destination)}`,
      64,
      y + 14
    )
    doc.fillColor('#374151').font('Helvetica').fontSize(10).text(
      `Journey Date: ${formatDate(data.departureDate)}   |   Departure: ${formatTime(data.bus.depTime)}   |   Arrival: ${formatTime(data.bus.arrivalTime)}`,
      64,
      y + 38
    )
    doc.text(
      `Operator: ${data.bus.operator}   |   Bus No: ${data.bus.busNumber}   |   Type: ${data.bus.busType} (${data.bus.isAc ? 'AC' : 'Non-AC'}${data.bus.isSleeper ? ', Sleeper' : ''}${data.bus.isSeater ? ', Seater' : ''})`,
      64,
      y + 54
    )

    y += 96

    // Two-column Info: Customer & Payment Reference
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text('Booked By', 48, y)
    doc.text('Payment Reference', 310, y)
    y += 16

    doc.font('Helvetica').fontSize(9.5).fillColor('#374151')
    doc.text(`Name: ${titleCase(data.customer.name)}`, 48, y)
    doc.text(`Order ID: ${data.payment.razorpayOrderId}`, 310, y)
    y += 14
    doc.text(`Email: ${data.customer.email}`, 48, y)
    doc.text(`Payment ID: ${data.payment.razorpayPaymentId}`, 310, y)
    y += 14
    doc.text(`Phone: ${data.customer.phone}`, 48, y)
    doc.text(`Booking ID: ${data.bookingId}`, 310, y)

    y += 28

    // Seats & Passengers Table Header
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text('Passenger & Seat Details', 48, y)
    y += 18

    doc.rect(48, y, pageWidth, 24).fill('#f3f4f6')
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5)
    doc.text('#', 58, y + 7)
    doc.text('Passenger Name', 84, y + 7)
    doc.text('Age', 230, y + 7)
    doc.text('Gender', 270, y + 7)
    doc.text('Seat No.', 335, y + 7)
    doc.text('Status', 410, y + 7)
    y += 24

    const rowCount = Math.max(data.passengers.length, data.seats.length)
    doc.font('Helvetica').fontSize(9.5).fillColor('#374151')

    for (let i = 0; i < rowCount; i++) {
      const p = data.passengers[i]
      const s = data.seats[i]
      const isCancelledSeat = s?.isCancelled || p?.isCancelled

      doc.text(String(i + 1), 58, y + 7)
      doc.text(p ? titleCase(p.name) : '-', 84, y + 7, { width: 140 })
      doc.text(p ? String(p.age) : '-', 230, y + 7)
      doc.text(p ? titleCase(p.gender) : '-', 270, y + 7)
      doc.font('Helvetica-Bold').text(s ? s.seatNumber : '-', 335, y + 7)

      if (isCancelledSeat) {
        doc.font('Helvetica-Bold').fillColor('#dc2626').text('CANCELLED', 410, y + 7)
      } else {
        doc.font('Helvetica-Bold').fillColor('#059468').text('ACTIVE', 410, y + 7)
      }

      doc.font('Helvetica').fillColor('#374151')
      y += 22
      doc.moveTo(48, y).lineTo(48 + pageWidth, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke()
    }

    y += 20

    // Fare & Refund Summary Box
    const hasRefund = data.payment.refundedAmountInr > 0
    const summaryHeight = hasRefund ? 104 : 72
    const summaryWidth = 250
    const summaryX = 48 + pageWidth - summaryWidth
    doc.roundedRect(summaryX, y, summaryWidth, summaryHeight, 6).fillAndStroke('#f9fafb', '#e5e7eb')

    doc.fillColor('#374151').font('Helvetica').fontSize(9.5)
    doc.text(`Seats (${data.seats.length} x INR ${data.bus.pricePerSeat})`, summaryX + 14, y + 14)
    doc.text(`INR ${data.payment.amountInr.toFixed(2)}`, summaryX + 130, y + 14, {
      width: 106,
      align: 'right',
    })

    let currentBoxY = y + 36

    if (hasRefund) {
      doc.fillColor('#dc2626').text(`Refunded (${data.cancelledSeats.length} seat(s))`, summaryX + 14, currentBoxY)
      doc.text(`- INR ${data.payment.refundedAmountInr.toFixed(2)}`, summaryX + 130, currentBoxY, {
        width: 106,
        align: 'right',
      })
      currentBoxY += 22
    }

    doc.moveTo(summaryX + 14, currentBoxY).lineTo(summaryX + summaryWidth - 14, currentBoxY).strokeColor('#d1d5db').stroke()

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11)
    doc.text('Net Total', summaryX + 14, currentBoxY + 10)
    doc.fillColor('#059468').text(
      `${data.payment.currency} ${data.payment.netAmountInr.toFixed(2)}`,
      summaryX + 120,
      currentBoxY + 10,
      { width: 116, align: 'right' }
    )

    // Footer
    doc
      .fillColor('#6b7280')
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        'This is a computer-generated invoice and e-ticket. Please carry a valid government photo ID during boarding.',
        48,
        doc.page.height - 64,
        { width: pageWidth, align: 'center' }
      )

    doc.end()
  })
}
