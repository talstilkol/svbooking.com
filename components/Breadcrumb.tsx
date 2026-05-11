import Link from 'next/link';

interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-4 flex items-center gap-1.5 flex-wrap">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300" aria-hidden="true">/</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-blue-600 transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-slate-800 font-medium' : ''}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
