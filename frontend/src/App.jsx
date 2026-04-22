import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import styled from 'styled-components';
import { 
  Map as MapIcon, 
  Search, 
  Navigation, 
  Info, 
  Layers,
  Phone,
  MapPin,
  Building2,
  School,
  Hospital,
  ShoppingBag,
  Trees,
  X,
  Crosshair,
  LocateFixed,
  PlusCircle,
  MapPin as MapPinIcon
} from 'lucide-react';
import { Circle, Popup, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORIES, MAP_CENTER, BASE_URL, API_URL } from './constants';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CategoryIcon = ({ type, size = 18, color }) => {
  const props = { size, color: color || '#fff' };
  switch (type) {
    case 'Masjid': return <Building2 {...props} />;
    case 'Sekolah': return <School {...props} />;
    case 'Puskesmas': return <Hospital {...props} />;
    case 'Minimarket': return <ShoppingBag {...props} />;
    case 'Taman': return <Trees {...props} />;
    default: return <MapPin {...props} />;
  }
};

function App() {
  const geoJsonRef = React.useRef(null);
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(!token ? 'login' : null); // Show login popup on startup if no token
  const [authForm, setAuthForm] = useState({ username: '', password: '', email: '' });

  // Mode state
  const [nearbyMode, setNearbyMode] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [basemap, setBasemap] = useState('dark'); 
  const [radius, setRadius] = useState(1000); 
  const [nearbyResults, setNearbyResults] = useState([]);
  const [searchPoint, setSearchPoint] = useState(null); 
  const [newPoint, setNewPoint] = useState(null); 
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [formData, setFormData] = useState({ nama: '', jenis: 'Masjid', alamat: '' });
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'info', title = null) => {
    const id = Date.now();
    const titles = { success: 'Success', error: 'Error', info: 'Info' };
    setNotifications(prev => [...prev, { id, message, type, title: title || titles[type] }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const stats = useMemo(() => {
    if (!geoData) return {};
    const counts = {};
    geoData.features.forEach(f => {
      counts[f.properties.jenis] = (counts[f.properties.jenis] || 0) + 1;
    });
    return counts;
  }, [geoData]);

  useEffect(() => {
    fetchData();
    if (token) {
      verifyToken();
    }
  }, []);

  const verifyToken = async (manualToken = null) => {
    const targetToken = manualToken || token;
    if (!targetToken) return;
    
    try {
      const response = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${targetToken}` }
      });
      setUser(response.data);
    } catch (error) {
      if (!manualToken) { // Only clear if it was an automatic check
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        showNotification("Session expired. Please login again.", "info", "Session");
      }
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      setGeoData(response.data);
    } catch (error) {
      showNotification("Failed to fetch map data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNearbySearch = async (lat, lon) => {
    try {
      setLoading(true);
      setSearchPoint([lat, lon]);
      const response = await axios.get(`${BASE_URL}/fasilitas/nearby`, {
        params: { lat, lon, radius }
      });
      setNearbyResults(response.data);
      
      if (window.mapInstance) {
        window.mapInstance.flyTo([lat, lon], 15);
      }
    } catch (error) {
      showNotification("Failed to search nearby area", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams();
      params.append('username', authForm.username);
      params.append('password', authForm.password);
      
      const response = await axios.post(`${BASE_URL}/auth/login`, params);
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      await verifyToken(access_token); // Update user profile immediately
      setAuthMode(null);
      showNotification("Login berhasil!", "success");
    } catch (error) {
      showNotification(error.response?.data?.detail || "Cek username/password", "error", "Login Gagal");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, authForm);
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      await verifyToken(access_token); // Update user profile immediately
      setAuthMode(null);
      showNotification("Registrasi berhasil!", "success");
    } catch (error) {
      showNotification(error.response?.data?.detail || "Cek data Anda", "error", "Registrasi Gagal");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveMarkerId(null);
    localStorage.removeItem('token');
    showNotification("Berhasil logout!", "info");
  };

  const handleCreateFacility = async (e) => {
    e.preventDefault();
    if (!token) return setAuthMode('login');
    if (!newPoint) return showNotification("Pilih lokasi di peta terlebih dahulu!", "error", "Lengkapi Data");
    
    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/fasilitas`, {
        ...formData,
        longitude: newPoint.lng,
        latitude: newPoint.lat
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification("Fasilitas berhasil ditambahkan!", "success");
      setAddMode(false);
      setNewPoint(null);
      setFormData({ nama: '', jenis: 'Masjid', alamat: '' });
      fetchData(); 
    } catch (error) {
      showNotification(error.response?.data?.detail || error.message, "error", "Gagal Menambahkan");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFacility = async (e) => {
    e.preventDefault();
    if (!token) return setAuthMode('login');
    
    try {
      setLoading(true);
      const updateData = { ...formData };
      if (newPoint) {
        updateData.longitude = newPoint.lng;
        updateData.latitude = newPoint.lat;
      }
      
      await axios.put(`${BASE_URL}/fasilitas/${editingId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification("Fasilitas berhasil diperbarui!", "success");
      setEditMode(false);
      setEditingId(null);
      setNewPoint(null);
      setFormData({ nama: '', jenis: 'Masjid', alamat: '' });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.detail || error.message, "error", "Gagal Memperbarui");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFacility = async (id) => {
    if (!token) return setAuthMode('login');
    if (!window.confirm("Yakin ingin menghapus fasilitas ini?")) return;
    
    try {
      setLoading(true);
      await axios.delete(`${BASE_URL}/fasilitas/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification("Fasilitas berhasil dihapus!", "success");
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.detail || error.message, "error", "Gagal Menghapus");
    } finally {
      setLoading(false);
    }
  };

  const triggerPulseEffect = (categoryName) => {
    if (!geoJsonRef.current) return;
    
    geoJsonRef.current.eachLayer(layer => {
      // If categoryName is null/undefined, pulse ALL. Otherwise, only specific category.
      if (!categoryName || (layer.feature && layer.feature.properties.jenis === categoryName)) {
        const el = layer.getElement();
        if (el) {
          const markerInner = el.querySelector('.custom-marker');
          if (markerInner) {
            markerInner.classList.remove('marker-pulse-effect');
            void markerInner.offsetWidth; // Trigger reflow
            markerInner.classList.add('marker-pulse-effect');
            
            // Clean up after animation
            setTimeout(() => {
              markerInner.classList.remove('marker-pulse-effect');
            }, 1000);
          }
        }
      }
    });
  };

  const getIconSvg = (type) => {
    switch (type) {
      case 'Masjid': return '<path d="M22 22v-4a5 5 0 0 0-10 0v4"/><path d="M12 18V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v12"/><path d="M12 10a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v8"/><path d="M6 12H4a2 2 0 0 0-2 2v4"/><path d="M18 8h2a2 2 0 0 1 2 2v8"/><path d="M2 22h20"/>';
      case 'Sekolah': return '<path d="m12 3 10 5-10 5-10-5z"/><path d="m22 8-10 5-10-5"/><path d="M2 17c0-3 3.5-5 10-5s10 2 10 5v2H2z"/>';
      case 'Puskesmas': return '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M12 11h4"/><path d="M14 9v4"/><path d="M10 11h.01"/><path d="M10 15h.01"/><path d="M10 19h.01"/><path d="M14 15h.01"/><path d="M14 19h.01"/>';
      case 'Minimarket': return '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>';
      case 'Taman': return '<path d="m11 20 1.5-1.5L14 20l-1.5 1.5L11 20Z"/><path d="m15 14 1.5-1.5L18 14l-1.5 1.5L15 14Z"/><path d="m7 14 1.5-1.5L10 14 8.5 15.5 7 14Z"/><path d="m11 8 1.5-1.5L14 8l-1.5 1.5L11 8Z"/><path d="M9 22H3"/><path d="M15 22h6"/><path d="M12 2v2"/><path d="M12 8v2"/><path d="M12 14v2"/>';
      default: return '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';
    }
  };

  const pointToLayer = (feature, latlng) => {
    const category = CATEGORIES[feature.properties.jenis] || CATEGORIES.Default;
    const iconSvg = getIconSvg(feature.properties.jenis);
    
    const markerHtml = `
      <div class="custom-marker" style="background-color: ${category.color}; border: 2px solid white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${iconSvg}
        </svg>
      </div>
    `;

    return L.marker(latlng, {
      icon: L.divIcon({
        className: 'custom-div-icon',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      })
    });
  };

  const onEachFeature = (feature, layer) => {
    const category = CATEGORIES[feature.properties.jenis] || CATEGORIES.Default;
    
    layer.on({
      mouseover: (e) => {
        const el = e.target.getElement();
        if (el) {
          const marker = el.querySelector('.custom-marker');
          if (marker) {
            marker.style.transform = 'scale(1.4) translateY(-8px)';
            marker.style.boxShadow = `0 12px 24px ${category.color}88`;
            marker.style.zIndex = '1000';
          }
        }
      },
      mouseout: (e) => {
        const el = e.target.getElement();
        if (el) {
          const marker = el.querySelector('.custom-marker');
          if (marker) {
            marker.style.transform = 'scale(1) translateY(0)';
            marker.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
            marker.style.zIndex = '1';
          }
        }
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e);
      }
    });

    const popupContent = `
      <div class="popup-container" style="overflow: hidden; border-radius: 12px;">
        <div class="popup-header" style="background: ${category.color}; color: white; padding: 15px;">
          <h3 style="margin:0; font-size: 1.1rem">${feature.properties.nama}</h3>
          <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9">${feature.properties.jenis}</span>
        </div>
        <div class="popup-body" style="padding: 15px; background: #0f172a; color: #cbd5e1;">
          <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:12px">
            <svg style="flex-shrink:0; margin-top:3px" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="font-size: 0.9rem; line-height: 1.4">${feature.properties.alamat}</span>
          </div>
          <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px;">
            ID Fasilitas: #${feature.id || 'N/A'}
          </div>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${feature.geometry.coordinates[1]},${feature.geometry.coordinates[0]}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; background: ${category.color}; color: white; border: none; padding: 10px; border-radius: 8px; width: 100%; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
             Lihat Rute <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </a>
        </div>
      </div>
    `;

    layer.bindPopup(popupContent, { maxWidth: 300, minWidth: 250 });
  };

  const filteredFeatures = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.filter(f => {
      const matchesSearch = f.properties.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.properties.jenis.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory ? f.properties.jenis === activeCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [geoData, searchTerm, activeCategory]);


  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="auth-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px'}}>
          {token && user ? (
            <div style={{display:'flex', alignItems:'center', gap:'10px', width: '100%', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)'}}>
              <div style={{width:36, height:36, borderRadius:'50%', background:'white', color: 'black', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', fontWeight:800, boxShadow: '0 0 15px rgba(255,255,255,0.3)'}}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div style={{flex: 1}}>
                <div style={{fontSize: '0.85rem', fontWeight: 700, color: 'white'}}>Hi, {user.username}</div>
                <div style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{user.status === 'authenticated' ? 'Premium Member' : 'Guest'}</div>
              </div>
              <button onClick={handleLogout} style={{background:'rgba(255,255,255,0.1)', border:'none', color:'white', fontSize:'0.7rem', cursor:'pointer', padding:'6px 10px', borderRadius: '8px', fontWeight: 600}}>Logout</button>
            </div>
          ) : (
            <div style={{display:'flex', gap:'8px', width: '100%'}}>
              <button 
                onClick={() => setAuthMode('login')} 
                style={{flex: 1, background:'rgba(255,255,255,0.05)', border:'none', color:'white', padding:'10px', borderRadius:'14px', fontSize:'0.85rem', cursor:'pointer', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)'}}
              >Login</button>
              <button 
                onClick={() => setAuthMode('register')} 
                style={{flex: 1, background:'white', border:'none', color:'black', padding:'10px', borderRadius:'14px', fontSize:'0.85rem', cursor:'pointer', fontWeight:700, boxShadow: '0 4px 15px rgba(255,255,255,0.2)'}}
              >Sign Up</button>
            </div>
          )}
        </div>

        <div style={{marginBottom: '4px'}}>
          <h1 style={{letterSpacing: '-0.04em'}}>Public <span style={{fontWeight: 400, opacity: 0.6}}>Map</span></h1>
          <p className="subtitle">Visualisasi Fasilitas Publik Kota Bandar Lampung</p>
        </div>

        <div className="search-container">
          <input 
            type="text" 
            className="search-bar" 
            placeholder="Search facilities..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} style={{position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', opacity:0.4}} />
        </div>

        <div className="stats-grid">
          {/* Total Widget */}
          <div 
            className="stat-widget"
            style={{ borderBottom: '3px solid white', cursor: 'pointer' }}
            onClick={() => {
              setActiveCategory(null);
              triggerPulseEffect(null); // Pulse all markers
            }}
          >
            <MapIcon size={16} color="white" style={{opacity: 0.6}} />
            <span style={{fontSize:'1.3rem', fontWeight:800, lineHeight: 1}}>{geoData ? geoData.features.length : 0}</span>
            <span style={{fontSize:'0.6rem', fontWeight:700, opacity:0.4}}>TOTAL</span>
          </div>

          {Object.entries(CATEGORIES).filter(([k]) => k !== 'Default').map(([name, config]) => (
            <div 
              key={name} 
              className={`stat-widget ${activeCategory === name ? 'active' : ''}`}
              style={{
                cursor: 'pointer',
                borderBottom: activeCategory === name ? `3px solid ${config.color}` : '3px solid transparent'
              }}
              onClick={() => {
                const newCat = activeCategory === name ? null : name;
                setActiveCategory(newCat);
                if (newCat) triggerPulseEffect(newCat);
              }}
            >
              <CategoryIcon type={name} size={16} color={config.color} />
              <span style={{fontSize:'1.3rem', fontWeight:700, lineHeight: 1}}>{stats[name] || 0}</span>
              <span style={{fontSize:'0.6rem', fontWeight:700, color: 'var(--text-muted)'}}>{name.toUpperCase()}</span>
            </div>
          ))}
        </div>

        <div className="nearby-toggle-container" style={{display:'flex', gap:'12px'}}>
          <button 
            className={`nearby-btn ${nearbyMode ? 'active' : ''}`}
            style={{flex:1}}
            onClick={() => {
              setNearbyMode(!nearbyMode);
              setAddMode(false);
              setEditMode(false);
              if (!nearbyMode) {
                setNearbyResults([]);
                setSearchPoint(null);
              }
            }}
          >
            {nearbyMode ? <X size={18} /> : <Crosshair size={18} />}
            <span>Area</span>
          </button>

          <button 
            className={`nearby-btn ${addMode ? 'active' : ''}`}
            style={{flex:1}}
            onClick={() => {
              setAddMode(!addMode);
              setNearbyMode(false);
              setEditMode(false);
              setNewPoint(null);
              setFormData({ nama: '', jenis: 'Masjid', alamat: '' });
            }}
          >
            {addMode ? <X size={18} /> : <PlusCircle size={18} />}
            <span>Tambah</span>
          </button>
        </div>

        {nearbyMode && (
          <div className="glass-card" style={{boxShadow: 'var(--nm-in)', padding: '20px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', fontSize:'0.8rem', fontWeight: 600}}>
              <span>Radius</span>
              <span style={{color: 'white', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px'}}>{radius}m</span>
            </div>
            <input 
              type="range" 
              min="100" 
              max="5000" 
              step="100" 
              value={radius} 
              onChange={(e) => setRadius(parseInt(e.target.value))}
              style={{width: '100%', accentColor: 'white'}}
            />
          </div>
        )}

        {(addMode || editMode) && (
          <form onSubmit={editMode ? handleUpdateFacility : handleCreateFacility} className="glass-card" style={{display:'flex', flexDirection:'column', gap:'14px'}}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h4 style={{fontSize:'0.75rem', fontWeight:700, opacity:0.4, letterSpacing: '0.05em'}}>{editMode ? 'EDIT FACILITY' : 'NEW FACILITY'}</h4>
                {(newPoint || editMode) && <div style={{width:8, height:8, borderRadius:'50%', background:'#10b981', boxShadow: '0 0 10px #10b981'}}></div>}
             </div>
             
             {!newPoint && !editMode ? (
               <div style={{fontSize:'0.75rem', padding:'12px', background:'rgba(255, 255, 255, 0.03)', color:'var(--text-muted)', borderRadius:'14px', border:'1px dashed rgba(255,255,255,0.1)', textAlign: 'center'}}>
                 Tap on map to set location
               </div>
             ) : newPoint ? (
               <div style={{fontSize:'0.7rem', color:'white', fontWeight:600, textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px'}}>
                 📍 {newPoint.lat.toFixed(5)}, {newPoint.lng.toFixed(5)}
               </div>
             ) : null}
             
             <input placeholder="Name" className="search-bar" required minLength={3} value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})}/>
             <select className="search-bar" value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value})}>
               {Object.keys(CATEGORIES).filter(c => c !== 'Default').map(c => (
                 <option key={c} value={c}>{c}</option>
               ))}
             </select>
             <textarea placeholder="Address (Min 5 chars)" className="search-bar" style={{minHeight:'70px', borderRadius:'14px'}} minLength={5} value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})}/>
             <div style={{display:'flex', gap:'10px'}}>
                <button type="submit" className="nearby-btn active" style={{flex:2, background: 'white', color: 'black'}}>{editMode ? 'Update' : 'Create'}</button>
                {editMode && (
                  <button type="button" onClick={() => {setEditMode(false); setEditingId(null); setNewPoint(null);}} className="nearby-btn" style={{flex:1}}><X size={18}/></button>
                )}
             </div>
          </form>
        )}

        {authMode && (
          <div className="auth-overlay" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)'}}>
            <StyledAuthWrapper>
              <form className="form" onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
                <p id="heading">{authMode === 'login' ? 'Login' : 'Registration'}</p>
                <div className="field">
                  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z" />
                  </svg>
                  <input 
                    autoComplete="off" 
                    placeholder="Username" 
                    className="input-field" 
                    type="text" 
                    required 
                    minLength={3}
                    value={authForm.username}
                    onChange={e => setAuthForm({...authForm, username: e.target.value})}
                  />
                </div>

                {authMode === 'register' && (
                  <div className="field">
                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="currentColor" viewBox="0 0 16 16">
                      <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/>
                    </svg>
                    <input 
                      placeholder="Email" 
                      className="input-field" 
                      type="email" 
                      required 
                      value={authForm.email}
                      onChange={e => setAuthForm({...authForm, email: e.target.value})}
                    />
                  </div>
                )}

                <div className="field">
                  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  </svg>
                  <input 
                    placeholder="Password" 
                    className="input-field" 
                    type="password" 
                    required 
                    minLength={6}
                    value={authForm.password}
                    onChange={e => setAuthForm({...authForm, password: e.target.value})}
                  />
                </div>

                <div className="btn">
                  <button type="submit" className="button1">
                    {authMode === 'login' ? 'Login' : 'Register'}
                  </button>
                  <button 
                    type="button" 
                    className="button2" 
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  >
                    {authMode === 'login' ? 'Sign Up' : 'To Login'}
                  </button>
                </div>
                
                <button type="button" className="button3" onClick={() => setAuthMode(null)}>
                  Continue as Guest
                </button>
              </form>
            </StyledAuthWrapper>
          </div>
        )}

        <div className="facility-list">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', padding: '5px 0 15px'}}>
             <h4 style={{fontSize:'0.8rem', fontWeight: 700, opacity: 0.3, letterSpacing: '0.05em'}}>
               {nearbyMode ? `EXPLORE NEARBY` : `ALL FACILITIES`}
             </h4>
             <span style={{fontSize:'0.7rem', opacity:0.4}}>{nearbyMode ? nearbyResults.length : filteredFeatures.length} items</span>
          </div>
          {loading ? (
            <div style={{ opacity: 0.5, textAlign: 'center' }}>Loading data...</div>
          ) : (
            (nearbyMode ? nearbyResults : filteredFeatures).map((f, i) => {
              // Standardize object structure (GeoJSON feature vs API row)
              const item = f.properties
                ? {
                    id: f.id,
                    nama: f.properties.nama,
                    jenis: f.properties.jenis,
                    alamat: f.properties.alamat,
                    coords: f.geometry.coordinates,
                  }
                : {
                    id: f.id,
                    nama: f.nama,
                    jenis: f.jenis,
                    alamat: f.alamat,
                    jarak: f.jarak,
                    coords: [f.longitude, f.latitude],
                  };

              return (
                <div
                  key={i}
                  className={`facility-item ${activeMarkerId === item.id ? 'active' : ''}`}
                  style={{ 
                    cursor: 'pointer',
                    background: activeMarkerId === item.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderLeft: activeMarkerId === item.id ? `4px solid ${ (CATEGORIES[item.jenis] || CATEGORIES.Default).color }` : '4px solid transparent'
                  }}
                  onClick={() => {
                    setActiveMarkerId(item.id);
                    if (item.coords && item.coords[0] !== undefined) {
                      const [lon, lat] = item.coords;
                      window.mapInstance.flyTo([lat, lon], 17, { animate: true, duration: 1.5 });
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        padding: '12px',
                        borderRadius: '16px',
                        boxShadow: 'var(--nm-in-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CategoryIcon
                        type={item.jenis}
                        color={(CATEGORIES[item.jenis] || CATEGORIES.Default).color}
                        size={20}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em', marginBottom: '2px' }}>
                        {item.nama}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.alamat}</span>
                        {item.jarak && (
                          <span style={{ fontWeight: 700, color: 'white' }}>
                            {Math.round(item.jarak)}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      <main className="map-container">
        <MapContainer center={MAP_CENTER} zoom={14} scrollWheelZoom={true} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={
              basemap === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" :
              basemap === 'satellite' ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" :
              "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            }
          />
          {filteredFeatures.map((f, i) => {
            const [lon, lat] = f.geometry.coordinates;
            const category = CATEGORIES[f.properties.jenis] || CATEGORIES.Default;
            const isActive = activeMarkerId === f.id;
            
            return (
              <Marker 
                key={f.id || i} 
                position={[lat, lon]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `
                    <div class="custom-marker ${isActive ? 'active-highlight' : ''}" style="background-color: ${category.color}; border: 2px solid white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); transform: ${isActive ? 'scale(1.4)' : 'scale(1)'}; transition: all 0.3s ease;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${getIconSvg(f.properties.jenis)}
                      </svg>
                    </div>
                  `,
                  iconSize: [34, 34],
                  iconAnchor: [17, 17]
                })}
                eventHandlers={{
                  click: () => setActiveMarkerId(f.id)
                }}
              >
                <Popup maxWidth={300} minWidth={250}>
                  <div className="popup-container" style={{overflow: 'hidden', borderRadius: '12px'}}>
                    <div className="popup-header" style={{background: category.color, color: 'white', padding: '15px'}}>
                      <h3 style={{margin:0, fontSize: '1.1rem'}}>{f.properties.nama}</h3>
                      <span style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9}}>{f.properties.jenis}</span>
                    </div>
                    <div className="popup-body" style={{padding: '15px', background: '#0f172a', color: '#cbd5e1'}}>
                      <div style={{display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'12px'}}>
                        <MapPin size={16} style={{flexShrink:0, marginTop:3}} />
                        <span style={{fontSize: '0.9rem', lineHeight: 1.4}}>{f.properties.alamat}</span>
                      </div>
                      
                      {token && (
                        <div style={{display: 'flex', gap: '8px', marginTop: '15px'}}>
                          <button 
                            onClick={() => {
                              setEditMode(true);
                              setAddMode(false);
                              setEditingId(f.id);
                              setFormData({
                                nama: f.properties.nama,
                                jenis: f.properties.jenis,
                                alamat: f.properties.alamat
                              });
                              setNewPoint({ lat, lng: lon });
                            }}
                            style={{flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'}}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteFacility(f.id)}
                            style={{flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'}}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          <div className="map-controls">
                <button 
                  className={`control-btn ${basemap === 'dark' ? 'active' : ''}`}
                  title="Dark Map" 
                  onClick={() => setBasemap('dark')}
                >
                  <Layers size={20} />
                </button>
                <button 
                  className={`control-btn ${basemap === 'light' ? 'active' : ''}`}
                  title="Street Map" 
                  onClick={() => setBasemap('light')}
                >
                  <MapIcon size={20} />
                </button>
                <button 
                  className={`control-btn ${basemap === 'satellite' ? 'active' : ''}`}
                  title="Satellite Map" 
                  onClick={() => setBasemap('satellite')}
                >
                  <MapPinIcon size={20} />
                </button>
          </div>
          <MapController />
          <MapClickHandler 
            nearbyMode={nearbyMode} 
            addMode={addMode} 
            onMapClick={handleNearbySearch} 
            onAddPoint={setNewPoint} 
          />
          
          {searchPoint && nearbyMode && (
            <>
              <Circle 
                center={searchPoint} 
                radius={radius} 
                pathOptions={{
                  fillColor: 'var(--primary)', 
                  fillOpacity: 0.1, 
                  color: 'var(--primary)', 
                  weight: 1, 
                  dashArray: '5, 10'
                }} 
              />
              <Marker position={searchPoint}>
                <Popup>
                  <div style={{textAlign:'center'}}>
                    <strong>Titik Pencarian</strong><br/>
                    Radius: {radius}m
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {newPoint && addMode && (
            <Marker position={newPoint}>
               <Popup>Lokasi Fasilitas Baru</Popup>
            </Marker>
          )}

          <MapController />
          <MapClickHandler 
            nearbyMode={nearbyMode} 
            addMode={addMode} 
            onMapClick={handleNearbySearch} 
            onAddPoint={setNewPoint} 
          />
        </MapContainer>
      </main>

      <div className="notification-container">
        {notifications.map(n => (
          <div key={n.id} className={`notification-toast ${n.type}`}>
            <div className="notification-content">
              <div className="notification-title">{n.title}</div>
              <div className="notification-message">{n.message}</div>
            </div>
            <button className="notification-close" onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}>
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper to access map instance
function MapController() {
  const map = useMap();
  useEffect(() => {
    window.mapInstance = map;
  }, [map]);
  return null;
}

// Map Click Handler Component
function MapClickHandler({ isEnabled, nearbyMode, addMode, onMapClick, onAddPoint }) {
  useMapEvents({
    click: (e) => {
      if (nearbyMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      } else if (addMode) {
        onAddPoint(e.latlng);
      }
    },
  });
  return null;
}
const StyledAuthWrapper = styled.div`
  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-left: 2em;
    padding-right: 2em;
    padding-bottom: 0.4em;
    background-color: #171717;
    border-radius: 25px;
    transition: .4s ease-in-out;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .form:hover {
    transform: scale(1.02);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  #heading {
    text-align: center;
    margin: 2em;
    color: rgb(255, 255, 255);
    font-size: 1.5em;
    font-weight: 700;
  }

  .field {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    border-radius: 25px;
    padding: 0.6em;
    border: none;
    outline: none;
    color: white;
    background-color: #171717;
    box-shadow: inset 2px 5px 10px rgb(5, 5, 5);
  }

  .input-icon {
    height: 1.3em;
    width: 1.3em;
    fill: white;
  }

  .input-field {
    background: none;
    border: none;
    outline: none;
    width: 100%;
    color: #d3d3d3;
    padding: 5px;
  }

  .form .btn {
    display: flex;
    justify-content: center;
    flex-direction: row;
    margin-top: 2.5em;
    gap: 10px;
  }

  .button1 {
    padding: 0.6em 1.2em;
    border-radius: 12px;
    border: none;
    outline: none;
    transition: .4s ease-in-out;
    background-color: white;
    color: black;
    font-weight: 700;
    cursor: pointer;
  }

  .button1:hover {
    background-color: #d1d1d1;
    transform: translateY(-2px);
  }

  .button2 {
    padding: 0.6em 1.2em;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    outline: none;
    transition: .4s ease-in-out;
    background-color: #252525;
    color: white;
    cursor: pointer;
  }

  .button2:hover {
    background-color: #333;
    transform: translateY(-2px);
  }

  .button3 {
    margin-top: 1em;
    margin-bottom: 2em;
    padding: 0.5em;
    border-radius: 12px;
    border: none;
    outline: none;
    transition: .4s ease-in-out;
    background: transparent;
    color: #666;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .button3:hover {
    color: white;
  }
`;

export default App;
