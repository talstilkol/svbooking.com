import connectDB from '@/lib/db';
import Booking from '@/lib/models/Booking';
import Listing from '@/lib/models/Listing';
import {
  isValidObjectId,
  parsePositiveInteger,
  parseDate,
  ValidationError,
  errorResponse,
} from '@/lib/validation';

const MS_IN_DAY = 1000 * 60 * 60 * 24;

export async function GET() {
  try {
    await connectDB();
    const bookings = await Booking.find().populate('listingId').sort({ createdAt: -1 });
    return Response.json(bookings);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { listingId, guestName, checkIn, checkOut, guests } = body || {};

    if (!listingId || !guestName || !checkIn || !checkOut || guests === undefined) {
      throw new ValidationError('Missing required fields');
    }

    if (!isValidObjectId(listingId)) {
      throw new ValidationError('Invalid listing id');
    }

    const cleanGuestName = String(guestName).trim();
    if (cleanGuestName.length < 2) {
      throw new ValidationError('Guest name must contain at least 2 characters');
    }

    const guestsNumber = parsePositiveInteger(guests, 'Guests');
    const checkInDate = parseDate(checkIn, 'checkIn');
    const checkOutDate = parseDate(checkOut, 'checkOut');

    if (checkInDate >= checkOutDate) {
      throw new ValidationError('Check-in must be before check-out');
    }

    await connectDB();
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return Response.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.availableFrom && checkInDate < listing.availableFrom) {
      throw new ValidationError('Listing is not available from this check-in date');
    }
    if (listing.availableTo && checkOutDate > listing.availableTo) {
      throw new ValidationError('Listing is not available until this check-out date');
    }

    // Overlap check: existing booking overlaps if existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
    const conflict = await Booking.findOne({
      listingId,
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
      status: { $ne: 'cancelled' },
    });
    if (conflict) {
      throw new ValidationError('Listing is already booked for these dates');
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / MS_IN_DAY);
    const totalPrice = nights * listing.pricePerNight;

    const booking = await Booking.create({
      listingId,
      guestName: cleanGuestName,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guestsNumber,
      totalPrice,
      status: 'confirmed',
    });

    return Response.json(booking, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
