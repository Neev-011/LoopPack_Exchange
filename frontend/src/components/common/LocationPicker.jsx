import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_PIN = { lat: 19.076, lng: 72.8777 };

const CITY_COORDINATES = {
  ahmedabad: [23.0225, 72.5714],
  bengaluru: [12.9716, 77.5946],
  bhubaneswar: [20.2961, 85.8245],
  chandigarh: [30.7333, 76.7794],
  chennai: [13.0827, 80.2707],
  delhi: [28.6139, 77.209],
  gandhinagar: [23.2156, 72.6369],
  gurugram: [28.4595, 77.0266],
  hyderabad: [17.385, 78.4867],
  indore: [22.7196, 75.8577],
  jaipur: [26.9124, 75.7873],
  kolkata: [22.5726, 88.3639],
  lucknow: [26.8467, 80.9462],
  mumbai: [19.076, 72.8777],
  morbi: [22.8173, 70.8377],
  nagpur: [21.1458, 79.0882],
  nashik: [19.9975, 73.7898],
  'navi mumbai': [19.033, 73.0297],
  patna: [25.5941, 85.1376],
  pune: [18.5204, 73.8567],
  rajkot: [22.3039, 70.8022],
  surat: [21.1702, 72.8311],
  thane: [19.2183, 72.9781],
  vadodara: [22.3072, 73.1812],
  varanasi: [25.3176, 82.9739],
  vijayawada: [16.5062, 80.648],
  visakhapatnam: [17.6868, 83.2185]
};

export default function LocationPicker({
  location,
  setLocation,
  coordinates,
  setCoordinates,
  status,
  onUseCurrentLocation,
  onSetLocation,
  onLocationChange,
  onAddressChange,
  locationLabel = 'Exact pickup / organization location',
  confirmLabel = 'Confirm pickup location',
  confirmedLabel = 'Pickup location confirmed',
  geocodeLocation,
  addressContent
}) {
  const [locationSet, setLocationSet] = useState(false);
  const [draftPin, setDraftPin] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const geocodeQuery = geocodeLocation ?? location;
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
      reverseGeocodePin(nextPin);
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

  useEffect(() => {
    const query = String(geocodeQuery || '').trim();
    if (query.length < 3) return undefined;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      const normalizedQuery = query.toLowerCase();
      const queryParts = normalizedQuery.split(',').map(part => part.trim()).filter(Boolean);
      const localCity = Object.entries(CITY_COORDINATES)
        .sort(([firstCity], [secondCity]) => secondCity.length - firstCity.length)
        .find(([city]) => queryParts.includes(city) || normalizedQuery.includes(`, ${city},`));
      if (localCity) {
        const [lat, lon] = localCity[1];
        setCoordinates({ lat, lon });
        if (mapInstance.current && markerInstance.current) {
          markerInstance.current.setLatLng([lat, lon]);
          mapInstance.current.setView([lat, lon], 13);
        }
      }
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'LoopPackExchange-LocationPicker/1.0' },
          signal: controller.signal
        });
        if (!response.ok) return;
        const result = (await response.json())[0];
        const lat = Number(result?.lat);
        const lon = Number(result?.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setCoordinates({ lat, lon });
          if (mapInstance.current && markerInstance.current) {
            markerInstance.current.setLatLng([lat, lon]);
            mapInstance.current.setView([lat, lon], 15);
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') console.warn('[LocationPicker] Address geocoding failed:', error.message);
      }
    }, 500);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [geocodeQuery]);

  const reverseGeocodePin = async pin => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${pin.lat}&lon=${pin.lng}`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'LoopPackExchange-LocationPicker/1.0' }
      });
      if (!response.ok) return;
      const result = await response.json();
      const address = result.address || {};
      if (onAddressChange) onAddressChange({
        state: address.state || '',
        city: address.city || address.town || address.village || address.municipality || '',
      });
      if (result.display_name && !onAddressChange) setLocation(result.display_name);
    } catch (error) {
      console.warn('[LocationPicker] Pin reverse geocoding failed:', error.message);
    }
  };

  const changeLocation = (change) => {
    setLocationSet(false);
    if (onLocationChange) onLocationChange();
    change();
  };

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <strong style={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={17} color="#059669" /> {locationLabel}
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
        <button type="button" className="btn-secondary" onClick={onUseCurrentLocation} disabled={!onUseCurrentLocation || status === 'loading'} style={{ padding: '7px 10px', fontSize: '0.8rem' }}>
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
        <MapPin size={15} /> {locationSet ? confirmedLabel : confirmLabel}
      </button>
    </div>
  );
}