'use client';

import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COLLECTION_COLORS } from '@/lib/colors';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  size?: 'sm' | 'md';
}

export function ColorPicker({ color, onChange, size = 'sm' }: ColorPickerProps) {
  const dotClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <Popover>
      <PopoverTrigger
        className={`${dotClass} cursor-pointer rounded-full ring-offset-background transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1`}
        style={{ backgroundColor: color }}
        aria-label="Change color"
        title="Change color"
      />
      <PopoverContent className="w-56 p-3" align="start">
        <HexColorPicker color={color} onChange={onChange} className="!w-full" />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">#</span>
          <HexColorInput
            color={color}
            onChange={onChange}
            prefixed={false}
            className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1">
          {COLLECTION_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              className="h-6 w-6 cursor-pointer rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
