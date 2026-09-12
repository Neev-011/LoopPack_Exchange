import React, { useEffect, useState } from 'react';
import { MessageSquare, Pencil, Save, Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:5001/api/v1';

function userParams(user) {
  return new URLSearchParams({
    userId: user.id,
    username: user.username,
    companyName: user.companyName
  });
}

function userBody(user) {
  return { userId: user.id, username: user.username, companyName: user.companyName };
}

export default function AccountHubPage({ view = 'materials' }) {
  const { currentUser } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [listings, setListings] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const isSeller = currentUser?.role !== 'buyer';

  const load = async () => {
    if (!currentUser) return;
    const role = view === 'inquiries' ? 'buyer' : 'seller';
    const inquiryResponse = await fetch(`${API_BASE_URL}/inquiries?${userParams(currentUser)}&role=${role}`);
    const inquiryData = await inquiryResponse.json();
    if (!inquiryResponse.ok) throw new Error(inquiryData.error || 'Could not load inquiries.');
    setInquiries(inquiryData.data || []);
    if (view === 'materials' && isSeller) {
      const listingResponse = await fetch(`${API_BASE_URL}/listings?owner=${encodeURIComponent(currentUser.username)}`);
      const listingData = await listingResponse.json();
      setListings(listingData.data || []);
    }
  };

  useEffect(() => {
    load().catch(err => setError(err.message));
  }, [currentUser, view]);

  const updateStatus = async (id, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userBody(currentUser), status })
      });
      if (!response.ok) throw new Error('Could not update inquiry.');
      setSelectedInquiry(current => current?.id === id ? { ...current, status } : current);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const statusDetails = {
    new: { label: 'New inquiry', color: '#2563EB', background: '#EFF6FF' },
    in_progress: { label: 'Conversation ongoing', color: '#B45309', background: '#FFFBEB' },
    accepted: { label: 'Deal completed', color: '#047857', background: '#ECFDF5' },
    declined: { label: 'Closed without agreement', color: '#B91C1C', background: '#FEF2F2' },
    closed: { label: 'Conversation closed', color: '#475569', background: '#F1F5F9' }
  };

  const openConversation = async (inquiry) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inquiries/${inquiry.id}/messages?${userParams(currentUser)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load conversation.');
      setSelectedInquiry(inquiry);
      setMessages(data.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const send = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/inquiries/${selectedInquiry.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userBody(currentUser), body: message })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send message.');
      setMessages(current => [...current, data.data]);
      setMessage('');
    } catch (err) {
      setError(err.message);
    }
  };

  const saveListing = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editing, username: currentUser.username })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update listing.');
      setListings(current => current.map(item => item.id === data.data.id ? data.data : item));
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!currentUser) {
    return <div style={{ background: 'white', padding: 32, borderRadius: 12 }}>Please sign in to manage inquiries and listings.</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ color: '#0F172A', marginBottom: 6 }}>{view === 'materials' ? 'My Materials' : 'My Inquiries'}</h2>
      <p style={{ color: '#64748B', marginBottom: 24 }}>
        {view === 'materials'
          ? 'Manage your posted materials and inquiries received from buyers.'
          : 'Track inquiries you have sent to other sellers and continue conversations.'}
      </p>
      {error && <div style={{ background: '#FEF2F2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      {view === 'materials' && isSeller && (
        <section style={{ background: 'white', padding: 24, borderRadius: 12, marginBottom: 20, border: '1px solid #E2E8F0' }}>
          <h3>My posted materials</h3>
          {listings.length === 0 && <p style={{ color: '#64748B' }}>No listings are attributed to this account yet. New posts will be linked to your account.</p>}
          {listings.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderBottom: '1px solid #E2E8F0' }}>
              <div><strong>{item.title}</strong><div style={{ color: '#64748B', fontSize: 13 }}>{item.quantity} {item.unit} · ₹{item.price}</div></div>
              <button className="btn-secondary" onClick={() => setEditing({ ...item })}><Pencil size={14} /> Edit</button>
            </div>
          ))}
        </section>
      )}

      <section style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid #E2E8F0' }}>
        <h3>{view === 'materials' ? 'Inquiries received on my materials' : 'Inquiries sent to sellers'}</h3>
        {inquiries.length === 0 && <p style={{ color: '#64748B' }}>No inquiries yet.</p>}
        {inquiries.map(item => (
          <div key={item.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>{item.listingTitle}</strong>
              <span style={{ color: statusDetails[item.status]?.color || '#475569', background: statusDetails[item.status]?.background || '#F1F5F9', fontWeight: 700, fontSize: 12, padding: '4px 8px', borderRadius: 12 }}>
                {statusDetails[item.status]?.label || item.status}
              </span>
            </div>
            <p style={{ color: '#475569' }}>{item.message}</p>
            <small style={{ color: '#64748B' }}>{view === 'materials' ? `From ${item.buyerCompanyName}` : `Seller: @${item.sellerUsername}`}</small>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn-secondary" onClick={() => openConversation(item)}><MessageSquare size={14} /> Chat</button>
              {view === 'materials' && <><button className="btn-primary" onClick={() => updateStatus(item.id, 'in_progress')}>Responding</button><button className="btn-secondary" onClick={() => updateStatus(item.id, 'declined')}>Decline</button></>}
            </div>
          </div>
        ))}
      </section>

      {editing && <div style={modalStyle}><form onSubmit={saveListing} style={formStyle}><button type="button" onClick={() => setEditing(null)} style={closeStyle}><X /></button><h3>Edit listing</h3>{['title', 'quantity', 'unit', 'price', 'location', 'description'].map(field => <label key={field} style={{ display: 'block', marginBottom: 10, color: '#475569' }}>{field}<input style={inputStyle} value={editing[field] || ''} onChange={e => setEditing({ ...editing, [field]: e.target.value })} /></label>)}<button className="btn-primary" type="submit"><Save size={15} /> Save changes</button></form></div>}
      {selectedInquiry && (
        <div style={modalStyle}>
          <div style={formStyle}>
            <button onClick={() => setSelectedInquiry(null)} style={closeStyle}><X /></button>
            <h3 style={{ marginBottom: 6 }}>Conversation</h3>
            <div style={{ color: statusDetails[selectedInquiry.status]?.color || '#475569', background: statusDetails[selectedInquiry.status]?.background || '#F1F5F9', padding: '8px 10px', borderRadius: 7, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
              {statusDetails[selectedInquiry.status]?.label || 'Conversation ongoing'}
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
              {messages.length === 0 && <p style={{ color: '#64748B', fontSize: 13 }}>No messages yet. Start the conversation below.</p>}
              {messages.map(item => <div key={item.id} style={{ padding: 8, background: item.senderUsername === currentUser.username ? '#ECFDF5' : '#F8FAFC', borderRadius: 8, marginBottom: 6 }}><strong>{item.senderCompanyName}</strong><div>{item.body}</div></div>)}
            </div>
            {!['accepted', 'declined', 'closed'].includes(selectedInquiry.status) && (
              <>
                <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
                  <input style={inputStyle} value={message} onChange={e => setMessage(e.target.value)} placeholder="Write a message..." />
                  <button className="btn-primary" type="submit"><Send size={15} /></button>
                </form>
                <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 16, paddingTop: 14 }}>
                  <div style={{ color: '#64748B', fontSize: 12, marginBottom: 8 }}>Finish this conversation</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn-primary" type="button" onClick={() => updateStatus(selectedInquiry.id, 'accepted')}>✓ Completed successfully</button>
                    <button className="btn-secondary" type="button" onClick={() => updateStatus(selectedInquiry.id, 'declined')}>Close without agreement</button>
                    <button className="btn-secondary" type="button" onClick={() => updateStatus(selectedInquiry.id, 'in_progress')}>Keep ongoing</button>
                  </div>
                </div>
              </>
            )}
            {['accepted', 'declined', 'closed'].includes(selectedInquiry.status) && (
              <button className="btn-secondary" type="button" onClick={() => updateStatus(selectedInquiry.id, 'in_progress')} style={{ marginTop: 12 }}>
                Reopen conversation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyle = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 };
const formStyle = { background: 'white', borderRadius: 12, padding: 24, maxWidth: 560, width: '100%', position: 'relative' };
const inputStyle = { display: 'block', width: '100%', padding: 10, border: '1px solid #CBD5E1', borderRadius: 6, marginTop: 4 };
const closeStyle = { position: 'absolute', right: 12, top: 12, border: 0, background: 'transparent', cursor: 'pointer' };
