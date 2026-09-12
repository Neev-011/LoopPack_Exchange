import React, { useState, useEffect } from 'react';
import {
  Truck,
  PlusCircle,
  CheckCircle,
  MapPin,
  ShieldCheck,
  Building2,
  Trash2,
  Lock,
  UserCheck,
  ArrowRight,
  RefreshCw,
  Phone,
  Calendar,
  DollarSign,
  AlertCircle,
  Navigation,
  Cpu,
  Route,
  Zap,
  Leaf
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LocationPicker from '../components/common/LocationPicker';
import AddressForm from '../components/common/AddressForm';

const API_BASE_URL = 'http://localhost:5001/api/v1';

function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function formatAvailability(date, time) {
  if (!date) return time || 'Date to be confirmed';

  const parsedDate = new Date(`${date}T00:00:00`);
  const formattedDate = Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

  if (!time) return formattedDate;

  const [hours, minutes] = String(time).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return `${formattedDate} · ${time}`;
  }

  const formattedTime = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${formattedDate} · ${formattedTime}`;
}

export default function EcoLogisticsPage({ setActiveTab }) {
  const { currentUser, login } = useAuth();

  // Truck Listing Form State
  const [truckName, setTruckName] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [capacityTons, setCapacityTons] = useState(3.5);
  const [pickupAddress, setPickupAddress] = useState({
    state: 'Maharashtra',
    city: 'Navi Mumbai',
    streetArea: 'Mahape',
    landmark: ''
  });
  const [deliveryAddress, setDeliveryAddress] = useState({
    state: 'Maharashtra',
    city: 'Bhiwandi',
    streetArea: 'Bhiwandi Gateway',
    landmark: ''
  });
  // Retained for the inactive legacy optimizer markup.
  const [originCity, setOriginCity] = useState('Mahape, Navi Mumbai');
  const [destinationCity, setDestinationCity] = useState('Bhiwandi Gateway');
  const [availableDate, setAvailableDate] = useState(getTodayDate);
  const [availableTime, setAvailableTime] = useState('09:00');
  const [ratePerKm, setRatePerKm] = useState(32);
  const [driverName, setDriverName] = useState('Ramesh Sharma');
  const [driverPhone, setDriverPhone] = useState('+91 98201 48291');
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [activeTruckId, setActiveTruckId] = useState(null);
  const [originCoordinates, setOriginCoordinates] = useState(null);
  const [originLocationSet, setOriginLocationSet] = useState(false);

  // Page & Solver State
  const [listedTrucks, setListedTrucks] = useState([]);
  const [transportRequests, setTransportRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Google OR-Tools / OSRM VRP Solver State
  const [vrpSolution, setVrpSolution] = useState(null);
  const [solvingVrp, setSolvingVrp] = useState(false);

  const isLogisticsUser = currentUser?.role === 'logistics';

  useEffect(() => {
    if (!isLogisticsUser) return undefined;
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return undefined;
    }
    setLocationStatus('loading');
    const watchId = navigator.geolocation.watchPosition(
      position => {
        const currentLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
        setDeviceLocation(currentLocation);
        setOriginCoordinates(current => current || currentLocation);
        setLocationStatus('ready');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isLogisticsUser]);

  useEffect(() => {
    if (!activeTruckId || !deviceLocation) return undefined;
    fetch(`${API_BASE_URL}/trucks/${activeTruckId}/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deviceLocation)
    }).catch(() => {});
    return undefined;
  }, [activeTruckId, deviceLocation]);

  // Fetch listed trucks from Neon DB
  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trucks`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setListedTrucks(json.data);
          const ownedTruck = json.data.find(truck => truck.createdBy === currentUser?.username);
          if (ownedTruck) setActiveTruckId(ownedTruck.id);
        }
      }
    } catch (err) {
      console.warn('Backend fetch offline for trucks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransportRequests = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders?username=${encodeURIComponent(currentUser.username)}&role=logistics`);
      if (res.ok) {
        const json = await res.json();
        setTransportRequests(Array.isArray(json.data) ? json.data : []);
      }
    } catch (err) {
      console.warn('Could not load transport requests:', err);
    }
  };

  // Run Google OR-Tools & OSRM Route Optimization Solver for Actual Locations
  const handleRunVrpOptimization = async (customOrigin, customDestination) => {
    setSolvingVrp(true);
    const targetOrigin = customOrigin || originCity || 'Mahape, Navi Mumbai';
    const targetDest = customDestination || destinationCity || 'Bhiwandi Gateway';

    try {
      const res = await fetch(`${API_BASE_URL}/logistics/optimize-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originCity: targetOrigin,
          destinationCity: targetDest,
          role: currentUser?.role
        })
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setVrpSolution(json.data);
      }
    } catch (err) {
      console.error('VRP solver request failed:', err);
    } finally {
      setSolvingVrp(false);
    }
  };

  useEffect(() => {
    if (isLogisticsUser) {
      fetchTrucks();
      fetchTransportRequests();
    }
  }, [currentUser]);

  // Demo Login as Logistics Partner
  const handleDemoLogisticsLogin = () => {
    try {
      login({ usernameOrEmail: 'mahindra_freight', password: 'password123' });
    } catch (err) {
      console.error('Demo login failed:', err);
    }
  };

  // Submit Truck Form
  const handleSubmitTruck = async (e) => {
    e.preventDefault();
    if (!isLogisticsUser) return;
    if (!originLocationSet || !originCoordinates || !Number.isFinite(Number(originCoordinates.lat)) || !Number.isFinite(Number(originCoordinates.lon))) {
      setErrorMsg('Click “Set location and return to site” after choosing the truck origin.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      truckName: truckName || 'Tata 407 Electric Cargo Box',
      vehicleReg: vehicleReg || 'MH-04-FK-8492',
      capacityTons: Number(capacityTons) || 2.5,
      originCity: pickupAddress.city,
      destinationCity: deliveryAddress.city,
      pickupAddress,
      deliveryAddress,
      availableDate: availableDate || 'Available Now',
      availableTime: availableTime || '09:00',
      ratePerKm: Number(ratePerKm) || 30,
      createdBy: currentUser.username,
      companyName: currentUser.companyName,
      companyEmail: currentUser.email,
      lat: Number(originCoordinates.lat),
  lon: Number(originCoordinates.lon),
  role: currentUser.role
    };

    try {
      const res = await fetch(`${API_BASE_URL}/trucks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not list truck.');

      setSubmitting(false);
      setSuccessMsg(`Truck ${payload.vehicleReg} listed successfully on Neon DB Network!`);
      setTruckName('');
      setVehicleReg('');
      setActiveTruckId(data.data?.id || null);

      await fetchTrucks();

      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err.message || 'Failed to list truck.');
    }
  };

  const handleDeleteTruck = async (truckId) => {
    if (!window.confirm('Remove this truck listing from the logistics network?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/trucks/${truckId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, role: currentUser.role })
      });
      if (res.ok) {
        setListedTrucks(current => current.filter(t => t.id !== truckId));
      }
    } catch (err) {
      console.error('Failed to delete truck:', err);
    }
  };

  const handleRideDecision = async (truckId, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/trucks/${truckId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, role: currentUser.role, status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update ride.');
      setListedTrucks(current => current.map(truck => truck.id === truckId ? { ...truck, status: data.data.status } : truck));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleTransportRequestDecision = async (orderId, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/logistics-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, role: currentUser.role, status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update transport request.');
      setTransportRequests(current => current.map(request => request.id === orderId
        ? { ...request, logisticsStatus: data.data.logistics_status, status: data.data.status }
        : request));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // ACCESS GATE: IF NOT A LOGISTICS ACCOUNT
  if (!isLogisticsUser) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 16px' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px 32px',
          textAlign: 'center',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#FEF3C7',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Lock size={32} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0F172A', marginBottom: '10px' }}>
            Logistics Carrier Account Required
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.96rem', maxWidth: '560px', margin: '0 auto 28px', lineHeight: 1.6 }}>
            The Logistics Partner portal is reserved for registered logistics organizations to list available vehicles and routes for buyers.
          </p>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '12px', marginBottom: '28px', textAlign: 'left' }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#10B981" /> Currently Signed In As:
            </div>
            {currentUser ? (
              <div style={{ fontSize: '0.88rem', color: '#475569' }}>
                Company: <strong>{currentUser.companyName}</strong> (@{currentUser.username})
                <br />
                Role: <span style={{ color: '#D97706', fontWeight: '700' }}>{currentUser.roleLabel || currentUser.role}</span>
              </div>
            ) : (
              <div style={{ fontSize: '0.88rem', color: '#64748B' }}>Not signed in.</div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleDemoLogisticsLogin}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <UserCheck size={18} /> Sign In as Demo Logistics Carrier (@mahindra_freight)
            </button>

            {setActiveTab && (
              <button
                onClick={() => setActiveTab('auth')}
                className="btn-secondary"
                style={{ padding: '12px 20px', fontSize: '0.95rem' }}
              >
                Register New Logistics Account <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LOGISTICS COMPANY DASHBOARD VIEW
  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      {/* Clean Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '16px', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase' }}>
              Verified Logistics Partner
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: '800', marginBottom: '6px' }}>
            Logistics Vehicle Availability 🚛
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
            Welcome, <strong>{currentUser.companyName}</strong> (@{currentUser.username})! Tell buyers when and where your vehicle is available for material pickup.
          </p>
        </div>

      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#047857', padding: '16px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={22} color="#10B981" />
          <strong style={{ fontSize: '0.95rem' }}>{successMsg}</strong>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '14px', borderRadius: '10px', marginBottom: '24px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div style={{ background: locationStatus === 'ready' ? '#ECFDF5' : '#FFF7ED', border: `1px solid ${locationStatus === 'ready' ? '#A7F3D0' : '#FED7AA'}`, color: locationStatus === 'ready' ? '#047857' : '#9A3412', padding: '14px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Navigation size={17} />
        {locationStatus === 'ready' ? `Live location tracking active (${deviceLocation.lat.toFixed(5)}, ${deviceLocation.lon.toFixed(5)}).` : locationStatus === 'loading' ? 'Starting live location tracking...' : locationStatus === 'denied' ? 'Location permission is required to list and track a truck.' : 'This browser does not support live location tracking.'}
      </div>

      <div style={{ background: 'white', padding: '28px', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={20} color="#10B981" /> Transport Requests
        </h3>
        {transportRequests.length === 0 ? (
          <p style={{ color: '#64748B', margin: 0 }}>No transport requests yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {transportRequests.map(request => {
              const vehicle = request.logisticsVehicle || {};
              const snapshot = request.listingSnapshot || {};
              const estimate = vehicle.estimate || {};
              const requestStatus = String(request.logisticsStatus || 'pending').toLowerCase();
              return (
                <div key={request.id} style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px', background: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <strong style={{ color: '#0F172A' }}>{request.listingTitle || snapshot.title || 'Material'} — {request.quantity} {request.unit || 'units'}</strong>
                    <span style={{ color: requestStatus === 'pending' ? '#92400E' : '#047857', fontWeight: '700', fontSize: '0.78rem' }}>
                      {requestStatus.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.88rem', marginBottom: '6px' }}>
                    {snapshot.location || 'Pickup location'} → {request.destination || 'Delivery location'}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.82rem', marginBottom: '6px' }}>
                    {formatAvailability(request.pickupDate, request.pickupTime || vehicle.availableTime)}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.82rem' }}>
                    Estimated distance: <strong>{estimate.distanceKm || request.transportDistanceKm || '—'} km</strong>
                    {' · '}Estimated payout: <strong>₹{Number(estimate.transportCost || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  {requestStatus === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button type="button" className="btn-primary" onClick={() => handleTransportRequestDecision(request.id, 'accepted')} style={{ padding: '8px 12px', fontSize: '0.82rem' }}>Accept</button>
                      <button type="button" className="btn-secondary" onClick={() => handleTransportRequestDecision(request.id, 'rejected')} style={{ padding: '8px 12px', fontSize: '0.82rem' }}>Reject</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FORM: LIST A NEW VEHICLE */}
      <div style={{ background: 'white', padding: '28px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.04)', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle size={20} color="#10B981" /> List an Available Vehicle
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '18px' }}>
          Tell buyers when and where your vehicle is available for material pickup.
        </p>

        <form onSubmit={handleSubmitTruck}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Vehicle Model / Name</label>
              <input type="text" placeholder="e.g. Tata 407 Electric Box Truck" style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }} value={truckName} onChange={e => setTruckName(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Registration Number</label>
              <input type="text" placeholder="e.g. MH-04-FK-8492" style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }} value={vehicleReg} onChange={e => setVehicleReg(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Payload Capacity (Tons)</label>
              <input type="number" step="0.5" min="0.5" style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }} value={capacityTons} onChange={e => setCapacityTons(Math.max(0.5, Number(e.target.value) || 0.5))} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '22px' }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 12px', color: '#0F172A' }}>Pickup Address</h4>
              <AddressForm value={pickupAddress} onChange={setPickupAddress} idPrefix="pickup-address" required />
            </div>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 12px', color: '#0F172A' }}>Delivery Address</h4>
              <AddressForm value={deliveryAddress} onChange={setDeliveryAddress} idPrefix="delivery-address" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px', marginBottom: '22px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Available Date</label>
              <input type="date" min={getTodayDate()} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }} value={availableDate} onChange={e => setAvailableDate(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Available From</label>
              <input type="time" style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }} value={availableTime} onChange={e => setAvailableTime(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Price per km (₹)</label>
              <input type="number" min="0" style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }} value={ratePerKm} onChange={e => setRatePerKm(Math.max(0, Number(e.target.value) || 0))} required />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem', justifyContent: 'center' }}>
            <Truck size={18} /> {submitting ? 'Listing Vehicle...' : 'List Vehicle'}
          </button>
        </form>
      </div>

      {/* Future optimization workspace retained but not presented in the MVP. */}
      {false && vrpSolution && (
        <div style={{ display: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#10B981', padding: '8px', borderRadius: '10px' }}>
                <Cpu size={22} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'white' }}>
                  Logistics Matching
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                  {vrpSolution.solverEngine} • Route ID: <span style={{ color: '#34D399', fontWeight: '700' }}>{vrpSolution.routeId}</span>
                </div>
              </div>
            </div>

            <span style={{
              background: vrpSolution.isRealOSRM ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: vrpSolution.isRealOSRM ? '#34D399' : '#FBBF24',
              border: `1px solid ${vrpSolution.isRealOSRM ? '#10B981' : '#F59E0B'}`,
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: '700'
            }}>
              {vrpSolution.isRealOSRM ? 'Road distance data' : 'Estimated route data'}
            </span>
          </div>

          {/* Metric KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '22px' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>Estimated Distance</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38BDF8', marginTop: '4px' }}>
                {vrpSolution.totalDistanceKm} <span style={{ fontSize: '0.85rem' }}>km</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>~{vrpSolution.estimatedTimeMins} mins travel</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>Route Compatibility</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#34D399', marginTop: '4px' }}>
                {vrpSolution.deadheadSavedKm} <span style={{ fontSize: '0.85rem' }}>km</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Calculated route comparison</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>Estimated Travel Time</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FBBF24', marginTop: '4px' }}>
                {vrpSolution.fuelSavedLiters} <span style={{ fontSize: '0.85rem' }}>mins</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Route estimate</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>Estimated CO₂e</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#A7F3D0', marginTop: '4px' }}>
                {vrpSolution.avoidedCo2Kg} <span style={{ fontSize: '0.85rem' }}>kg</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#34D399', marginTop: '2px' }}>Calculation estimate</div>
            </div>
          </div>

          {/* OR-Tools Waypoint Stop Sequence */}
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#CBD5E1', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Route size={16} color="#38BDF8" /> Available Route Options:
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {vrpSolution.stopsSequence.map((stop, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: stop.type === 'depot' ? '#3B82F6' : stop.type === 'drop' ? '#10B981' : '#F59E0B',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '800'
                  }}>
                    {stop.stepNumber}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'white' }}>{stop.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{stop.address}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem', color: '#CBD5E1' }}>
                  <div>ETA: <strong style={{ color: '#FBBF24' }}>{stop.eta}</strong></div>
                  <div>Leg: <strong>{stop.distanceFromPrevKm} km</strong></div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#A7F3D0' }}>
                    {stop.materialSummary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retained legacy form markup for compatibility; the simplified form above is active. */}
      <div style={{ display: 'none', background: 'white', padding: '28px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.04)', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle size={20} color="#10B981" /> List an Available Truck / Backhaul Vehicle
        </h3>

        <form onSubmit={handleSubmitTruck}>
          <div className="responsive-grid-2" style={{ marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Truck Model / Description</label>
              <input
                type="text"
                placeholder="e.g. Tata 407 2.5T Electric Box Truck"
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                value={truckName}
                onChange={e => setTruckName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Vehicle Registration Number</label>
              <input
                type="text"
                placeholder="e.g. MH-04-FK-8492"
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                value={vehicleReg}
                onChange={e => setVehicleReg(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="responsive-grid-3" style={{ marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Payload Capacity (Tons)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                value={capacityTons}
                onChange={e => setCapacityTons(Math.max(0.5, Number(e.target.value) || 0.5))}
                required
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <LocationPicker
                location={originCity}
                setLocation={setOriginCity}
                coordinates={originCoordinates}
                setCoordinates={setOriginCoordinates}
                status={locationStatus}
                onUseCurrentLocation={() => {
                  if (deviceLocation) {
                    setOriginCoordinates(deviceLocation);
                    setOriginLocationSet(false);
                  }
                }}
                onSetLocation={() => setOriginLocationSet(true)}
                onLocationChange={() => setOriginLocationSet(false)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Destination Corridor</label>
              <input
                type="text"
                placeholder="e.g. Bhiwandi Gateway"
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                value={destinationCity}
                onChange={e => setDestinationCity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="responsive-grid-3" style={{ marginBottom: '22px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Available Pickup Date</label>
              <input
                type="text"
                placeholder="e.g. Available Today / Tomorrow"
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                value={availableDate}
                onChange={e => setAvailableDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Driver Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Sharma"
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Asking Freight Rate (₹ / km)</label>
              <input
                type="number"
                min="0"
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                value={ratePerKm}
                onChange={e => setRatePerKm(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', justifyContent: 'center' }}
          >
            <Truck size={18} /> {submitting ? 'Listing Truck...' : 'List Truck on Central Logistics Network'}
          </button>
        </form>
      </div>

      {/* AVAILABLE VEHICLES */}
      <div style={{ background: 'white', padding: '28px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={20} color="#3B82F6" /> Available Vehicles ({listedTrucks.length})
        </h3>

        {listedTrucks.length === 0 ? (
          <p style={{ color: '#64748B' }}>No vehicles listed yet. Fill out the form above to add an available vehicle.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {listedTrucks.map(truck => (
              <div key={truck.id} style={{ border: '1px solid #E2E8F0', padding: '18px', borderRadius: '12px', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ display: 'block', color: '#64748B', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Vehicle</span>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0F172A', paddingRight: '10px', margin: 0 }}>{truck.truckName}</h4>
                  </div>
                  <span style={{
                    background: truck.status === 'accepted' ? '#FEF3C7' : '#ECFDF5',
                    color: truck.status === 'accepted' ? '#92400E' : '#047857',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    whiteSpace: 'nowrap'
                  }}>
                    {truck.status === 'accepted' ? 'BOOKED' : 'AVAILABLE'}
                  </span>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  <div><span style={{ color: '#64748B' }}>Route</span><br /><strong style={{ color: '#0F172A' }}>{truck.originCity} → {truck.destinationCity}</strong></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><span style={{ color: '#64748B' }}>Capacity</span><br /><strong style={{ color: '#0F172A' }}>{truck.capacityTons} tons</strong></div>
                    <div><span style={{ color: '#64748B' }}>Price</span><br /><strong style={{ color: '#0F172A' }}>₹{truck.ratePerKm}/km</strong></div>
                  </div>
                  <div><span style={{ color: '#64748B' }}>Availability</span><br /><strong style={{ color: '#0F172A' }}>{formatAvailability(truck.availableDate, truck.availableTime)}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => window.alert(`${truck.truckName}\n${truck.originCity} → ${truck.destinationCity}\nCapacity: ${truck.capacityTons} tons\nAvailable: ${formatAvailability(truck.availableDate, truck.availableTime)}\nRate: ₹${truck.ratePerKm}/km`)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #BFDBFE',
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>
                  {truck.createdBy === currentUser.username && (
                    <>
                    <button
                      onClick={() => handleDeleteTruck(truck.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #FCA5A5',
                        background: '#FEF2F2',
                        color: '#991B1B',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
