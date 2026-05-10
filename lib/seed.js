import connectDB from './db.js';
import Listing from './models/Listing.js';

const sampleListings = [
  {
    title: 'Luxury Beach Villa',
    location: 'Miami, Florida',
    pricePerNight: 450,
    rating: 4.8,
    images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800'],
    description: 'Stunning beachfront villa with private pool and ocean views.',
    amenities: ['Pool', 'WiFi', 'Parking', 'Kitchen', 'Air Conditioning'],
    availableFrom: new Date('2024-01-01'),
    availableTo: new Date('2024-12-31'),
  },
  {
    title: 'Downtown Apartment',
    location: 'New York, NY',
    pricePerNight: 200,
    rating: 4.5,
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
    description: 'Modern apartment in the heart of Manhattan, walking distance to Times Square.',
    amenities: ['WiFi', 'Kitchen', 'Gym', 'Doorman'],
    availableFrom: new Date('2024-01-01'),
    availableTo: new Date('2024-12-31'),
  },
  {
    title: 'Mountain Cabin Retreat',
    location: 'Aspen, Colorado',
    pricePerNight: 350,
    rating: 4.9,
    images: ['https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800'],
    description: 'Cozy cabin with fireplace and mountain views, perfect for ski trips.',
    amenities: ['Fireplace', 'WiFi', 'Parking', 'Hot Tub', 'Kitchen'],
    availableFrom: new Date('2024-01-01'),
    availableTo: new Date('2024-12-31'),
  },
  {
    title: 'City Center Studio',
    location: 'San Francisco, CA',
    pricePerNight: 180,
    rating: 4.3,
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
    description: 'Bright studio apartment near Union Square, great for business travelers.',
    amenities: ['WiFi', 'Kitchen', 'Gym', 'Laundry'],
    availableFrom: new Date('2024-01-01'),
    availableTo: new Date('2024-12-31'),
  },
  {
    title: 'Beachfront Condo',
    location: 'San Diego, California',
    pricePerNight: 275,
    rating: 4.6,
    images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
    description: 'Beautiful condo with direct beach access and stunning sunset views.',
    amenities: ['Beach Access', 'Pool', 'WiFi', 'Parking', 'Kitchen'],
    availableFrom: new Date('2024-01-01'),
    availableTo: new Date('2024-12-31'),
  },
  {
    title: 'Historic Townhouse',
    location: 'Boston, Massachusetts',
    pricePerNight: 300,
    rating: 4.7,
    images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
    description: 'Charming historic townhouse in Beacon Hill, walking distance to downtown.',
    amenities: ['WiFi', 'Garden', 'Fireplace', 'Kitchen'],
    availableFrom: new Date('2024-01-01'),
    availableTo: new Date('2024-12-31'),
  },
];

async function seedDatabase() {
  try {
    await connectDB();
    console.log('Connected to database');

    // Clear existing listings
    await Listing.deleteMany({});
    console.log('Cleared existing listings');

    // Insert sample listings
    await Listing.insertMany(sampleListings);
    console.log('Sample listings inserted successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
