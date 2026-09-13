import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin, Package, ShieldCheck, Leaf, ArrowRight, Truck, Navigation,
  CheckCircle, RefreshCw, Check, X, Building2, Calendar, FileText, Info, Award, DollarSign, MessageSquare
  , Sparkles, UserCheck
} from 'lucide-react';
import { calculateAvoidedCarbon } from '../utils/carbonEngine';
import { useAuth } from '../context/AuthContext';
import { calculateHaversineDistance } from '../utils/spatialMath';
import LocationPicker from '../components/common/LocationPicker';
import RouteMap from '../components/common/RouteMap';
import { materialWeightTons } from '../services/logisticsMatchingService';
import AddressForm from '../components/common/AddressForm';

const API_BASE_URL = 'http://localhost:5001/api/v1';
const HIDDEN_SELLER_EMAILS = new Set(['jeel@gmail.com', 'n@gmail.com']);
const HIDDEN_SELLER_USERNAMES = new Set(['jeel']);

function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

const LOGISTICS_HUB_COORDINATES = [
  { match: 'mahape', lat: 19.115, lon: 73.015 },
  { match: 'navi mumbai', lat: 19.033, lon: 73.03 },
  { match: 'thane', lat: 19.2183, lon: 72.9781 },
  { match: 'bhiwandi', lat: 19.2968, lon: 73.0631 },
  { match: 'taloja', lat: 19.0622, lon: 73.1114 },
  { match: 'goregaon', lat: 19.1663, lon: 72.8526 },
  { match: 'kurla', lat: 19.065, lon: 72.879 },
  { match: 'mumbai', lat: 19.076, lon: 72.8777 }
];

function getHubCoordinates(location = '') {
  const normalized = location.toLowerCase();
  return LOGISTICS_HUB_COORDINATES.find(hub => normalized.includes(hub.match));
}

function getPoint(item, fallbackLocation = '') {
  if (Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon))) {
    return { lat: Number(item.lat), lon: Number(item.lon) };
  }
  const hub = getHubCoordinates(item?.location || item?.originCity || fallbackLocation);
  return hub ? { lat: hub.lat, lon: hub.lon } : { lat: 19.076, lon: 72.8777 };
}

function formatAddress(address) {
  return [address?.streetArea, address?.landmark, address?.city, address?.state].filter(Boolean).join(', ');
}

function normalizeListing(listing) {
  const isVerified = listing.aiVerified !== undefined && listing.aiVerified !== null
    ? Boolean(listing.aiVerified)
    : (listing.ai_verified !== undefined && listing.ai_verified !== null ? Boolean(listing.ai_verified) : false);

  return {
    ...listing,
    createdBy: listing.createdBy || listing.created_by || 'marketplace_supplier',
    companyName: listing.companyName || listing.company_name || 'Marketplace Supplier',
    aiVerified: isVerified,
    verificationStatus: listing.verificationStatus || listing.verification_status || (isVerified ? 'AI Verified' : 'Seller Direct')
  };
}

function isVisibleListing(listing) {
  const email = String(listing.createdByEmail || listing.created_by_email || '').trim().toLowerCase();
  const username = String(listing.createdBy || listing.created_by || '').trim().toLowerCase();
  return !HIDDEN_SELLER_EMAILS.has(email) && !HIDDEN_SELLER_USERNAMES.has(username);
}

