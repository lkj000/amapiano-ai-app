import React from 'react';

interface WaveformProps {
  data: number[];
  width: number;
  height: number;
  color: string;
}

export default function Waveform({ data, width, height, color }: WaveformProps) {
  const path = data
    .map((d, i) => {
      const x = (i / data.length) * width;
      const y = (1 - d) * (height / 2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
}
