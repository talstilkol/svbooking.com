'use client';

import { useEffect } from 'react';

interface ImagePreloaderProps {
  images: string[];
  priority?: boolean;
}

/**
 * Preloads a list of images into the browser cache.
 * Useful for carousels, galleries, and hover-reveal images.
 */
export default function ImagePreloader({ images, priority = false }: ImagePreloaderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const preload = (src: string) => {
      if (priority && 'requestIdleCallback' in window) {
        // Priority images load immediately
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      } else {
        // Non-priority images load during idle time
        const img = new window.Image();
        img.src = src;
      }
    };

    if (priority) {
      images.forEach(preload);
    } else if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => {
        images.forEach(preload);
      });
      return () => window.cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => {
        images.forEach(preload);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [images, priority]);

  return null;
}
