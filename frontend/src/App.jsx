import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
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
  
  // Nearby mode state
  const [nearbyMode, setNearbyMode] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [basemap, setBasemap] = useState('dark'); // dark, light, satellite
  const [radius, setRadius] = useState(1000); // 1km default
  const [nearbyResults, setNearbyResults] = useState([]);
  const [searchPoint, setSearchPoint] = useState(null); // [lat, lon]
  const [newPoint, setNewPoint] = useState(null); // For adding new facility
  const [formData, setFormData] = useState({ nama: '', jenis: 'Masjid', alamat: '' });

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
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      setGeoData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
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
      console.error("Error fetching nearby data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFacility = async (e) => {
    e.preventDefault();
    if (!newPoint) return alert("Pilih lokasi di peta terlebih dahulu!");
    
    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/fasilitas`, {
        ...formData,
        longitude: newPoint.lng,
        latitude: newPoint.lat
      });
      alert("Fasilitas berhasil ditambahkan!");
      setAddMode(false);
      setNewPoint(null);
      setFormData({ nama: '', jenis: 'Masjid', alamat: '' });
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error creating facility:", error.response?.data?.detail || error.message);
      alert("Gagal menambahkan fasilitas: " + (JSON.stringify(error.response?.data?.detail) || error.message));
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
              setNewPoint(null);
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

        {addMode && (
          <form onSubmit={handleCreateFacility} className="glass-card" style={{display:'flex', flexDirection:'column', gap:'14px'}}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h4 style={{fontSize:'0.75rem', fontWeight:700, opacity:0.4, letterSpacing: '0.05em'}}>NEW FACILITY</h4>
                {newPoint && <div style={{width:8, height:8, borderRadius:'50%', background:'#10b981', boxShadow: '0 0 10px #10b981'}}></div>}
             </div>
             
             {!newPoint ? (
               <div style={{fontSize:'0.75rem', padding:'12px', background:'rgba(255, 255, 255, 0.03)', color:'var(--text-muted)', borderRadius:'14px', border:'1px dashed rgba(255,255,255,0.1)', textAlign: 'center'}}>
                 Tap on map to set location
               </div>
             ) : (
               <div style={{fontSize:'0.7rem', color:'white', fontWeight:600, textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px'}}>
                 📍 {newPoint.lat.toFixed(5)}, {newPoint.lng.toFixed(5)}
               </div>
             )}
             
             <input placeholder="Name" className="search-bar" required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})}/>
             <select className="search-bar" value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value})}>
               {Object.keys(CATEGORIES).filter(c => c !== 'Default').map(c => (
                 <option key={c} value={c}>{c}</option>
               ))}
             </select>
             <textarea placeholder="Address" className="search-bar" style={{minHeight:'70px', borderRadius:'14px'}} value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})}/>
             <button type="submit" className="nearby-btn active" style={{width:'100%', background: 'white', color: 'black'}}>Create</button>
          </form>
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
                    coords: null,
                  };

              return (
                <div
                  key={i}
                  className="facility-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (item.coords) {
                      const [lon, lat] = item.coords;
                      window.mapInstance.flyTo([lat, lon], 17, { animate: true, duration: 1.5 });
                    } else {
                      const fullFeature = geoData.features.find((feat) => feat.id === item.id);
                      if (fullFeature) {
                        const [lon, lat] = fullFeature.geometry.coordinates;
                        window.mapInstance.flyTo([lat, lon], 17, { animate: true, duration: 1.5 });
                      }
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
          {geoData && (
            <GeoJSON 
              ref={geoJsonRef}
              data={geoData} 
              pointToLayer={pointToLayer}
              onEachFeature={onEachFeature}
            />
          )}
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
        </MapContainer>
      </main>
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

export default App;
