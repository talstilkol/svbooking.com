'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PhotoGalleryProps {
  mainImage: string;
  hotelName: string;
  city: string;
}

/**
 * Shows the verified catalog image with a zoom-in lightbox on click.
 */
export default function PhotoGallery({ mainImage, hotelName, city }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <div className="mt-4 rounded-xl overflow-hidden">
        <button
          onClick={() => setLightboxOpen(true)}
          className="relative block w-full aspect-[16/9] group cursor-zoom-in"
          aria-label="View full size photo"
        >
          <Image
            src={mainImage}
            alt={`${hotelName} in ${city}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 80vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute bottom-3 left-3 rounded bg-black/55 px-2 py-1 text-xs font-medium text-white">
            View image
          </div>
        </button>
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
