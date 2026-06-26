'use client';

import { cn } from '@shared/utils/cn';

import type { Map } from '../domain/types';

export interface RightRailProps {
  maps: Map[];
  activeSlug: string;
}

export function RightRail({ maps, activeSlug }: RightRailProps) {
  const inactiveMaps = maps.filter((map) => map.slug !== activeSlug);

  return (
    <aside
      className="flex h-full w-28 flex-col gap-3 overflow-y-auto p-2 pb-28 md:w-36"
      data-testid="right-rail"
    >
      {inactiveMaps.map((map) => (
        <a
          key={map.id}
          href={`/${map.slug}`}
          className={cn(
            'group flex flex-1 flex-col overflow-hidden rounded-lg border border-secondary-sand/30',
            'bg-white shadow-sm transition-all duration-200',
            'hover:scale-[1.02] hover:shadow-md'
          )}
        >
          <div className="relative w-full flex-1 overflow-hidden">
            <img
              src={map.image.src}
              alt={map.title}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              width={map.image.width}
              height={map.image.height}
            />
          </div>
          <div className="p-2">
            <span className="block text-center text-xs font-medium text-charcoal">
              {map.title}
            </span>
          </div>
        </a>
      ))}
    </aside>
  );
}
