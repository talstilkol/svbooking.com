import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  pricePerNight: { type: Number, required: true, min: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  images: [String],
  availableFrom: Date,
  availableTo: Date,
  description: String,
  amenities: [String],
}, { timestamps: true });

const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema);

export default Listing;
