'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';

interface HotelGalleryModalProps {
  images: string[];
  hotelName: string;
  initialIndex?: number;
  onClose: () => void;
}

export default function HotelGalleryModal({
  images,
  hotelName,
  initialIndex = 0,
  onClose,
}: HotelGalleryModalProps) {
  const [current, setCurrent] = useState(initialIndex);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next]);

  const thumbnails = useMemo(() => images.slice(0, 8), [images]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-white/20 transition"
        aria-label="Close gallery"
      >
        ✕
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm font-medium">
        {current + 1} / {images.length}
      </div>

      {/* Previous */}
      {images.length > 1 && (
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-white/20 transition text-xl"
          aria-label="Previous image"
        >
          ←
        </button>
      )}

      {/* Main Image */}
      <div className="relative w-full max-w-4xl mx-16 aspect-[16/10]">
        <Image
          src={images[current]}
          alt={`${hotelName} photo ${current + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority
        />
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-white/20 transition text-xl"
          aria-label="Next image"
        >
          →
        </button>
      )}

      {/* Thumbnails */}
      {thumbnails.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {thumbnails.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative w-14 h-10 rounded-lg overflow-hidden border-2 transition ${
                current === i ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="56px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
