import connectDB from '@/lib/db';
import Listing from '@/lib/models/Listing';
import { parseNonNegativeNumber, ValidationError, errorResponse } from '@/lib/validation';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const minPrice = parseNonNegativeNumber(searchParams.get('minPrice'), 'minPrice');
    const maxPrice = parseNonNegativeNumber(searchParams.get('maxPrice'), 'maxPrice');

    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      throw new ValidationError('minPrice cannot be greater than maxPrice');
    }

    await connectDB();
    const filter = {};
    if (location && location.trim() !== '') {
      filter.location = { $regex: location.trim(), $options: 'i' };
    }
    if (minPrice !== null || maxPrice !== null) {
      filter.pricePerNight = {};
      if (minPrice !== null) filter.pricePerNight.$gte = minPrice;
      if (maxPrice !== null) filter.pricePerNight.$lte = maxPrice;
    }

    const listings = await Listing.find(filter).sort({ pricePerNight: 1 });
    return Response.json(listings);
  } catch (err) {
    return errorResponse(err);
  }
}
