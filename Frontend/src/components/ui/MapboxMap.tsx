import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
}

interface MapboxMapProps {
  center?: { latitude: number; longitude: number };
  markers?: MapMarker[];
  zoom?: number;
  height?: string;
  className?: string;
}

// Mapbox access token must be set via VITE_MAPBOX_TOKEN in .env
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export function MapboxMap({
  center,
  markers = [],
  zoom = 12,
  height = '300px',
  className = ''
}: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapboxgl.accessToken) return;
    if (!mapContainerRef.current) return;

    // Initialize map once
    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: center ? [center.longitude, center.latitude] : [0, 0],
        zoom
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Update center
    if (center) {
      mapRef.current.setCenter([center.longitude, center.latitude]);
    }
  }, [center]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((marker) => {
      const el = document.createElement('div');
      el.className = 'mapbox-marker';
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = marker.color || '#3b82f6';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 6px rgba(0,0,0,0.2)';

      const mapMarker = new mapboxgl.Marker(el)
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<strong>${marker.title || 'Location'}</strong><br/>${marker.description || ''}`
          )
        )
        .addTo(mapRef.current as mapboxgl.Map);

      markersRef.current.push(mapMarker);
    });
  }, [markers]);

  if (!mapboxgl.accessToken) {
    return (
      <div className={`${className} w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500`}>
        Mapbox token missing. Set <code>VITE_MAPBOX_TOKEN</code> in your environment to enable maps.
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={className}
      style={{ width: '100%', height }}
    />
  );
}
