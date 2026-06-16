'use client';

import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';

interface ShareBarProps {
  url: string;
  title: string;
  className?: string;
}

const PLATFORMS = [
  {
    name: 'WhatsApp',
    icon: '💬',
    color: 'bg-green-500 hover:bg-green-600',
    getUrl: (url: string, title: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
  },
  {
    name: 'Telegram',
    icon: '✈️',
    color: 'bg-blue-500 hover:bg-blue-600',
    getUrl: (url: string, title: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    name: 'Twitter',
    icon: '𝕏',
    color: 'bg-slate-800 hover:bg-slate-900',
    getUrl: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Facebook',
    icon: '📘',
    color: 'bg-blue-600 hover:bg-blue-700',
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: 'Email',
    icon: '📧',
    color: 'bg-slate-600 hover:bg-slate-700',
    getUrl: (url: string, title: string, body: string) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`,
  },
];

export default function ShareBar({ url, title, className = '' }: ShareBarProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const emailBody = t('shareEmailBody').replace('{url}', url);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-slate-500 font-medium">{t('shareLabel')}</span>

      {PLATFORMS.map((p) => (
        <a
          key={p.name}
          href={p.getUrl(url, title, emailBody)}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm transition ${p.color}`}
          aria-label={t('shareOnPlatform').replace('{platform}', p.name)}
          title={p.name}
        >
          {p.icon}
        </a>
      ))}

      <button
        onClick={copyLink}
        className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-sm transition"
        aria-label={t('copyLinkLabel')}
        title={t('copyLinkLabel')}
      >
        {copied ? '✓' : '🔗'}
      </button>
    </div>
  );
}