function formatVehicleAvailability(date, time) {
  if (!date) return time || 'Date to be confirmed';
  const parsedDate = new Date(`${date}T00:00:00`);
  const formattedDate = Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!time) return formattedDate;
  const [hours, minutes] = String(time).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return `${formattedDate} · ${time}`;
  const formattedTime = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${formattedDate} · ${formattedTime}`;
}

export default function MarketplacePage() {
  const { currentUser } = useAuth();
  const [dbListings, setDbListings] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [maxRadius, setMaxRadius] = useState(25);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [logisticsVehicles, setLogisticsVehicles] = useState([]);
  const [matchedLogisticsVehicles, setMatchedLogisticsVehicles] = useState([]);
  const [claimedItem, setClaimedItem] = useState(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [buyerCoordinates, setBuyerCoordinates] = useState(null);
  const [buyerLocationSet, setBuyerLocationSet] = useState(false);
  const [buyerLocationStatus, setBuyerLocationStatus] = useState('idle');
  const [orderDetails, setOrderDetails] = useState({ quantity: '', destination: '', deliveryAddress: { state: '', city: '', streetArea: '', landmark: '' }, pickupDate: '', pickupTime: '09:00', paymentMethod: 'Cash on delivery' });
  const [orderError, setOrderError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [transportSearchState, setTransportSearchState] = useState('idle');
  const [transportSearchError, setTransportSearchError] = useState('');
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [nearbyLogistics, setNearbyLogistics] = useState([]);

  const [refreshing, setRefreshing] = useState(false);

  const isOwnListing = selectedProduct
    && currentUser?.username
    && selectedProduct.createdBy === currentUser.username;

  useEffect(() => {
    setInquiryMessage('');
    setInquirySent(false);
    setOrderError('');
    setTransportSearchState('idle');
    setTransportSearchError('');
    setMatchedLogisticsVehicles([]);
    setOrderDetails({
      quantity: selectedProduct?.quantity || '',
      destination: '',
      deliveryAddress: { state: '', city: '', streetArea: '', landmark: '' },
      paymentMethod: 'Cash on delivery'
      ,pickupDate: getTodayDate()
      ,pickupTime: '09:00'
    });
    setBuyerCoordinates(null);
    setBuyerLocationSet(false);
    setBuyerLocationStatus('idle');
    setLogisticsVehicles([]);
    fetch(`${API_BASE_URL}/trucks`).then(response => response.ok ? response.json() : Promise.reject(new Error('Could not load logistics vehicles.'))).then(result => setLogisticsVehicles(Array.isArray(result.data) ? result.data : [])).catch(() => setLogisticsVehicles([]));
  }, [selectedProduct?.id]);

  const useBuyerLocation = () => {
    if (!navigator.geolocation) {
      setBuyerLocationStatus('unsupported');
      return;
    }
    setBuyerLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      position => {
        setBuyerCoordinates({ lat: position.coords.latitude, lon: position.coords.longitude });
        setBuyerLocationStatus('ready');
        setBuyerLocationSet(false);
      },
      () => setBuyerLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };
  const selectedLogisticsEstimate = useMemo(() => {
    const candidate = matchedLogisticsVehicles[0];
    if (!candidate) return null;
    return {
      distanceKm: candidate.combinedDistanceKm ?? candidate.baseDistanceKm ?? null,
      transportCost: candidate.estimatedCost ?? null,
      detourKm: candidate.detourKm ?? 0,
      detourPercent: candidate.detourPercent ?? 0
    };
  }, [matchedLogisticsVehicles]);

  useEffect(() => {
    if (!selectedProduct) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
    };
  }, [selectedProduct]);

  // Fetch live database listings from Neon PostgreSQL with PostGIS Spatial Distance Radius
  const fetchListings = async (radius = maxRadius, location = deviceLocation) => {
    setRefreshing(true);
    try {
      const lat = location?.lat ?? 19.076;
      const lon = location?.lon ?? 72.877;
      const radiusQuery = Number(radius) >= 100 ? 'all' : String(radius);
      const res = await fetch(`${API_BASE_URL}/listings?radiusKm=${radiusQuery}&lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setDbListings(json.data.map(normalizeListing).filter(isVisibleListing));
        }
      }
    } catch (err) {
      console.warn('Backend fetch offline, showing local listings:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListings(maxRadius);
  }, [maxRadius, deviceLocation]);

  useEffect(() => {
    const refreshListings = () => fetchListings(maxRadius, deviceLocation);
    window.addEventListener('looppack:listing-created', refreshListings);
    return () => window.removeEventListener('looppack:listing-created', refreshListings);
  }, [maxRadius, deviceLocation]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      position => {
        const location = { lat: position.coords.latitude, lon: position.coords.longitude };
        setDeviceLocation(location);
        setLocationStatus('ready');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    if (!deviceLocation) {
      setNearbyLogistics([]);
      return;
    }
    fetch(`${API_BASE_URL}/trucks`)
      .then(response => response.json())
      .then(json => {
        const matches = (json.data || [])
          .map(truck => {
            if (Number.isFinite(Number(truck.lat)) && Number.isFinite(Number(truck.lon))) {
              return { ...truck, distanceKm: calculateHaversineDistance(deviceLocation.lat, deviceLocation.lon, Number(truck.lat), Number(truck.lon)) };
            }
            const hub = getHubCoordinates(truck.originCity);
            if (!hub) return null;
            return { ...truck, distanceKm: calculateHaversineDistance(deviceLocation.lat, deviceLocation.lon, hub.lat, hub.lon) };
          })
          .filter(Boolean)
          .filter(truck => truck.distanceKm <= maxRadius)
          .sort((a, b) => a.distanceKm - b.distanceKm);
        setNearbyLogistics(matches);
      })
      .catch(() => setNearbyLogistics([]));
  }, [deviceLocation, maxRadius]);

  const filteredListings = useMemo(() => {
    return dbListings.filter(item => {
      const matchType = filterType === 'all' || item.materialType === filterType;
      const itemDist = typeof item.distanceKm === 'number' ? item.distanceKm : 5;
      const matchRadius = maxRadius >= 100 || itemDist <= maxRadius;
      return matchType && matchRadius;
    });
  }, [dbListings, filterType, maxRadius]);

  const handleConfirmReserve = async (event) => {
    event.preventDefault();
    if (!currentUser) {
      setOrderError('Please sign in before reserving material.');
      return;
    }
    if (!['supplier', 'buyer'].includes(currentUser.role)) {
      setOrderError('Only Buyer / Seller Organization accounts can purchase materials.');
      return;
    }
    const selectedTruck = matchedLogisticsVehicles[0];
    if (!selectedTruck) {
      setOrderError('No compatible transportation is available for this shipment.');
      return;
    }
    if (!buyerLocationSet || !buyerCoordinates) {
      setOrderError('Set and confirm your delivery location before purchasing.');
      return;
    }
    setOrdering(true);
    setOrderError('');
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: selectedProduct.id,
          buyer: {
            id: currentUser.id,
            username: currentUser.username,
            companyName: currentUser.companyName,
            email: currentUser.email,
            role: currentUser.role
          },
          quantity: Number(orderDetails.quantity),
          destination: orderDetails.destination,
          buyerLocation: buyerCoordinates,
          paymentMethod: orderDetails.paymentMethod,
          pickupDate: orderDetails.pickupDate,
          pickupTime: orderDetails.pickupTime,
          deliveryAddress: orderDetails.deliveryAddress,
          logisticsVehicle: {
            ...selectedTruck,
            estimate: selectedLogisticsEstimate
          },
          logisticsCandidates: matchedLogisticsVehicles.map(candidate => ({
            ...candidate,
            estimate: {
              distanceKm: candidate.combinedDistanceKm ?? candidate.baseDistanceKm,
              transportCost: candidate.estimatedCost,
              detourKm: candidate.detourKm,
              detourPercent: candidate.detourPercent
            }
          }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not complete reservation.');
      setDbListings(current => current.filter(item => String(item.id) !== String(selectedProduct.id)));
      setSelectedProduct(null);
      setClaimedItem({ ...selectedProduct, order: data.data, selectedTruck, buyerLocation: buyerCoordinates });
    } catch (error) {
      setOrderError(error instanceof TypeError && error.message === 'Failed to fetch'
        ? 'Could not reach the reservation server. Make sure the backend is running on http://localhost:5001, then try again.'
        : error.message || 'Could not complete reservation.');
    } finally {
      setOrdering(false);
    }
  };

  const handleFindTransportation = async () => {
    if (!selectedProduct || !orderDetails.destination.trim() || !orderDetails.quantity) return;
    if (!buyerLocationSet || !buyerCoordinates) {
      setTransportSearchError('Set and confirm your delivery location before finding transportation.');
      return;
    }
    if (!Number.isFinite(Number(selectedProduct.lat)) || !Number.isFinite(Number(selectedProduct.lon))) {
      setTransportSearchError('The seller pickup coordinates are unavailable for route matching.');
      setTransportSearchState('error');
      return;
    }
    setTransportSearchState('loading');
    setTransportSearchError('');
    setOrderError('');
    try {
      const response = await fetch(`${API_BASE_URL}/trucks/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicles: logisticsVehicles.map(vehicle => ({
            ...vehicle,
            origin: vehicle.originCoordinates || null,
            destination: vehicle.destinationCoordinates
          })),
          shipment: {
            pickupCity: selectedProduct.location,
            deliveryCity: orderDetails.deliveryAddress.city || orderDetails.destination,
            pickup: { lat: Number(selectedProduct.lat), lon: Number(selectedProduct.lon) },
            delivery: { lat: Number(buyerCoordinates.lat), lon: Number(buyerCoordinates.lon) },
            requiredCapacityTons: materialWeightTons(
              Number(orderDetails.quantity),
              selectedProduct.unit
            ),
            requestedDate: orderDetails.pickupDate,
            requestedTime: orderDetails.pickupTime
          }
        })
      });
      if (!response.ok) throw new Error(`Matching request failed with status ${response.status}.`);
      const result = await response.json();
      const candidates = Array.isArray(result.data)
        ? result.data
          .map(candidate => candidate?.vehicle ? { ...candidate.vehicle, ...candidate } : candidate)
          .filter(candidate => candidate?.id && candidate?.truckName)
        : [];
      setMatchedLogisticsVehicles(candidates);
      setTransportSearchState(candidates.length ? 'success' : 'no-match');
    } catch (error) {
      console.error('[Marketplace logistics matching]', error);
      setMatchedLogisticsVehicles([]);
      setTransportSearchState('error');
      setTransportSearchError('We could not calculate available transport options right now. Please try again.');
    }
  };

  const sendInquiry = async () => {
    if (!currentUser) {
      setClaimedItem({ title: 'Please sign in before contacting a seller.', location: 'B2B Account' });
      return;
    }
    if (!['supplier', 'buyer'].includes(currentUser.role)) {
      setClaimedItem({ title: 'Only Buyer / Seller Organization accounts can contact sellers.', location: 'Inquiry' });
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing: selectedProduct,
          userId: currentUser.id,
          username: currentUser.username,
          companyName: currentUser.companyName,
          role: currentUser.role,
          message: inquiryMessage,
          quantity: selectedProduct.quantity
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send inquiry.');
      setInquirySent(true);
      setInquiryMessage('');
    } catch (error) {
      setClaimedItem({ title: error.message, location: 'Inquiry' });
    }
  };

  return (
    <div>
      {/* Clean Header Bar */}
      <div className="marketplace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div className="marketplace-header-copy">
          <h2 style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: '800' }}>
            Geo-Proximity B2B Marketplace 📍
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
            Click any product card to view full specifications, photos, and reserve pickup.
          </p>
        </div>

        {/* Search Radius Slider & Distance Preset Buttons */}
        <div className="marketplace-radius-controls" style={{
          background: 'white',
          padding: '10px 16px',
          borderRadius: '12px',
          border: '1px solid #CBD5E1',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          flexWrap: 'wrap',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} color="#10B981" />
            <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Distance Radius: <strong style={{ color: '#059669', fontSize: '0.92rem', minWidth: '112px', display: 'inline-block' }}>{maxRadius >= 100 ? '100+ km (All)' : `${maxRadius} km`}</strong>
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={maxRadius}
            onChange={(e) => setMaxRadius(Number(e.target.value))}
            style={{ width: '130px', accentColor: '#10B981', cursor: 'pointer' }}
          />

          <div style={{ display: 'flex', gap: '4px' }}>
            {[5, 15, 25, 50, 100].map((r) => (
              <button
                key={r}
                onClick={() => setMaxRadius(r)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: maxRadius === r ? '1px solid #10B981' : '1px solid #E2E8F0',
                  background: maxRadius === r ? '#ECFDF5' : '#F8FAFC',
                  color: maxRadius === r ? '#047857' : '#64748B',
                  fontWeight: '700',
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                {r >= 100 ? 'All' : `${r}km`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Navigation size={20} color="#047857" />
            <div>
              <strong style={{ color: '#14532D' }}>Find nearby logistics</strong>
              <div style={{ color: '#166534', fontSize: '0.82rem' }}>
                {locationStatus === 'ready' ? 'Using your device location to match nearby carriers.' : 'Share your location to see available carriers near you.'}
              </div>
            </div>
          </div>
          <button className="btn-secondary" onClick={useMyLocation} disabled={locationStatus === 'loading'}>
            <Navigation size={16} /> {locationStatus === 'loading' ? 'Locating...' : locationStatus === 'ready' ? 'Refresh location' : 'Use my location'}
          </button>
        </div>
        {locationStatus === 'denied' && <p style={{ color: '#B45309', fontSize: '0.82rem', margin: '10px 0 0' }}>Location permission was denied. Enable it in your browser settings to find nearby logistics.</p>}
        {locationStatus === 'unsupported' && <p style={{ color: '#B45309', fontSize: '0.82rem', margin: '10px 0 0' }}>This browser does not provide device location. You can still use the marketplace radius filter.</p>}
        {locationStatus === 'ready' && nearbyLogistics.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ color: '#166534', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Nearby available logistics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '8px' }}>
              {nearbyLogistics.map(truck => (
                <div key={truck.id} style={{ background: 'white', border: '1px solid #D1FAE5', borderRadius: '8px', padding: '10px 12px' }}>
                  <strong style={{ color: '#0F172A', fontSize: '0.86rem' }}>{truck.truckName}</strong>
                  <div style={{ color: '#047857', fontSize: '0.78rem', marginTop: '3px' }}>{truck.companyName} · {truck.distanceKm} km away</div>
                  <div style={{ color: '#64748B', fontSize: '0.76rem', marginTop: '3px' }}>{truck.originCity} → {truck.destinationCity} · {truck.status || 'available'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          className={`btn-secondary ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
          style={{ background: filterType === 'all' ? '#0F5132' : 'white', color: filterType === 'all' ? 'white' : '#475569' }}
        >
          All Materials ({dbListings.length})
        </button>
        <button
          className={`btn-secondary ${filterType === 'cardboard' ? 'active' : ''}`}
          onClick={() => setFilterType('cardboard')}
          style={{ background: filterType === 'cardboard' ? '#0F5132' : 'white', color: filterType === 'cardboard' ? 'white' : '#475569' }}
        >
          📦 Cardboard
        </button>
        <button
          className={`btn-secondary ${filterType === 'pallet' ? 'active' : ''}`}
          onClick={() => setFilterType('pallet')}
          style={{ background: filterType === 'pallet' ? '#0F5132' : 'white', color: filterType === 'pallet' ? 'white' : '#475569' }}
        >
          🪵 Wooden Pallets
        </button>
        <button
          className={`btn-secondary ${filterType === 'hdpe' ? 'active' : ''}`}
          onClick={() => setFilterType('hdpe')}
          style={{ background: filterType === 'hdpe' ? '#0F5132' : 'white', color: filterType === 'hdpe' ? 'white' : '#475569' }}
        >
          🛢️ HDPE Drums
        </button>
        <button
          className={`btn-secondary ${filterType === 'ldpe' ? 'active' : ''}`}
          onClick={() => setFilterType('ldpe')}
          style={{ background: filterType === 'ldpe' ? '#0F5132' : 'white', color: filterType === 'ldpe' ? 'white' : '#475569' }}
        >
          🌀 LDPE Stretch Wrap
        </button>
      </div>

      {/* Reservation Confirmation Banner */}
      {claimedItem && (
        <div style={{
          background: '#0F5132',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 6px 20px rgba(15,81,50,0.25)'
        }}>
          <CheckCircle size={22} color="#34D399" />
          <div>
            <div style={{ fontWeight: '700', fontSize: '1rem' }}>Pickup Order Reserved!</div>
            <div style={{ fontSize: '0.85rem', color: '#A7F3D0' }}>
              Transportation request pending with {claimedItem.selectedTruck.companyName || 'the logistics partner'} for {claimedItem.selectedTruck.truckName}.
              {' '}The provider must accept the request before transport is confirmed.
            </div>
            <div style={{ marginTop: '14px', background: 'white', padding: '12px', borderRadius: '9px', color: '#0F172A' }}>
              <strong style={{ display: 'block', marginBottom: '8px' }}>Live route plan</strong>
              <RouteMap stops={[
                { ...getPoint(claimedItem.selectedTruck, claimedItem.selectedTruck.returnRoute), label: 'Logistics start', location: claimedItem.selectedTruck.returnRoute },
                { ...getPoint(claimedItem, claimedItem.location), label: 'Seller pickup', location: claimedItem.location },
                { lat: Number(claimedItem.buyerLocation.lat), lon: Number(claimedItem.buyerLocation.lon), label: 'Buyer delivery', location: claimedItem.order.destination }
              ]} />
            </div>
          </div>
        </div>
      )}

      {/* Full Width Material Cards Grid */}
      {filteredListings.length === 0 ? (
        <div style={{ background: 'white', padding: '48px 24px', borderRadius: '14px', textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <Package size={48} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
            No material lots found within {maxRadius >= 100 ? '100+ km' : `${maxRadius} km`}
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto 20px' }}>
            There are currently no circular packaging listings matching your criteria within this distance radius.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setMaxRadius(50)}
              className="btn-primary"
              style={{ padding: '9px 18px', fontSize: '0.88rem' }}
            >
              Expand Search Radius to 50 km
            </button>
            <button
              onClick={() => setMaxRadius(100)}
              className="btn-secondary"
              style={{ padding: '9px 18px', fontSize: '0.88rem' }}
            >
              Show All Locations (100+ km)
            </button>
          </div>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredListings.map(item => {
            const carbon = calculateAvoidedCarbon(item.materialType || 'cardboard', item.quantity || 100, item.distanceKm || 5, item.grade || 'A');

            return (
              <div
                key={item.id}
                className="item-card"
                onClick={() => setSelectedProduct(item)}
                style={{ cursor: 'pointer' }}
              >
                {/* Uploaded Product Photo */}
                <div className="card-header-img" style={{ position: 'relative' }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Verification Status Badge Tag */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 10,
                    background: item.aiVerified === false || item.verificationStatus === 'Seller Direct' ? '#FEF3C7' : '#ECFDF5',
                    color: item.aiVerified === false || item.verificationStatus === 'Seller Direct' ? '#92400E' : '#047857',
                    border: item.aiVerified === false || item.verificationStatus === 'Seller Direct' ? '1px solid #FCD34D' : '1px solid #A7F3D0',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                  }}>
                    {item.aiVerified === false || item.verificationStatus === 'Seller Direct' ? (
                      <><UserCheck size={14} color="#D97706" /> Seller Direct</>
                    ) : (
                      <><Sparkles size={14} color="#059669" /> AI Verified</>
                    )}
                  </div>

                  <div className={`card-badge grade-badge-${(item.grade || 'A').toLowerCase()}`}>
                    Grade {item.grade || 'A'} • {item.grade === 'A' ? 'Direct Reuse' : 'Recycle Ready'}
                  </div>
                </div>

                {/* Useful Product Information */}
                <div className="card-body">
                  <div className="card-title">{item.title}</div>
                  <div className="card-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="#10B981" /> {item.distanceKm || 5} km away ({item.location || 'Warehouse Zone'})
                    </span>
                  </div>

                  {/* Seller & Listing Date Metadata */}
                  <div style={{ fontSize: '0.82rem', color: '#64748B', margin: '6px 0 10px', display: 'flex', flexDirection: 'column', gap: '3px', background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                    <span style={{ fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Building2 size={13} color="#3B82F6" /> {item.companyName || 'B2B Partner'} <span style={{ color: '#059669', fontWeight: '600' }}>(@{item.createdBy})</span>
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ color: '#2563EB', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✉️ {item.createdByEmail || `contact@${item.createdBy}.com`}
                      </span>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {new Date(item.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Verification Method Status Badge */}
                  <div style={{
                    margin: '6px 0 10px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: item.aiVerified === false || item.verificationStatus === 'Seller Direct' ? '#FFFBEB' : '#F0FDF4',
                    border: item.aiVerified === false || item.verificationStatus === 'Seller Direct' ? '1px solid #FDE68A' : '1px solid #BBF7D0',
                    color: item.aiVerified === false || item.verificationStatus === 'Seller Direct' ? '#92400E' : '#047857'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.aiVerified === false || item.verificationStatus === 'Seller Direct' ? (
                        <><UserCheck size={14} color="#D97706" /> Seller Direct Listing</>
                      ) : (
                        <><Sparkles size={14} color="#059669" /> AI Vision Verified</>
                      )}
                    </span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.aiVerified === false || item.verificationStatus === 'Seller Direct' ? 'Seller Certified' : 'Verified AI'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '12px' }}>
                    <strong>Quantity:</strong> {item.quantity} {item.unit || 'units'}
                  </div>

                  {/* Avoided Carbon Tag */}
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.82rem', color: '#047857' }}>
                    <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Leaf size={14} /> Avoided Carbon: {carbon.netCO2eAvoided} kg CO₂e
                    </div>
                  </div>

                  <div className="card-footer">
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '600' }}>
                        {item.isFree || item.price === 0 ? 'Zero-Cost Clearance' : 'Asking Price'}
                      </div>
                      <div className="card-price">
                        {item.isFree || item.price === 0 ? 'FREE' : `₹${item.price} / ${item.unit || 'unit'}`}
                      </div>
                    </div>

                    <button
                      className="btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(item);
                      }}
                    >
                      View Details & Reserve <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED PRODUCT SPECIFICATION & B2B CLAIM MODAL */}
      {selectedProduct && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
          overscrollBehavior: 'none'
        }}
        onClick={() => setSelectedProduct(null)}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            border: '1px solid #E2E8F0'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Media */}
            <div style={{ position: 'relative', height: '180px', background: '#0F172A' }}>
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>

              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: selectedProduct.grade === 'A' ? '#059669' : '#D97706',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '800'
              }}>
                Grade {selectedProduct.grade || 'A'} Verified • {selectedProduct.grade === 'A' ? 'Direct B2B Reuse' : 'Recycling Stream'}
              </div>
            </div>

            {/* Modal Body Specs */}
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                {selectedProduct.title}
              </h3>

              <div style={{ display: 'flex', gap: '12px', color: '#64748B', fontSize: '0.86rem', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={16} color="#10B981" /> {selectedProduct.distanceKm || 5} km away ({selectedProduct.location})
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package size={16} color="#3B82F6" /> {selectedProduct.quantity} {selectedProduct.unit || 'units'}
                </span>
              </div>

              {/* Price & Value Highlight Box */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>Asking Price</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F5132' }}>
                    {selectedProduct.isFree || selectedProduct.price === 0 ? 'FREE CLEARANCE' : `₹${selectedProduct.price} / ${selectedProduct.unit || 'unit'}`}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>Total Lot Price</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A' }}>
                    {selectedProduct.isFree || selectedProduct.price === 0 ? '₹0' : `₹${(selectedProduct.price * selectedProduct.quantity).toLocaleString()}`}
                  </div>
                </div>
              </div>

              {/* Avoided Carbon Breakdown Box */}
              {(() => {
                const carbon = calculateAvoidedCarbon(selectedProduct.materialType || 'cardboard', Number(orderDetails.quantity || selectedProduct.quantity || 100), selectedLogisticsEstimate?.distanceKm || selectedProduct.distanceKm || 5, selectedProduct.grade || 'A');
                return (
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px 12px', borderRadius: '9px', marginBottom: '14px', color: '#047857' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <Leaf size={16} /> Estimated CO₂e Avoided: {carbon.netCO2eAvoided} kg CO₂e
                    </div>
                    <div style={{ fontSize: '0.72rem', marginTop: '3px' }}>Estimated from the material&apos;s reuse/recycling pathway.</div>
                  </div>
                );
              })()}

              {/* Seller & Listing Origin Verification Box */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: '800', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} color="#10B981" /> Seller & Pickup
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', fontSize: '0.82rem', color: '#334155' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', fontWeight: '700' }}>Seller</span>
                    <strong style={{ color: '#0F172A' }}>{selectedProduct.companyName || 'B2B Circular Partner'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', fontWeight: '700' }}>Pickup</span>
                    <strong style={{ color: '#0F172A' }}>{selectedProduct.location}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', fontWeight: '700' }}>Listing Date</span>
                    <strong style={{ color: '#0F172A' }}>{new Date(selectedProduct.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', fontWeight: '700' }}>Seller status</span>
                    <strong style={{ color: '#047857' }}>Verified</strong>
                  </div>
                </div>

                {/* AI Scanner Verification Status Box inside Modal */}
                <div style={{
                  background: selectedProduct.aiVerified === false || selectedProduct.verificationStatus === 'Seller Direct' ? '#FFFBEB' : '#F0FDF4',
                  border: selectedProduct.aiVerified === false || selectedProduct.verificationStatus === 'Seller Direct' ? '1px solid #FDE68A' : '1px solid #BBF7D0',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {selectedProduct.aiVerified === false || selectedProduct.verificationStatus === 'Seller Direct' ? (
                    <>
                      <UserCheck size={20} color="#D97706" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: '800', color: '#92400E', fontSize: '0.86rem' }}>
                          👤 Seller Direct Listing (Unverified by AI)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#B45309' }}>
                          This lot was listed directly by the seller without using the automated AI vision scanner to verify category and grade.
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} color="#059669" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: '800', color: '#047857', fontSize: '0.86rem' }}>
                          ✨ AI Vision Verified Category & Quality Grade
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#065F46' }}>
                          Material specifications and quality grade were automatically analyzed and verified using AI visual recognition upon upload.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>Description</h4>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {selectedProduct.description || 'Verified circular packaging material lot ready for B2B pickup.'}
                </p>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 8px', color: '#0F172A' }}>
                  {isOwnListing ? 'Your posted material' : 'Contact the seller'}
                </h4>
                {isOwnListing ? (
                  <p style={{ color: '#64748B', margin: 0 }}>
                    This is your listing. Buyer inquiries and chat messages are available in My Materials.
                  </p>
                ) : inquirySent ? (
                  <p style={{ color: '#047857', margin: 0 }}>Inquiry sent. The seller can respond from their Relationship Hub.</p>
                ) : (
                  <>
                    <textarea rows="3" value={inquiryMessage} onChange={e => setInquiryMessage(e.target.value)} placeholder="Ask about availability, pickup timing, condition, or pricing..." style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #CBD5E1', marginBottom: 8 }} />
                    <button className="btn-secondary" onClick={sendInquiry} disabled={!inquiryMessage.trim()}><MessageSquare size={15} /> Send inquiry & open chat</button>
                  </>
                )}
              </div>

              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#14532D', margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Truck size={17} /> Finding Transportation
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#166534', margin: '0 0 12px' }}>
                  We will send a request to the best available option after you confirm the purchase.
                </p>
                <div style={{ display: 'grid', gap: '6px', background: 'white', border: '1px solid #D1FAE5', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', color: '#334155', fontSize: '0.82rem' }}>
                  <div><strong>Pickup:</strong> {selectedProduct.location || 'Seller location'}</div>
                  <div><strong>Delivery:</strong> {orderDetails.destination.trim() || 'Enter your delivery destination below'}</div>
                  <div><strong>Material:</strong> {selectedProduct.title || selectedProduct.materialType || 'Selected material'}</div>
                  <div><strong>Quantity:</strong> {orderDetails.quantity || selectedProduct.quantity} {selectedProduct.unit || 'units'}</div>
                </div>
                <label style={{ display: 'block', marginBottom: 10, color: '#334155', fontSize: 13 }}>
                  Pickup date
                  <input type="date" required value={orderDetails.pickupDate} onChange={event => {
                    setOrderDetails({ ...orderDetails, pickupDate: event.target.value });
                  }} style={{ width: '100%', padding: 9, marginTop: 4, border: '1px solid #CBD5E1', borderRadius: 6 }} />
                </label>
                <label style={{ display: 'block', marginBottom: 10, color: '#334155', fontSize: 13 }}>
                  Requested pickup time
                  <input type="time" required value={orderDetails.pickupTime} onChange={event => {
                    setOrderDetails({ ...orderDetails, pickupTime: event.target.value });
                  }} style={{ width: '100%', padding: 9, marginTop: 4, border: '1px solid #CBD5E1', borderRadius: 6 }} />
                </label>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleFindTransportation}
                  disabled={!orderDetails.destination.trim() || !orderDetails.quantity || transportSearchState === 'loading'}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                >
                  <Truck size={16} /> {transportSearchState === 'loading' ? 'Finding transportation...' : 'Find Transportation'}
                </button>
                {transportSearchState === 'error' && <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#991B1B' }}>{transportSearchError}</div>}
                {transportSearchState === 'no-match' && (
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#92400E' }}>
                    <strong>No suitable transportation found</strong><br />
                    No available vehicle currently matches this shipment&apos;s route, capacity, and schedule.
                  </div>
                )}
                {transportSearchState === 'success' && (
                  <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#14532D' }}>Recommended Transportation</div>
                    {matchedLogisticsVehicles.map((candidate, index) => (
                      <div key={candidate.id || index} style={{ background: 'white', border: `1px solid ${index === 0 ? '#059669' : '#D1FAE5'}`, borderRadius: '8px', padding: '10px 12px', color: '#334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#0F172A' }}>{candidate.truckName || candidate.vehicle?.truckName}</strong>
                          <span style={{ color: '#047857', fontWeight: '800', fontSize: '0.75rem' }}>
                            {index === 0 ? 'RECOMMENDED · ' : ''}{candidate.matchMode === 'DIRECT_MATCH' ? 'Direct Match' : 'On-Route Match'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                          {candidate.originCity} → {candidate.destinationCity}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '4px 12px', fontSize: '0.75rem', color: '#475569', marginTop: '8px' }}>
                          <span><strong>Registration:</strong> {candidate.vehicleReg || 'Not provided'}</span>
                          <span><strong>Capacity:</strong> {candidate.capacityTons ?? 'Not provided'} tons</span>
                          <span><strong>Driver:</strong> {candidate.driverName || 'Assigned carrier driver'}</span>
                          <span><strong>Contact:</strong> {candidate.driverPhone || candidate.companyEmail || 'Not provided'}</span>
                          <span><strong>Availability:</strong> {formatVehicleAvailability(candidate.availableDate, candidate.availableTime)}</span>
                          <span><strong>Rate:</strong> {candidate.ratePerKm != null ? `₹${Number(candidate.ratePerKm).toLocaleString('en-IN')} / km` : 'On request'}</span>
                        </div>
                        {candidate.matchMode === 'ON_ROUTE_MATCH' && (
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '5px' }}>
                            Base route: {candidate.baseDistanceKm} km · With shipment: {candidate.combinedDistanceKm} km · Detour: {candidate.detourKm} km ({candidate.detourPercent}%)
                          </div>
                        )}
                        {candidate.estimatedCost !== null && candidate.estimatedCost !== undefined && (
                          <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '5px' }}>
                            Estimated transport: <strong>₹{Number(candidate.estimatedCost).toLocaleString('en-IN')}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Checkout and reservation */}
              <form onSubmit={handleConfirmReserve} style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', padding: 16, borderRadius: 10, marginTop: 24 }}>
                <h4 style={{ margin: '0 0 12px', color: '#065F46' }}>Reserve Material</h4>
                {!currentUser && <p style={{ color: '#B45309', marginTop: 0 }}>Sign in to provide buyer and payment information.</p>}
                {orderError && <div style={{ color: '#991B1B', background: '#FEF2F2', padding: 8, borderRadius: 6, marginBottom: 10 }}>{orderError}</div>}
                <label style={{ display: 'block', marginBottom: 10, color: '#334155', fontSize: 13 }}>
                  Quantity ({selectedProduct.unit || 'units'})
                  <input type="number" min="1" max={selectedProduct.quantity} required value={orderDetails.quantity} onChange={event => setOrderDetails({ ...orderDetails, quantity: event.target.value })} style={{ width: '100%', padding: 9, marginTop: 4, border: '1px solid #CBD5E1', borderRadius: 6 }} />
                </label>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', marginBottom: 10 }}>
                  <h4 style={{ margin: '0 0 12px', color: '#0F172A' }}>Delivery Address</h4>
                  <AddressForm
                    value={orderDetails.deliveryAddress}
                    onChange={deliveryAddress => setOrderDetails({
                      ...orderDetails,
                      deliveryAddress,
                      destination: formatAddress(deliveryAddress)
                    })}
                    idPrefix="buyer-delivery-address"
                    compact
                    required
                  />
                </div>
                <LocationPicker
                  location={orderDetails.destination}
                  setLocation={destination => setOrderDetails({ ...orderDetails, destination })}
                  coordinates={buyerCoordinates}
                  setCoordinates={setBuyerCoordinates}
                  status={buyerLocationStatus}
                  onUseCurrentLocation={useBuyerLocation}
                  onSetLocation={() => setBuyerLocationSet(true)}
                  onLocationChange={() => setBuyerLocationSet(false)}
                  geocodeLocation={`${orderDetails.deliveryAddress.city}, ${orderDetails.deliveryAddress.state}`}
                  onAddressChange={deliveryAddress => setOrderDetails(current => ({
                    ...current,
                    deliveryAddress: { ...current.deliveryAddress, state: deliveryAddress.state, city: deliveryAddress.city },
                    destination: formatAddress({ ...current.deliveryAddress, ...deliveryAddress })
                  }))}
                />
                <label style={{ display: 'block', color: '#334155', fontSize: 13 }}>
                  Payment method
                  <select value={orderDetails.paymentMethod} onChange={event => setOrderDetails({ ...orderDetails, paymentMethod: event.target.value })} style={{ width: '100%', padding: 9, marginTop: 4, border: '1px solid #CBD5E1', borderRadius: 6 }}>
                    <option>Cash on delivery</option>
                    <option>Bank transfer</option>
                    <option>UPI</option>
                    <option>Pay on pickup</option>
                  </select>
                </label>
                <button className="btn-primary" type="submit" disabled={ordering || isOwnListing || transportSearchState !== 'success'} style={{ width: '100%', justifyContent: 'center', marginTop: 14, opacity: transportSearchState === 'success' ? 1 : 0.55 }}>
                  <Check size={18} /> {ordering ? 'Processing purchase...' : 'Confirm Purchase'}
                </button>
              </form>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '12px 20px', fontSize: '0.95rem' }}
                  onClick={() => setSelectedProduct(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
