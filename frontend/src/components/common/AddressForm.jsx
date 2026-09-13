import React, { useEffect, useState } from 'react';

const INDIAN_STATES_AND_CITIES = {
  'Andhra Pradesh': ['Adoni', 'Amaravati', 'Anantapur', 'Chandragiri', 'Chittoor', 'Dowlaiswaram', 'Eluru', 'Guntur', 'Kadapa', 'Kakinada', 'Kurnool', 'Machilipatnam', 'Nagarjunakonda', 'Nellore', 'Rajahmundry', 'Srikakulam', 'Tirupati', 'Vijayawada', 'Visakhapatnam', 'Vizianagaram', 'Yemmiganur'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  'Assam': ['Dhuburi', 'Dibrugarh', 'Dispur', 'Guwahati', 'Jorhat', 'Nagaon', 'Sivasagar', 'Silchar', 'Tezpur', 'Tinsukia'],
  'Bihar': ['Ara', 'Barauni', 'Begusarai', 'Bettiah', 'Bhagalpur', 'Bihar Sharif', 'Bodh Gaya', 'Buxar', 'Chapra', 'Darbhanga', 'Dehri', 'Dinapur Nizamat', 'Gaya', 'Hajipur', 'Jamalpur', 'Katihar', 'Madhubani', 'Motihari', 'Munger', 'Muzaffarpur', 'Patna', 'Purnia', 'Pusa', 'Saharsa', 'Samastipur', 'Sasaram', 'Sitamarhi', 'Siwan'],
  'Chhattisgarh': ['Ambikapur', 'Bhilai', 'Bilaspur', 'Dhamtari', 'Durg', 'Jagdalpur', 'Korba', 'Raipur', 'Rajnandgaon'],
  'Goa': ['Madgaon', 'Mapusa', 'Margao', 'Panaji', 'Ponda', 'Vasco da Gama'],
  'Gujarat': ['Ahmadabad', 'Ahmedabad', 'Amreli', 'Anand', 'Bharuch', 'Bhavnagar', 'Bhuj', 'Dwarka', 'Gandhinagar', 'Godhra', 'Jamnagar', 'Junagadh', 'Kandla', 'Khambhat', 'Kheda', 'Mahesana', 'Mehsana', 'Morbi', 'Nadiad', 'Navsari', 'Okha', 'Palanpur', 'Patan', 'Porbandar', 'Rajkot', 'Surat', 'Surendranagar', 'Vadodara', 'Valsad', 'Vapi', 'Veraval'],
  'Haryana': ['Ambala', 'Bhiwani', 'Chandigarh', 'Faridabad', 'Firozpur Jhirka', 'Gurugram', 'Hansi', 'Hisar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Panipat', 'Pehowa', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat'],
  'Himachal Pradesh': ['Baddi', 'Bilaspur', 'Chamba', 'Dalhousie', 'Dharamshala', 'Hamirpur', 'Kangra', 'Kullu', 'Mandi', 'Nahan', 'Shimla', 'Solan', 'Una'],
  'Jharkhand': ['Bokaro', 'Chaibasa', 'Deoghar', 'Dhanbad', 'Dumka', 'Giridih', 'Hazaribag', 'Hazaribagh', 'Jamshedpur', 'Jharia', 'Rajmahal', 'Ranchi', 'Saraikela'],
  'Karnataka': ['Badami', 'Ballari', 'Belagavi', 'Bengaluru', 'Bhadravati', 'Bidar', 'Chikkamagaluru', 'Chitradurga', 'Davangere', 'Hassan', 'Halebid', 'Hubballi', 'Hubballi-Dharwad', 'Kalaburagi', 'Kolar', 'Madikeri', 'Mandya', 'Mangaluru', 'Mysuru', 'Raichur', 'Shivamogga', 'Shravanabelagola', 'Shrirangapattana', 'Tumakuru', 'Udupi', 'Vijayapura'],
  'Kerala': ['Alappuzha', 'Idukki', 'Kannur', 'Kochi', 'Kollam', 'Kottayam', 'Kozhikode', 'Mattancheri', 'Palakkad', 'Thalassery', 'Thiruvananthapuram', 'Thrissur', 'Vatakara'],
  'Madhya Pradesh': ['Balaghat', 'Barwani', 'Betul', 'Bharhut', 'Bhind', 'Bhojpur', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dr. Ambedkar Nagar (Mhow)', 'Guna', 'Gwalior', 'Hoshangabad', 'Indore', 'Itarsi', 'Jabalpur', 'Jhabua', 'Khajuraho', 'Khandwa', 'Khargone', 'Maheshwar', 'Mandla', 'Mandsaur', 'Morena', 'Murwara', 'Narsimhapur', 'Narsinghgarh', 'Narwar', 'Neemuch', 'Nowgong', 'Orchha', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Sarangpur', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Ujjain', 'Vidisha'],
  'Maharashtra': ['Ahmadnagar', 'Akola', 'Amravati', 'Aurangabad', 'Bhandara', 'Bhusawal', 'Bid', 'Bhiwandi', 'Buldhana', 'Chandrapur', 'Daulatabad', 'Dhule', 'Jalgaon', 'Kalyan', 'Karli', 'Kolhapur', 'Mahabaleshwar', 'Malegaon', 'Matheran', 'Mumbai', 'Nagpur', 'Nanded', 'Nashik', 'Navi Mumbai', 'Osmanabad', 'Pandharpur', 'Parbhani', 'Pune', 'Ratnagiri', 'Sangli', 'Satara', 'Sevagram', 'Solapur', 'Thane', 'Ulhasnagar', 'Vasai-Virar', 'Wardha', 'Yavatmal'],
  'Manipur': ['Imphal', 'Churachandpur', 'Thoubal'],
  'Meghalaya': ['Cherrapunji', 'Jowai', 'Shillong', 'Tura'],
  'Mizoram': ['Aizawl', 'Champhai', 'Lunglei'],
  'Nagaland': ['Dimapur', 'Kohima', 'Mokokchung', 'Tuensang'],
  'Odisha': ['Balangir', 'Balasore', 'Baleshwar', 'Baripada', 'Berhampur', 'Bhubaneswar', 'Bhubaneshwar', 'Brahmapur', 'Cuttack', 'Dhenkanal', 'Kendujhar', 'Konark', 'Koraput', 'Paradip', 'Phulabani', 'Puri', 'Rourkela', 'Sambalpur', 'Udayagiri'],
  'Punjab': ['Amritsar', 'Batala', 'Bathinda', 'Chandigarh', 'Faridkot', 'Firozpur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mohali', 'Nabha', 'Patiala', 'Rupnagar', 'Sangrur'],
  'Rajasthan': ['Abu', 'Ajmer', 'Alwar', 'Amer', 'Barmer', 'Beawar', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittaurgarh', 'Churu', 'Dhaulpur', 'Dungarpur', 'Ganganagar', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalor', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Kishangarh', 'Kota', 'Merta', 'Nagaur', 'Nathdwara', 'Pali', 'Phalodi', 'Pushkar', 'Sawai Madhopur', 'Shahpura', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur'],
  'Sikkim': ['Gangtok', 'Gyalshing', 'Namchi', 'Pelling'],
  'Tamil Nadu': ['Arcot', 'Chengalpattu', 'Chennai', 'Chidambaram', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Hosur', 'Kanchipuram', 'Kanniyakumari', 'Kodaikanal', 'Kumbakonam', 'Madurai', 'Mamallapuram', 'Nagappattinam', 'Nagercoil', 'Palayamkottai', 'Pudukkottai', 'Rajapalayam', 'Ramanathapuram', 'Salem', 'Thanjavur', 'Tiruchchirappalli', 'Tirunelveli', 'Tiruppur', 'Thoothukudi', 'Udhagamandalam', 'Vellore'],
  'Telangana': ['Hyderabad', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Nizamabad', 'Sangareddi', 'Warangal'],
  'Tripura': ['Agartala', 'Dharmanagar', 'Udaipur'],
  'Uttar Pradesh': ['Agra', 'Aligarh', 'Amroha', 'Ayodhya', 'Azamgarh', 'Bahraich', 'Ballia', 'Banda', 'Bara Banki', 'Bareilly', 'Basti', 'Bijnor', 'Bithur', 'Budaun', 'Bulandshahr', 'Deoria', 'Etah', 'Etawah', 'Faizabad', 'Farrukhabad-cum-Fatehgarh', 'Fatehpur', 'Fatehpur Sikri', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur', 'Lakhimpur', 'Lalitpur', 'Lucknow', 'Mainpuri', 'Mathura', 'Meerut', 'Mirzapur-Vindhyachal', 'Moradabad', 'Muzaffarnagar', 'Noida', 'Partapgarh', 'Pilibhit', 'Prayagraj', 'Rae Bareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Shahjahanpur', 'Sitapur', 'Sultanpur', 'Varanasi'],
  'Uttarakhand': ['Almora', 'Dehradun', 'Haridwar', 'Haldwani', 'Mussoorie', 'Nainital', 'Pithoragarh', 'Rishikesh', 'Roorkee'],
  'West Bengal': ['Alipore', 'Alipur Duar', 'Asansol', 'Baharampur', 'Bally', 'Balurghat', 'Bankura', 'Baranagar', 'Barasat', 'Barrackpore', 'Basirhat', 'Bhatpara', 'Bishnupur', 'Budge Budge', 'Burdwan', 'Chandernagore', 'Darjeeling', 'Diamond Harbour', 'Dum Dum', 'Durgapur', 'Halisahar', 'Howrah', 'Hooghly', 'Ingraj Bazar', 'Jalpaiguri', 'Kalimpong', 'Kamarhati', 'Kanchrapara', 'Kharagpur', 'Cooch Behar', 'Kolkata', 'Krishnanagar', 'Malda', 'Midnapore', 'Murshidabad', 'Nabadwip', 'Palashi', 'Panihati', 'Purulia', 'Raiganj', 'Santipur', 'Shantiniketan', 'Serampore', 'Siliguri', 'Suri', 'Tamluk', 'Titagarh'],
  'Andaman and Nicobar Islands': ['Port Blair'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  'Delhi': ['Delhi', 'New Delhi'],
  'Jammu and Kashmir': ['Anantnag', 'Jammu', 'Srinagar', 'Udhampur'],
  'Ladakh': ['Kargil', 'Leh'],
  'Lakshadweep': ['Agatti', 'Kavaratti'],
  'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam']
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
  const [cityQuery, setCityQuery] = useState(address.city);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [onlineCities, setOnlineCities] = useState([]);

  useEffect(() => {
    setStateQuery(address.state);
  }, [address.state]);

  useEffect(() => {
    setCityQuery(address.city);
  }, [address.city]);

  useEffect(() => {
    const query = cityQuery.trim();
    if (!address.state || query.length < 3) {
      setOnlineCities([]);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=20&countrycodes=in&city=${encodeURIComponent(query)}&state=${encodeURIComponent(address.state)}`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'LoopPackExchange-AddressSearch/1.0' }, signal: controller.signal }
        );
        if (!response.ok) return;
        const results = await response.json();
        const names = results
          .map(result => result.address?.city || result.address?.town || result.address?.village || result.address?.municipality)
          .filter(Boolean)
          .filter((name, index, values) => values.findIndex(item => item.toLowerCase() === name.toLowerCase()) === index);
        setOnlineCities(names);
      } catch (error) {
        if (error.name !== 'AbortError') setOnlineCities([]);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [address.city, address.state, cityQuery]);

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

  const cityOptions = [...cities, ...onlineCities]
    .filter((city, index, values) => values.findIndex(item => item.toLowerCase() === city.toLowerCase()) === index)
    .filter(city => city.toLowerCase().includes(cityQuery.trim().toLowerCase()));

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

      <div style={{ position: 'relative' }}>
        <label htmlFor={`${idPrefix}-city`}>City</label>
        <input
          id={`${idPrefix}-city`}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={cityMenuOpen}
          value={address.city}
          onFocus={() => setCityMenuOpen(true)}
          onChange={event => {
            setCityQuery(event.target.value);
            update('city', event.target.value);
            setCityMenuOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setCityMenuOpen(false);
              setCityQuery(address.city);
            }, 120);
          }}
          placeholder={address.state ? 'Search or select a city' : 'Select a state first'}
          disabled={!address.state}
          required={required}
        />
        <input type="hidden" name={`${idPrefix}.city`} value={address.city} readOnly />
        {cityMenuOpen && address.state && (
          <div
            id={`${idPrefix}-city-options`}
            role="listbox"
            style={{ position: 'absolute', zIndex: 2, top: '100%', left: 0, right: 0, maxHeight: '220px', overflowY: 'auto', background: 'white', border: '1px solid #CBD5E1', borderRadius: '6px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)' }}
          >
            {cityOptions.length > 0 ? cityOptions.map(city => (
              <button
                key={city}
                type="button"
                role="option"
                aria-selected={city === address.city}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  setCityQuery(city);
                  setCityMenuOpen(false);
                  update('city', city);
                }}
                style={{ display: 'block', width: '100%', border: 0, background: city === address.city ? '#F0FDF4' : 'white', color: '#0F172A', textAlign: 'left', padding: '9px 10px', cursor: 'pointer' }}
              >
                {city}
              </button>
            )) : (
              <div style={{ padding: '9px 10px', color: '#64748B', fontSize: '0.88rem' }}>Type 3 or more letters to search OpenStreetMap cities and towns</div>
            )}
          </div>
        )}
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
