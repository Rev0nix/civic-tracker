import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default Leaflet marker icon issue in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState(null);
  const [issues, setIssues] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('Geolocation error:', err)
      );
    }
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setIssues(data);
  };

  // Helper to parse POSTGIS POINT string: "POINT(lng lat)"
  const parsePoint = (pointStr) => {
    if (!pointStr) return null;
    const match = pointStr.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!match) return null;
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return alert('Please enable location access to submit an issue.');
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
      alert('Issue submitted successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = filterCategory === 'all'
    ? issues
    : issues.filter((i) => i.category_id === parseInt(filterCategory));

  const mapCenter = location ? [location.lat, location.lng] : [12.9716, 77.5946];

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Civic Issue Tracker</h1>

      {/* Submission Form */}
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

      {/* Interactive Map */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Interactive Issue Map</h2>
        <div className="h-80 w-full rounded-lg overflow-hidden border border-gray-300 shadow-sm">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
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
        </div>
      </div>

      {/* Filter Options */}
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

      {/* Issue Cards */}
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