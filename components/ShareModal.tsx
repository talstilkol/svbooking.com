'use client';

import { useState } from 'react';

interface ShareModalProps {
  url: string;
  title: string;
  description: string;
  className?: string;
}

const SHARE_PLATFORMS = [
  {
    name: 'WhatsApp',
    icon: '💬',
    color: 'bg-green-50 hover:bg-green-100 text-green-700',
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
  },
  {
    name: 'Twitter',
    icon: '🐦',
    color: 'bg-sky-50 hover:bg-sky-100 text-sky-700',
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Facebook',
    icon: '📘',
    color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700',
    getUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Email',
    icon: '📧',
    color: 'bg-slate-50 hover:bg-slate-100 text-slate-700',
    getUrl: (url: string, text: string) =>
      `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(text + '\n\n' + url)}`,
  },
  {
    name: 'Telegram',
    icon: '✈️',
    color: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];

export default function ShareModal({
  url,
  title,
  description,
  className = '',
}: ShareModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = `${title} — ${description}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
        return;
      } catch {
        /* fallback to modal */
      }
    }
    setOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <>
      <button
        onClick={handleNativeShare}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition ${className}`}
      >
        <span aria-hidden="true">↗</span>
        Share
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Share</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-500 hover:text-slate-600 text-xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">{title}</p>
            </div>

            {/* Platform buttons */}
            <div className="p-5 grid grid-cols-3 gap-3">
              {SHARE_PLATFORMS.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.getUrl(url, shareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition ${platform.color}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="text-xl">{platform.icon}</span>
                  <span className="text-[10px] font-medium">{platform.name}</span>
                </a>
              ))}
            </div>

            {/* Copy link */}
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                <input
                  type="text"
                  readOnly
                  value={url}
                  className="flex-1 bg-transparent text-xs text-slate-600 outline-none truncate"
                />
                <button
                  onClick={copyLink}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
