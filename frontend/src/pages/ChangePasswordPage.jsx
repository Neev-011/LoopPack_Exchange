import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordPage({ setActiveTab }) {
  const { currentUser, changePassword } = useAuth();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!currentUser) {
    return <div style={panelStyle}>Please sign in to change your password.</div>;
  }

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (passwords.newPassword !== passwords.confirmation) {
      setError('New password and confirmation do not match.');
      return;
    }
    try {
      await changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' });
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <button className="btn-secondary" onClick={() => setActiveTab('profile')} style={{ marginBottom: 18 }}>
        <ArrowLeft size={15} /> Back to profile
      </button>
      <section style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <KeyRound color="#047857" />
          <div><h2 style={{ margin: 0, color: '#0F172A' }}>Change password</h2><p style={{ margin: '4px 0 0', color: '#64748B' }}>Update the password for @{currentUser.username}.</p></div>
        </div>
        {message && <div style={feedbackStyle('#ECFDF5', '#047857')}><CheckCircle size={15} />{message}</div>}
        {error && <div style={feedbackStyle('#FEF2F2', '#991B1B')}>{error}</div>}
        <form onSubmit={submit}>
          <Field label="Current password" type="password" value={passwords.currentPassword} onChange={value => setPasswords({ ...passwords, currentPassword: value })} />
          <Field label="New password" type="password" value={passwords.newPassword} onChange={value => setPasswords({ ...passwords, newPassword: value })} />
          <Field label="Confirm new password" type="password" value={passwords.confirmation} onChange={value => setPasswords({ ...passwords, confirmation: value })} />
          <button className="btn-primary" type="submit">Update password</button>
        </form>
      </section>
    </div>
  );
}

function Field({ label, type, value, onChange }) {
  return <label style={{ display: 'block', color: '#475569', fontSize: 13, marginBottom: 14 }}>{label}<input required minLength={type === 'password' ? 8 : undefined} type={type} value={value} onChange={event => onChange(event.target.value)} style={inputStyle} /></label>;
}

const panelStyle = { background: 'white', padding: 24, borderRadius: 12, border: '1px solid #E2E8F0' };
const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', padding: 11, marginTop: 5, border: '1px solid #CBD5E1', borderRadius: 6 };
const feedbackStyle = (background, color) => ({ padding: 10, borderRadius: 7, background, color, marginBottom: 14, display: 'flex', gap: 7, alignItems: 'center' });
