import Link from 'next/link';
import Image from 'next/image';

interface Listing {
  _id: string;
  title: string;
  location: string;
  pricePerNight: number;
  rating: number;
  images?: string[];
  description?: string;
}

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link href={`/book/${listing._id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border border-zinc-200">
        {listing.images && listing.images.length > 0 ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            width={400}
            height={192}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-zinc-200 flex items-center justify-center">
            <span className="text-zinc-500">No image</span>
          </div>
        )}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            {listing.title}
          </h3>
          <p className="text-zinc-600 mb-2">{listing.location}</p>
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-blue-600">
              ${listing.pricePerNight}/night
            </span>
            <span className="text-zinc-600">
              ⭐ {listing.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
