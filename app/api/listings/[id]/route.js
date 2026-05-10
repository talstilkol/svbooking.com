import connectDB from '@/lib/db';
import Listing from '@/lib/models/Listing';
import { isValidObjectId, ValidationError, errorResponse } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      throw new ValidationError('Invalid listing id');
    }

    await connectDB();
    const listing = await Listing.findById(id);
    if (!listing) {
      return Response.json({ error: 'Listing not found' }, { status: 404 });
    }
    return Response.json(listing);
  } catch (err) {
    return errorResponse(err);
  }
}
