import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
      map.invalidateSize();
    }
  }, [center, map]);
  return null;
}

export default function App() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [locStatus, setLocStatus] = useState('Acquiring location...');
  const [issues, setIssues] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  // Reverse Geocoding to get address name from coordinates
  const fetchAddressName = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setLocationName(data.display_name);
      } else {
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch {
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const requestDeviceLocation = () => {
    setLocStatus('Syncing GPS...');
    if (!navigator.geolocation) {
      setLocStatus('Geolocation not supported by browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        fetchAddressName(coords.lat, coords.lng);
        setLocStatus(`GPS Active: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocStatus('Location permission denied or unavailable.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    requestDeviceLocation();
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setIssues(data);
  };

  const handleCitySearch = async (e) => {
    e.preventDefault();
    if (!searchCity.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchCity)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const newCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setLocation(newCoords);
        setLocationName(data[0].display_name);
        setLocStatus(`Set: ${data[0].display_name}`);
      } else {
        alert('Location not found. Try entering e.g., "Bhadravathi"');
      }
    } catch (err) {
      alert('Error searching for location.');
    }
  };

  const parsePoint = (pointStr) => {
    if (!pointStr) return null;
    const match = pointStr.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!match) return null;
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return alert('Location is required to submit an issue.');
    setLoading(true);

    try {
      let photoUrl = null;
      if (file) {
        const filePath = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('issue-photos')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        photoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/issue-photos/${filePath}`;
      }

      const pointLocation = `POINT(${location.lng} ${location.lat})`;

      const { error: insertError } = await supabase.from('issues').insert([
        {
          title,
          description,
          photo_url: photoUrl,
          location: pointLocation,
          category_id: parseInt(categoryId),
        },
      ]);

      if (insertError) throw insertError;

      setTitle('');
      setDescription('');
      setFile(null);
      fetchIssues();
      alert('Civic issue submitted successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = filterCategory === 'all'
    ? issues
    : issues.filter((i) => i.category_id === parseInt(filterCategory));

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Civic Issue Tracker</h1>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
        <h2 className="text-xl font-semibold text-gray-700">Report a New Issue</h2>
        
        <input
          type="text"
          placeholder="Issue Title (e.g. Broken Streetlight)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="p-3 border rounded-md w-full bg-white text-gray-800"
          required
        />

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="p-3 border rounded-md w-full bg-white text-gray-800"
        >
          <option value="1">Roads & Potholes</option>
          <option value="2">Street Lighting</option>
          <option value="3">Water & Drainage</option>
          <option value="4">Sanitation & Garbage</option>
        </select>

        {/* Dedicated Location Field Slot */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">Issue Location Slot</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={locationName || (location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'No location selected')}
              className="p-3 border rounded-md w-full bg-gray-100 text-gray-700 font-medium"
            />
            <button
              type="button"
              onClick={requestDeviceLocation}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold px-4 rounded whitespace-nowrap"
            >
              📍 Use GPS
            </button>
          </div>
          <span className="text-xs text-gray-500">Tip: You can also search below or drag the map pin to update this slot.</span>
        </div>

        <textarea
          placeholder="Detailed Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="p-3 border rounded-md w-full bg-white text-gray-800 h-24"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="p-2 text-sm text-gray-600"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition disabled:bg-gray-400"
        >
          {loading ? 'Submitting...' : 'Report Issue'}
        </button>
      </form>

      {/* Interactive Map Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-gray-800">Interactive Issue Map</h2>
          
          <form onSubmit={handleCitySearch} className="flex gap-1 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search city/area (e.g. Bhadravathi)"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="p-1 px-2 border rounded text-sm bg-white text-gray-800 w-full"
            />
            <button type="submit" className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-medium">
              Search
            </button>
          </form>
        </div>
        <p className="text-xs text-blue-600 font-medium mb-3">{locStatus}</p>

        <div className="h-80 w-full rounded-lg overflow-hidden border border-gray-300 shadow-sm bg-gray-100 flex items-center justify-center">
          {location ? (
            <MapContainer center={[location.lat, location.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
              <ChangeView center={[location.lat, location.lng]} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={[location.lat, location.lng]}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const pos = e.target.getLatLng();
                    const newCoords = { lat: pos.lat, lng: pos.lng };
                    setLocation(newCoords);
                    fetchAddressName(pos.lat, pos.lng);
                    setLocStatus(`Pin position set: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
                  },
                }}
              >
                <Popup>📍 Drag this pin to fine-tune exact issue location</Popup>
              </Marker>

              {filteredIssues.map((issue) => {
                const coords = parsePoint(issue.location);
                if (!coords) return null;
                return (
                  <Marker key={issue.id} position={[coords.lat, coords.lng]}>
                    <Popup>
                      <strong>{issue.title}</strong>
                      <p>{issue.description}</p>
                      <span className="text-xs text-gray-500">Status: {issue.status}</span>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          ) : (
            <p className="text-gray-500 font-medium">Detecting device position...</p>
          )}
        </div>
      </div>

      {/* Issues Listing */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Reported Civic Issues</h2>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="p-2 border rounded-md bg-white text-gray-800"
        >
          <option value="all">All Categories</option>
          <option value="1">Roads & Potholes</option>
          <option value="2">Street Lighting</option>
          <option value="3">Water & Drainage</option>
          <option value="4">Sanitation & Garbage</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIssues.map((issue) => (
          <div key={issue.id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
              <p className="text-gray-600 my-2">{issue.description}</p>
            </div>
            <div>
              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2.5 py-0.5 rounded font-medium mb-2">
                Status: {issue.status}
              </span>
              {issue.photo_url && (
                <img
                  src={issue.photo_url}
                  alt="Proof"
                  className="w-full h-40 object-cover rounded-md mt-2"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}