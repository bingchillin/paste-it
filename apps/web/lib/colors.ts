export const COLLECTION_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#DDA0DD',
  '#F8A5C2',
  '#BB8FCE',
  '#85C1E9',
  '#F7DC6F',
  '#82E0AA',
  '#FFEAA7',
  '#98D8C8',
];

export function randomCollectionColor(): string {
  return COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)];
}

export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#111827' : '#ffffff';
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
