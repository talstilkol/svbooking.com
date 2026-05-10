import { findCheaperDates } from '@/lib/cheaper-dates';
import { findHotel } from '@/lib/hotels-catalog';
import { ValidationError, errorResponse, parseDate } from '@/lib/validation';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    if (!hotelKey || !checkIn || !checkOut) {
      throw new ValidationError('Missing required params: hotelKey, checkIn, checkOut');
    }

    const checkInDate = parseDate(checkIn, 'checkIn');
    const checkOutDate = parseDate(checkOut, 'checkOut');
    if (checkInDate >= checkOutDate) {
      throw new ValidationError('checkIn must be before checkOut');
    }

    const hotel = findHotel(hotelKey);
    const result = await findCheaperDates(hotelKey, checkIn, checkOut);

    return Response.json({
      hotel: hotel || { hotelKey, name: 'Hotel' },
      ...result,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
