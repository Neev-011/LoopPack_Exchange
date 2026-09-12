import React, { useState } from 'react';
import { 
  Building2, ShieldCheck, Lock, Mail, User, ArrowRight, 
  CheckCircle2, AlertCircle, RefreshCw, KeyRound, HelpCircle, 
  Sparkles, Briefcase, ChevronRight, UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';

export default function AuthPage({ setActiveTab }) {
  const { 
    currentUser, 
    login, 
    register, 
    checkUsername, 
    resetPassword, 
    recoverUsername, 
    switchAccount, 
    demoUsers,
    logout
  } = useAuth();

  // Modes: 'login' | 'register' | 'forgot-password' | 'forgot-username'
  const [mode, setMode] = useState('login');

  // Form states
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('supplier');
  const [regIndustry, setRegIndustry] = useState('Logistics & Warehousing');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [userCheckStatus, setUserCheckStatus] = useState(null); // { checked: bool, exists: bool, preview: {} }

  // Check username existence dynamically
  const handleCheckUser = async (uname) => {
    const val = uname || usernameOrEmail;
    if (!val || val.length < 2) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await checkUsername(val);
      if (res.exists) {
        setUserCheckStatus({ checked: true, exists: true, preview: res.userPreview });
      } else {
        setUserCheckStatus({ checked: true, exists: false });
      }
    } catch {
      setUserCheckStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // 1. Submit Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const user = await login({ usernameOrEmail, password });
      setSuccessMsg(`Welcome back, ${user.companyName}!`);
      setTimeout(() => {
        setActiveTab('marketplace');
      }, 700);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const user = await register({
        username: regUsername || usernameOrEmail,
        companyName,
        email,
        password: regPassword,
        role: regRole,
        industry: regIndustry,
        securityAnswer
      });
      setSuccessMsg(`Organization registered successfully! Welcome, ${user.companyName}.`);
      setTimeout(() => {
        setActiveTab('marketplace');
      }, 700);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Reset Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await resetPassword({
        usernameOrEmail,
        securityAnswer,
        newPassword
      });
      setSuccessMsg(res.message || 'Password reset successfully!');
      setTimeout(() => {
        setActiveTab('marketplace');
      }, 900);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Recover Username
  const handleRecoverUsernameSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await recoverUsername({ email, companyName });
      setSuccessMsg(`Found account! Your username is: @${res.username}`);
      setUsernameOrEmail(res.username);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '30px auto', padding: '0 20px' }}>
      {/* Top Header Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '36px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
        border: '1px solid #E2E8F0',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <Logo variant="horizontal" height={42} theme="light" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0F172A', marginTop: '16px', letterSpacing: '-0.5px' }}>
              B2B Enterprise Portal & Material Ledger
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.94rem', maxWidth: '600px', marginTop: '4px' }}>
              Secure access for packaging generators, recycled material buyers, logistics fleet operators, and Scope 3 ESG compliance auditors.
            </p>
          </div>

          {/* Current Session status */}
          {currentUser && (
            <div style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }}></div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>Active Organization</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#065F46' }}>{currentUser.companyName}</div>
                <div style={{ fontSize: '0.8rem', color: '#059669' }}>@{currentUser.username} • {currentUser.roleLabel}</div>
              </div>
              <button
                onClick={logout}
                style={{
                  marginLeft: '10px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Global Feedback Banner */}
        {errorMsg && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #F87171',
            borderRadius: '10px',
            padding: '12px 16px',
            marginTop: '20px',
            color: '#B91C1C',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.92rem'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #34D399',
            borderRadius: '10px',
            padding: '12px 16px',
            marginTop: '20px',
            color: '#065F46',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.92rem'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Mode Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', marginTop: '28px', paddingBottom: '2px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: mode === 'login' ? '3px solid #059669' : '3px solid transparent',
              padding: '10px 16px',
              fontSize: '0.95rem',
              fontWeight: mode === 'login' ? '700' : '500',
              color: mode === 'login' ? '#059669' : '#64748B',
              cursor: 'pointer'
            }}
          >
            Sign In (Smart Check)
          </button>
          <button
            onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: mode === 'register' ? '3px solid #059669' : '3px solid transparent',
              padding: '10px 16px',
              fontSize: '0.95rem',
              fontWeight: mode === 'register' ? '700' : '500',
              color: mode === 'register' ? '#059669' : '#64748B',
              cursor: 'pointer'
            }}
          >
            Register Organization
          </button>
          <button
            onClick={() => { setMode('forgot-password'); setErrorMsg(null); setSuccessMsg(null); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: mode === 'forgot-password' ? '3px solid #059669' : '3px solid transparent',
              padding: '10px 16px',
              fontSize: '0.95rem',
              fontWeight: mode === 'forgot-password' ? '700' : '500',
              color: mode === 'forgot-password' ? '#059669' : '#64748B',
              cursor: 'pointer'
            }}
          >
            Forgot Password
          </button>
          <button
            onClick={() => { setMode('forgot-username'); setErrorMsg(null); setSuccessMsg(null); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: mode === 'forgot-username' ? '3px solid #059669' : '3px solid transparent',
              padding: '10px 16px',
              fontSize: '0.95rem',
              fontWeight: mode === 'forgot-username' ? '700' : '500',
              color: mode === 'forgot-username' ? '#059669' : '#64748B',
              cursor: 'pointer'
            }}
          >
            Forgot Username
          </button>
        </div>

        {/* ---------------- MODE 1: SMART LOGIN ---------------- */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ marginTop: '24px' }}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                B2B Username or Corporate Email
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => {
                      setUsernameOrEmail(e.target.value);
                      setUserCheckStatus(null);
                    }}
                    onBlur={() => handleCheckUser(usernameOrEmail)}
                    placeholder="e.g. apex_logistics or contact@apexlogistics.com"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckUser(usernameOrEmail)}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0 16px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  Verify User
                </button>
              </div>

              {/* Dynamic Username Detection Feedback */}
              {userCheckStatus?.checked && userCheckStatus.exists && (
                <div style={{
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  color: '#166534'
                }}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>
                    <strong>Organization Identified:</strong> {userCheckStatus.preview.companyName} ({userCheckStatus.preview.roleLabel})
                  </span>
                </div>
              )}

              {userCheckStatus?.checked && !userCheckStatus.exists && (
                <div style={{
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.88rem',
                  color: '#92400E'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HelpCircle size={16} />
                    <span>Username <strong>@{usernameOrEmail}</strong> is not registered yet.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRegUsername(usernameOrEmail);
                      setMode('register');
                    }}
                    style={{
                      background: '#D97706',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Register as @{usernameOrEmail} →
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: '700', color: '#334155' }}>
                  Account Password
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', justifyContent: 'center' }}
            >
              {loading ? 'Authenticating Enterprise...' : 'Sign In to LoopPack Exchange'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* ---------------- MODE 2: REGISTER ---------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ marginTop: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Desired Username (Unique ID)
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                  <input
                    type="text"
                    required
                    value={regUsername || usernameOrEmail}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. kashyap_packaging"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Registered Company / Facility Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Kashyap Logistics & Materials Corp"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Corporate Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@yourcompany.com"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  How will you use LoopPack?
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.95rem',
                    background: 'white',
                    outline: 'none'
                  }}
                >
                  <option value="supplier">Packaging Supplier</option>
                  <option value="buyer">Buyer / Recycler</option>
                  <option value="logistics">Logistics Partner</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Industry Sector
                </label>
                <input
                  type="text"
                  value={regIndustry}
                  onChange={(e) => setRegIndustry(e.target.value)}
                  placeholder="e.g. Chemicals & Pharmaceuticals, Retail, Automotive"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a strong password"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Security Verification Setting */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', marginTop: '18px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Account Recovery Security Question
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '10px' }}>
                Used if you ever forget your password: <em>"What is your company's founding hub city?"</em>
              </div>
              <input
                type="text"
                required
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="e.g. Mumbai, Berlin, or Chicago"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '22px', justifyContent: 'center' }}
            >
              {loading ? 'Creating Enterprise Account...' : 'Register B2B Organization & Access Portal'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* ---------------- MODE 3: FORGOT PASSWORD ---------------- */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleResetPasswordSubmit} style={{ marginTop: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                B2B Username or Registered Corporate Email
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. apex_logistics or contact@apexlogistics.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Security Verification: What is your company's founding hub city?
              </label>
              <input
                type="text"
                required
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Enter the city answer set during registration (e.g. Mumbai, Delhi)"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Set New Password
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ flex: 1, padding: '14px', fontSize: '0.95rem', justifyContent: 'center' }}
              >
                {loading ? 'Verifying & Updating...' : 'Reset Password & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0 20px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ---------------- MODE 4: FORGOT USERNAME ---------------- */}
        {mode === 'forgot-username' && (
          <form onSubmit={handleRecoverUsernameSubmit} style={{ marginTop: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Registered Corporate Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@apexlogistics.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Company Name (Optional Filter)
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Packaging Solutions"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ flex: 1, padding: '14px', fontSize: '0.95rem', justifyContent: 'center' }}
              >
                {loading ? 'Searching Directory...' : 'Recover Account Username'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0 20px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ---------------- 1-CLICK DEMO B2B ACCOUNTS ---------------- */}
      <div style={{
        background: '#F8FAFC',
        borderRadius: '16px',
        padding: '24px 30px',
        border: '1px solid #E2E8F0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', fontWeight: '700', fontSize: '0.95rem' }}>
          <Sparkles size={18} color="#059669" />
          <span>⚡ Instant B2B Demo Accounts (1-Click Switcher)</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: '16px' }}>
          Click any pre-configured enterprise below to immediately experience multi-user data isolation, listings management, and personalized ESG certificates:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {demoUsers.map((user) => {
            const isActive = currentUser?.username === user.username;
            return (
              <div
                key={user.id}
                onClick={() => {
                  switchAccount(user);
                  setSuccessMsg(`Switched to active enterprise: ${user.companyName}`);
                  setTimeout(() => setActiveTab('marketplace'), 600);
                }}
                style={{
                  background: isActive ? '#ECFDF5' : '#FFFFFF',
                  border: isActive ? '2px solid #10B981' : '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 14px rgba(16, 185, 129, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0F172A' }}>{user.companyName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '600' }}>@{user.username}</div>
                  </div>
                  {isActive ? (
                    <span style={{ background: '#10B981', color: 'white', fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' }}>
                      ACTIVE
                    </span>
                  ) : (
                    <ChevronRight size={18} color="#94A3B8" />
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '8px' }}>
                  <strong>Role:</strong> {user.roleLabel}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                  Industry: {user.industry}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
