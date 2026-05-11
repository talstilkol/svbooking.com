'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PhotoGalleryProps {
  mainImage: string;
  hotelName: string;
  city: string;
}

/**
 * Shows the main hotel image with zoom-in lightbox on click.
 * In a real app, this would pull multiple photos from the hotel data.
 * Currently displays the main image with a zoom/lightbox experience.
 */
export default function PhotoGallery({ mainImage, hotelName, city }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Generate gallery-like images from the main image with Unsplash transforms
  // In production, these would be real hotel gallery photos
  const images = [
    { src: mainImage, label: 'Hotel exterior' },
    { src: mainImage.replace('w=800', 'w=800&fit=crop&crop=bottom'), label: 'Lobby view' },
    { src: mainImage.replace('w=800', 'w=800&fit=crop&crop=left'), label: 'Room' },
    { src: mainImage.replace('w=800', 'w=800&fit=crop&crop=right'), label: 'Amenities' },
  ];

  return (
    <>
      <div className="grid grid-cols-4 gap-2 mt-4 rounded-xl overflow-hidden">
        {/* Main image - spans 2 cols */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="col-span-2 row-span-2 relative aspect-[4/3] group cursor-zoom-in"
          aria-label="View full size photo"
        >
          <Image
            src={images[0].src}
            alt={`${hotelName} - ${images[0].label}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>

        {/* Smaller images */}
        {images.slice(1).map((img, i) => (
          <button
            key={i}
            onClick={() => setLightboxOpen(true)}
            className="relative aspect-[4/3] group cursor-zoom-in"
            aria-label={`View ${img.label}`}
          >
            <Image
              src={img.src}
              alt={`${hotelName} - ${img.label}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 25vw, 15vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            {i === 2 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">View all</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-label="Photo gallery"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 transition z-10"
            aria-label="Close gallery"
          >
            &#10005;
          </button>
          <div className="relative max-w-5xl w-full aspect-[16/10]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={mainImage}
              alt={`${hotelName} in ${city}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-white/90 font-medium">{hotelName}</p>
            <p className="text-white/60 text-sm">{city}</p>
          </div>
        </div>
      )}
    </>
  );
}
