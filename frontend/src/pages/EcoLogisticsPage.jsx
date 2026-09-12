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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:5001/api/v1';

export default function EcoLogisticsPage({ setActiveTab }) {
  const { currentUser, login } = useAuth();

  // Truck Listing Form State
  const [truckName, setTruckName] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [capacityTons, setCapacityTons] = useState(3.5);
  const [originCity, setOriginCity] = useState('Mahape, Navi Mumbai');
  const [destinationCity, setDestinationCity] = useState('Bhiwandi Gateway');
  const [availableDate, setAvailableDate] = useState('Available Today');
  const [ratePerKm, setRatePerKm] = useState(32);
  const [driverName, setDriverName] = useState('Ramesh Sharma');
  const [driverPhone, setDriverPhone] = useState('+91 98201 48291');

  // Page state
  const [listedTrucks, setListedTrucks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const isLogisticsUser = currentUser?.role === 'logistics';

  // Fetch listed trucks from Neon DB
  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trucks`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setListedTrucks(json.data);
        }
      }
    } catch (err) {
      console.warn('Backend fetch offline for trucks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLogisticsUser) {
      fetchTrucks();
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

    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      truckName: truckName || 'Tata 407 Electric Cargo Box',
      vehicleReg: vehicleReg || 'MH-04-FK-8492',
      capacityTons: Number(capacityTons) || 2.5,
      originCity: originCity || 'Navi Mumbai',
      destinationCity: destinationCity || 'Bhiwandi',
      availableDate: availableDate || 'Available Now',
      ratePerKm: Number(ratePerKm) || 30,
      driverName: driverName || 'Ramesh Sharma',
      driverPhone: driverPhone || '+91 98000 00000',
      createdBy: currentUser.username,
      companyName: currentUser.companyName,
      companyEmail: currentUser.email
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
        body: JSON.stringify({ username: currentUser.username })
      });
      if (res.ok) {
        setListedTrucks(current => current.filter(t => t.id !== truckId));
      }
    } catch (err) {
      console.error('Failed to delete truck:', err);
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
            The Eco-Logistics Fleet Portal is exclusively reserved for registered logistics companies and freight operators to list trucks, set backhaul corridors, and manage driver fleets.
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
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Clean Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '16px', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase' }}>
            Verified Logistics Partner
          </span>
        </div>
        <h2 style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: '800', marginBottom: '6px' }}>
          Logistics Fleet & Truck Portal 🚛
        </h2>
        <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
          Welcome, <strong>{currentUser.companyName}</strong> (@{currentUser.username})! List your available trucks and backhaul capacity on the central network.
        </p>
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

      {/* FORM: LIST A NEW TRUCK */}
      <div style={{ background: 'white', padding: '28px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 14px rgba(0,0,0,0.04)', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle size={20} color="#10B981" /> List an Available Truck / Backhaul Vehicle
        </h3>

        <form onSubmit={handleSubmitTruck}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px', marginBottom: '18px' }}>
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

            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>Origin City / Hub</label>
              <input
                type="text"
                placeholder="e.g. Mahape, Navi Mumbai"
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.92rem' }}
                value={originCity}
                onChange={e => setOriginCity(e.target.value)}
                required
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px', marginBottom: '22px' }}>
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

      {/* LISTED FLEET DIRECTORY */}
      <div style={{ background: 'white', padding: '28px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={20} color="#3B82F6" /> Available Listed Fleet Vehicles ({listedTrucks.length})
        </h3>

        {listedTrucks.length === 0 ? (
          <p style={{ color: '#64748B' }}>No trucks listed yet. Fill out the form above to post your first vehicle.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
            {listedTrucks.map(truck => (
              <div key={truck.id} style={{ border: '1px solid #E2E8F0', padding: '20px', borderRadius: '12px', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0F172A' }}>{truck.truckName}</h4>
                  <span style={{ background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                    {truck.status ? truck.status.toUpperCase() : 'AVAILABLE'}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>🚛 Registration: <strong>{truck.vehicleReg}</strong></div>
                  <div>⚖️ Capacity: <strong>{truck.capacityTons} Tons</strong></div>
                  <div>📍 Route: <strong>{truck.originCity} ➔ {truck.destinationCity}</strong></div>
                  <div>📅 Availability: <strong>{truck.availableDate}</strong></div>
                  <div>💰 Rate: <strong>₹{truck.ratePerKm} / km</strong></div>
                  <div>👤 Driver: <strong>{truck.driverName}</strong> ({truck.driverPhone})</div>
                </div>

                {truck.createdBy === currentUser.username && (
                  <button
                    onClick={() => handleDeleteTruck(truck.id)}
                    style={{
                      width: '100%',
                      padding: '8px',
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
                    <Trash2 size={14} /> Remove Truck Listing
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
