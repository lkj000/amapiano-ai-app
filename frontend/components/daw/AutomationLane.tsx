import React, { useRef, useCallback } from 'react';
import type { AutomationData, AutomationPoint } from '~backend/music/types';

interface AutomationLaneProps {
  automation: AutomationData;
  onUpdatePoints: (newPoints: AutomationPoint[]) => void;
  width: number;
  height: number;
}

export default function AutomationLane({ automation, onUpdatePoints, width, height }: AutomationLaneProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const addPoint = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = (x / width) * 32; // 32 beats total
    const value = 1 - (y / height);

    const newPoint: AutomationPoint = { time, value: Math.max(0, Math.min(1, value)) };
    const newPoints = [...automation.points, newPoint].sort((a, b) => a.time - b.time);
    onUpdatePoints(newPoints);
  }, [width, height, automation.points, onUpdatePoints]);

  const pointsToPath = (points: AutomationPoint[]) => {
    if (points.length === 0) return `M 0 ${height / 2} H ${width}`;
    
    let path = `M ${(points[0].time / 32) * width} ${(1 - points[0].value) * height}`;
    points.slice(1).forEach(point => {
      path += ` L ${(point.time / 32) * width} ${(1 - point.value) * height}`;
    });
    return path;
  };

  return (
    <div className="h-16 bg-muted/20 border-t border-border/50 relative">
      <svg ref={svgRef} width={width} height={height} className="absolute top-0 left-0" onClick={addPoint}>
        <path d={pointsToPath(automation.points)} stroke="currentColor" strokeWidth="2" fill="none" className="text-yellow-400" />
        {automation.points.map((point, i) => (
          <circle
            key={i}
            cx={(point.time / 32) * width}
            cy={(1 - point.value) * height}
            r="4"
            fill="currentColor"
            className="text-yellow-400 cursor-pointer"
          />
        ))}
      </svg>
    </div>
  );
}
