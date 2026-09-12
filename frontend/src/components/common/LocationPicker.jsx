import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_PIN = { lat: 19.076, lng: 72.8777 };

export default function LocationPicker({
  location,
  setLocation,
  coordinates,
  setCoordinates,
  status,
  onUseCurrentLocation,
  onSetLocation,
  onLocationChange,
  addressContent
}) {
  const [locationSet, setLocationSet] = useState(false);
  const [draftPin, setDraftPin] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const hasCoordinates = Number.isFinite(Number(coordinates?.lat)) && Number.isFinite(Number(coordinates?.lon));
  const openStreetMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lon}#map=16/${coordinates.lat}/${coordinates.lon}`
    : 'https://www.openstreetmap.org/';

  useEffect(() => {
    const initialPin = hasCoordinates
      ? { lat: Number(coordinates.lat), lng: Number(coordinates.lon) }
      : DEFAULT_PIN;
    setDraftPin(initialPin);

    if (!mapRef.current || mapInstance.current) return undefined;
    const map = L.map(mapRef.current).setView([initialPin.lat, initialPin.lng], hasCoordinates ? 15 : 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const marker = L.marker([initialPin.lat, initialPin.lng], { draggable: true }).addTo(map);
    const updateDraft = latLng => {
      const nextPin = { lat: latLng.lat, lng: latLng.lng };
      setDraftPin(nextPin);
      setLocationSet(false);
    };
    map.on('click', event => {
      marker.setLatLng(event.latlng);
      updateDraft(event.latlng);
    });
    marker.on('dragend', event => updateDraft(event.target.getLatLng()));
    mapInstance.current = map;
    markerInstance.current = marker;

    return () => {
      map.remove();
      mapInstance.current = null;
      markerInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!coordinates || !markerInstance.current || !mapInstance.current || !hasCoordinates) return;
    const nextPin = { lat: Number(coordinates.lat), lng: Number(coordinates.lon) };
    setDraftPin(nextPin);
    markerInstance.current.setLatLng([nextPin.lat, nextPin.lng]);
    mapInstance.current.panTo([nextPin.lat, nextPin.lng]);
  }, [coordinates?.lat, coordinates?.lon]);

  const changeLocation = (change) => {
    setLocationSet(false);
    if (onLocationChange) onLocationChange();
    change();
  };

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <strong style={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={17} color="#059669" /> Exact pickup / organization location
        </strong>
        <a href={openStreetMapUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ textDecoration: 'none', padding: '7px 10px', fontSize: '0.8rem' }}>
          <ExternalLink size={14} /> Verify on OpenStreetMap
        </a>
      </div>
      <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '10px' }}>
        Click the exact place on the OpenStreetMap map or drag the pin. Then press the map button to copy the pin into latitude and longitude.
      </p>
      <div style={{ position: 'relative', height: '300px', borderRadius: '9px', overflow: 'hidden', border: '1px solid #CBD5E1', marginBottom: '10px' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        <button
          type="button"
          className="btn-primary"
          disabled={!draftPin}
          onClick={() => {
            const nextCoordinates = { lat: draftPin.lat, lon: draftPin.lng };
            setCoordinates(nextCoordinates);
            if (!location.trim()) setLocation(`Pinned location (${draftPin.lat.toFixed(5)}, ${draftPin.lng.toFixed(5)})`);
            setLocationSet(true);
            if (onSetLocation) onSetLocation();
          }}
          style={{ position: 'absolute', left: '50%', bottom: '14px', transform: 'translateX(-50%)', zIndex: 500, whiteSpace: 'nowrap', boxShadow: '0 3px 12px rgba(0,0,0,0.25)' }}
        >
          <MapPin size={15} /> Set selected pin location
        </button>
      </div>
      {addressContent || (
        <input
          type="text"
          value={location}
          onChange={event => changeLocation(() => setLocation(event.target.value))}
          placeholder="Warehouse, office, or organization address"
          style={{ width: '100%', padding: '10px', borderRadius: '7px', border: '1px solid #CBD5E1', marginBottom: '9px' }}
          required
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
        <input
          type="number"
          step="any"
          value={coordinates?.lat ?? ''}
          onChange={event => changeLocation(() => setCoordinates({ ...coordinates, lat: event.target.value }))}
          placeholder="Latitude"
          aria-label="Latitude"
          style={{ width: '100%', padding: '10px', borderRadius: '7px', border: '1px solid #CBD5E1' }}
          required
        />
        <input
          type="number"
          step="any"
          value={coordinates?.lon ?? ''}
          onChange={event => changeLocation(() => setCoordinates({ ...coordinates, lon: event.target.value }))}
          placeholder="Longitude"
          aria-label="Longitude"
          style={{ width: '100%', padding: '10px', borderRadius: '7px', border: '1px solid #CBD5E1' }}
          required
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
        <span style={{ color: hasCoordinates ? '#047857' : '#9A3412', fontSize: '0.8rem' }}>
          {hasCoordinates ? `Tracking point: ${Number(coordinates.lat).toFixed(5)}, ${Number(coordinates.lon).toFixed(5)}` : 'Coordinates are required for proximity tracking.'}
        </span>
        <button type="button" className="btn-secondary" onClick={onUseCurrentLocation} disabled={status === 'loading'} style={{ padding: '7px 10px', fontSize: '0.8rem' }}>
          <Navigation size={14} /> {status === 'loading' ? 'Locating...' : 'Use my current location'}
        </button>
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={!hasCoordinates || !location.trim()}
        onClick={() => {
          setLocationSet(true);
          if (onSetLocation) onSetLocation();
        }}
        style={{ width: '100%', justifyContent: 'center', marginTop: '12px', padding: '9px' }}
      >
        <MapPin size={15} /> {locationSet ? 'Pickup location confirmed' : 'Confirm pickup location'}
      </button>
    </div>
  );
}