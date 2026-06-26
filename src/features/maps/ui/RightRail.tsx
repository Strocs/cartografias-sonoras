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
    <aside className="h-full w-28 py-4 pr-4 md:w-36" data-testid="right-rail">
      <div className="flex h-full flex-col gap-4">
        {inactiveMaps.map((map) => (
          <a
            key={map.id}
            href={`/${map.slug}`}
            className={cn(
              'group border-secondary-sand/60 relative flex flex-1 flex-col overflow-hidden rounded-xl border shadow-lg'
            )}
          >
            <div className="group-hover:bg-primary-teal/90 absolute inset-0 z-10 flex items-center justify-center p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="text-secondary-sand block text-center text-lg leading-none font-bold tracking-wide uppercase">
                {map.title}
              </span>
            </div>
            <img
              src={map.image.src}
              alt={map.title}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="eager"
              width={map.image.width}
              height={map.image.height}
            />
          </a>
        ))}
      </div>
    </aside>
  );
}
