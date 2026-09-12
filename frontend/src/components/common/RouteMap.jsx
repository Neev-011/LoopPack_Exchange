import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function RouteMap({ stops }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!mapRef.current || !stops?.every(stop => Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lon)))) {
      setStatus('missing');
      return undefined;
    }

    const map = L.map(mapRef.current).setView([stops[0].lat, stops[0].lon], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const bounds = L.latLngBounds([]);
    stops.forEach((stop, index) => {
      const marker = L.marker([stop.lat, stop.lon]).addTo(map).bindPopup(`<strong>${index + 1}. ${stop.label}</strong><br />${stop.location || ''}`);
      if (index === 0) marker.openPopup();
      bounds.extend([stop.lat, stop.lon]);
    });
    map.fitBounds(bounds, { padding: [30, 30] });

    const coordinates = stops.map(stop => `${stop.lon},${stop.lat}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`)
      .then(response => response.json())
      .then(data => {
        if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('Route unavailable');
        L.geoJSON(data.routes[0].geometry, { style: { color: '#047857', weight: 5, opacity: 0.85 } }).addTo(map);
        setStatus('ready');
      })
      .catch(() => setStatus('fallback'));

    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [stops]);

  if (status === 'missing') return <p style={{ color: '#9A3412', fontSize: '0.84rem' }}>Route coordinates are not available for this order.</p>;

  return (
    <div>
      <div ref={mapRef} style={{ height: '280px', width: '100%', borderRadius: '9px', overflow: 'hidden', border: '1px solid #CBD5E1' }} />
      <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '8px' }}>
        {status === 'loading' ? 'Calculating driving path...' : status === 'fallback' ? 'Stops are shown, but the driving path could not be loaded.' : 'Driving path: logistics → seller pickup → buyer delivery.'}
      </div>
    </div>
  );
}
