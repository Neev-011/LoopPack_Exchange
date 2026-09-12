import React, { useEffect, useState } from 'react';

const INDIAN_STATES_AND_CITIES = {
  'Andhra Pradesh': ['Amaravati', 'Visakhapatnam', 'Vijayawada'],
  'Delhi': ['New Delhi', 'Delhi'],
  'Gujarat': ['Ahmedabad', 'Anand', 'Bhavnagar', 'Gandhinagar', 'Morbi', 'Rajkot', 'Surat', 'Vadodara'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat'],
  'Karnataka': ['Bengaluru', 'Mangaluru', 'Mysuru'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur'],
  'Maharashtra': ['Mumbai', 'Navi Mumbai', 'Pune', 'Thane', 'Nagpur'],
  'Punjab': ['Amritsar', 'Ludhiana', 'Mohali'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  'Telangana': ['Hyderabad', 'Warangal'],
  'Uttar Pradesh': ['Agra', 'Kanpur', 'Lucknow', 'Noida', 'Varanasi'],
  'West Bengal': ['Howrah', 'Kolkata', 'Siliguri']
};

const DEFAULT_ADDRESS = {
  state: '',
  city: '',
  streetArea: '',
  landmark: ''
};

/**
 * Reusable structured address fields.
 *
 * State and city remain controlled canonical values so a future suggestion
 * provider can replace the local option lists without changing consumers.
 */
export default function AddressForm({
  value = DEFAULT_ADDRESS,
  onChange,
  idPrefix = 'address',
  required = false,
  compact = false,
  className = '',
  style
}) {
  const address = { ...DEFAULT_ADDRESS, ...value };
  const cities = INDIAN_STATES_AND_CITIES[address.state] || [];
  const [stateQuery, setStateQuery] = useState(address.state);
  const [stateMenuOpen, setStateMenuOpen] = useState(false);

  useEffect(() => {
    setStateQuery(address.state);
  }, [address.state]);

  const update = (field, fieldValue) => {
    const nextAddress = { ...address, [field]: fieldValue };
    if (field === 'state' && !INDIAN_STATES_AND_CITIES[fieldValue]?.includes(address.city)) {
      nextAddress.city = '';
    }
    onChange(nextAddress);
  };

  const stateOptions = Object.keys(INDIAN_STATES_AND_CITIES).filter(state => (
    state.toLowerCase().includes(stateQuery.trim().toLowerCase())
  ));

  const selectState = state => {
    setStateQuery(state);
    setStateMenuOpen(false);
    update('state', state);
  };

  return (
    <div className={`${className} address-form${compact ? ' address-form-compact' : ''}`} style={{ display: 'grid', gap: '14px', ...style }}>
      <div style={{ position: 'relative' }}>
        <label htmlFor={`${idPrefix}-state`}>State</label>
        <input
          id={`${idPrefix}-state`}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={stateMenuOpen}
          value={stateQuery}
          onFocus={() => setStateMenuOpen(true)}
          onChange={event => {
            setStateQuery(event.target.value);
            setStateMenuOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setStateMenuOpen(false);
              setStateQuery(address.state);
            }, 120);
          }}
          placeholder="Search or select a state"
          required={false}
        />
        <input
          type="hidden"
          name={`${idPrefix}.state`}
          value={address.state}
          required={required}
          readOnly
        />
        {stateMenuOpen && (
          <div
            id={`${idPrefix}-state-options`}
            role="listbox"
            style={{
              position: 'absolute',
              zIndex: 2,
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '180px',
              overflowY: 'auto',
              background: 'white',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)'
            }}
          >
            {stateOptions.length > 0 ? stateOptions.map(state => (
              <button
                key={state}
                type="button"
                role="option"
                aria-selected={state === address.state}
                onMouseDown={event => event.preventDefault()}
                onClick={() => selectState(state)}
                style={{
                  display: 'block',
                  width: '100%',
                  border: 0,
                  background: state === address.state ? '#F0FDF4' : 'white',
                  color: '#0F172A',
                  textAlign: 'left',
                  padding: '9px 10px',
                  cursor: 'pointer'
                }}
              >
                {state}
              </button>
            )) : (
              <div style={{ padding: '9px 10px', color: '#64748B', fontSize: '0.88rem' }}>No matching states</div>
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-city`}>City</label>
        <select
          id={`${idPrefix}-city`}
          name={`${idPrefix}.city`}
          value={address.city}
          onChange={event => update('city', event.target.value)}
          disabled={!address.state || cities.length === 0}
          required={required}
        >
          <option value="">{address.state ? 'Select a city' : 'Select a state first'}</option>
          {cities.map(city => <option key={city} value={city}>{city}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-street-area`}>Street / Area</label>
        <input
          id={`${idPrefix}-street-area`}
          name={`${idPrefix}.streetArea`}
          type="text"
          value={address.streetArea}
          onChange={event => update('streetArea', event.target.value)}
          placeholder="Street, area, or industrial zone"
          required={required}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-landmark`}>Landmark</label>
        <input
          id={`${idPrefix}-landmark`}
          name={`${idPrefix}.landmark`}
          type="text"
          value={address.landmark}
          onChange={event => update('landmark', event.target.value)}
          placeholder="Nearby landmark (optional)"
        />
      </div>
    </div>
  );
}

export { DEFAULT_ADDRESS, INDIAN_STATES_AND_CITIES };
