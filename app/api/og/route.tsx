import { ImageResponse } from 'next/og';
import { findHotel } from '@/lib/hotels-catalog';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hotelKey = searchParams.get('hotelKey');
  const title = searchParams.get('title') || 'SV Booking';
  const subtitle = searchParams.get('subtitle') || 'Compare hotel prices from 8+ providers';

  const hotel = hotelKey ? findHotel(hotelKey) : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%)',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: '48px',
              display: 'flex',
            }}
          >
            ✈️
          </div>
          <div
            style={{
              color: 'white',
              fontSize: '36px',
              fontWeight: 700,
            }}
          >
            SV Booking
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
          <div
            style={{
              color: 'white',
              fontSize: hotel ? '52px' : '64px',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '16px',
              maxWidth: '900px',
            }}
          >
            {hotel ? hotel.name : title}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: '28px',
              lineHeight: 1.4,
              maxWidth: '800px',
            }}
          >
            {hotel ? `${hotel.city}, ${hotel.country} — Compare prices from 8+ providers` : subtitle}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '24px',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '20px' }}>
            Booking.com · Expedia · Hotels.com · Agoda · Vio · Trip.com
          </div>
          <div
            style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 600,
              background: 'rgba(255,255,255,0.15)',
              padding: '8px 20px',
              borderRadius: '12px',
            }}
          >
            100% Free
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
