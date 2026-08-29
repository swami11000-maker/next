import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function generate7DigitNumber(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}
