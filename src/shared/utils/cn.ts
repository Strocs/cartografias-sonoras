import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  // eslint-disable-next-line tailwindcss/no-custom-classname
  return twMerge(clsx(inputs));
}
