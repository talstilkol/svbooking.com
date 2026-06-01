'use client';

import { Filter, Star, DollarSign, Wifi, Car, Utensils, Dumbbell, Coffee } from 'lucide-react';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export interface FilterOptions {
  stars: number[];
  priceRange: [number, number];
  amenities: string[];
  sort: string;
}

interface SearchFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
  resultCount: number;
}

const AMENITIES = [
  { id: 'wifi', labelKey: 'sfAmWifi', icon: Wifi },
  { id: 'parking', labelKey: 'sfAmParking', icon: Car },
  { id: 'restaurant', labelKey: 'sfAmRestaurant', icon: Utensils },
  { id: 'gym', labelKey: 'sfAmGym', icon: Dumbbell },
  { id: 'breakfast', labelKey: 'sfAmBreakfast', icon: Coffee },
];

const STAR_OPTIONS = [5, 4, 3, 2, 1];

export default function SearchFilters({
  filters,
  onFiltersChange,
  onClear,
  isOpen,
  onToggle,
  resultCount,
}: SearchFiltersProps) {
  const { t } = useLocale();
  const dataFilterNotice = t('sfDataNotice');
  const priceRange = filters.priceRange;

  const toggleStar = (star: number) => {
    const newStars = filters.stars.includes(star)
      ? filters.stars.filter((s) => s !== star)
      : [...filters.stars, star];
    onFiltersChange({ ...filters, stars: newStars });
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    onFiltersChange({ ...filters, amenities: newAmenities });
  };

  const handlePriceChange = (index: 0 | 1, value: number) => {
    const newRange: [number, number] = [...priceRange];
    newRange[index] = value;
    onFiltersChange({ ...filters, priceRange: newRange });
  };

  const handleSortChange = (sort: string) => {
    onFiltersChange({ ...filters, sort });
  };

  const hasActiveFilters =
    filters.sort !== 'name-asc';

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-zinc-200 hover:border-indigo-300 transition-colors"
      >
        <Filter className="w-4 h-4" />
        <span className="font-medium">{t('sfFilters')}</span>
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
        )}
        <span className="text-sm text-zinc-500">
          {interpolate(t('sfResults'), { count: resultCount })}
        </span>
      </button>

      {/* Filters Panel */}
      {isOpen && (
          <div
            className="animate-fade-in absolute top-full left-0 right-0 mt-2 p-5 bg-white rounded-2xl border border-zinc-200 shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{t('sfFilters')}</h3>
              <button
                onClick={onClear}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                {t('sfClearAll')}
              </button>
            </div>

            <div className="space-y-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t('sfDisabledNotice')}
              </div>

              {/* Star Rating */}
              <div>
                <label className="text-sm font-semibold mb-2 block">{t('sfStarRating')}</label>
                <div className="flex flex-wrap gap-2">
                  {STAR_OPTIONS.map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled
                      title={dataFilterNotice}
                      onClick={() => toggleStar(star)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        filters.stars.includes(star)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${filters.stars.includes(star) ? 'fill-current' : ''}`} />
                      <span>{star}+</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm font-semibold mb-2 block">{t('sfPriceRange')}</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50">
                      <DollarSign className="w-4 h-4 text-zinc-400" />
                      <input
                        type="number"
                        value={priceRange[0]}
                        disabled
                        title={dataFilterNotice}
                        aria-label={t('sfMinPrice')}
                        onChange={(e) => handlePriceChange(0, parseInt(e.target.value) || 0)}
                        className="w-full bg-transparent outline-none disabled:cursor-not-allowed"
                        placeholder={t('sfMin')}
                      />
                    </div>
                  </div>
                  <span className="text-zinc-400">-</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50">
                      <DollarSign className="w-4 h-4 text-zinc-400" />
                      <input
                        type="number"
                        value={priceRange[1]}
                        disabled
                        title={dataFilterNotice}
                        aria-label={t('sfMaxPrice')}
                        onChange={(e) => handlePriceChange(1, parseInt(e.target.value) || 0)}
                        className="w-full bg-transparent outline-none disabled:cursor-not-allowed"
                        placeholder={t('sfMax')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="text-sm font-semibold mb-2 block">{t('sfAmenities')}</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((amenity) => {
                    const Icon = amenity.icon;
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        disabled
                        title={dataFilterNotice}
                        onClick={() => toggleAmenity(amenity.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          filters.amenities.includes(amenity.id)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-sm">{t(amenity.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label htmlFor="search-sort" className="text-sm font-semibold mb-2 block">{t('sfSortBy')}</label>
                <select
                  id="search-sort"
                  value={filters.sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white"
                >
                  <option value="name-asc">{t('sfSortNameAsc')}</option>
                  <option value="name-desc">{t('sfSortNameDesc')}</option>
                  <option value="city-asc">{t('sfSortCityAsc')}</option>
                </select>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={onToggle}
              className="w-full mt-5 px-4 py-2.5 rounded-lg bg-linear-to-r from-indigo-600 to-pink-600 text-white font-semibold shadow-md hover:shadow-lg transition-shadow"
            >
              {t('sfApply')}
            </button>
          </div>
        )}
    </div>
  );
}
