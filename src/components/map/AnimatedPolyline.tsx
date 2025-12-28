/**
 * AnimatedPolyline Component
 * 
 * Renders an animated dashed polyline for dispatch routes
 * The dashes animate to show movement/flow direction
 */

import { useEffect, useRef } from 'react';
import { Polyline } from 'react-leaflet';
import { LatLngExpression, PathOptions } from 'leaflet';

interface AnimatedPolylineProps {
  positions: LatLngExpression[] | [number, number][];
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
  animationSpeed?: number; // pixels per second
}

export default function AnimatedPolyline({
  positions,
  color = '#000000',
  weight = 4,
  opacity = 0.8,
  dashArray = '10, 10',
  animationSpeed = 20,
}: AnimatedPolylineProps) {
  const polylineRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const dashOffsetRef = useRef(0);

  useEffect(() => {
    if (!polylineRef.current) return;

    const animate = () => {
      // Increment dash offset to create animation
      dashOffsetRef.current = (dashOffsetRef.current + animationSpeed / 60) % 20;
      
      const element = polylineRef.current?.getElement?.();
      if (element) {
        element.style.strokeDashoffset = `-${dashOffsetRef.current}px`;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationSpeed]);

  const pathOptions: PathOptions = {
    color,
    weight,
    opacity,
    dashArray,
  };

  return (
    <Polyline
      ref={polylineRef}
      positions={positions as LatLngExpression[]}
      pathOptions={pathOptions}
    />
  );
}
