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

const getDeviceId = () => {
  let deviceId = localStorage.getItem('civic_tracker_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('civic_tracker_device_id', deviceId);
  }
  return deviceId;
};

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
      map.invalidateSize();
    }
  }, [center, map]);
  return null;
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState(null);
  const [locStatus, setLocStatus] = useState('Waiting for live location...');
  
  // Data State
  const [issues, setIssues] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  const deviceId = getDeviceId();

  useEffect(() => {
    fetchIssues();

    // Supabase Realtime Subscription setup
    const channel = supabase
      .channel('public:issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        fetchIssues(); // Refresh list immediately whenever database changes
      })
      .subscribe();

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          setLocStatus(`GPS Active: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        },
        (err) => setLocStatus(`Location Error: ${err.message}`),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
      
      return () => {
        navigator.geolocation.clearWatch(watchId);
        supabase.removeChannel(channel);
      };
    }

    return () => supabase.removeChannel(channel);
  }, [isAdmin]);

  const fetchIssues = async () => {
    let query = supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;
    if (!error) setIssues(data);
  };

  const parsePoint = (pointStr) => {
    if (!pointStr) return null;
    const match = pointStr.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!match) return null;
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return alert('Location signal required to submit issue.');
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
          status: 'Submitted',
          device_id: deviceId,
          upvotes: 0,
        },
      ]);

      if (insertError) throw insertError;

      setTitle('');
      setDescription('');
      setFile(null);
      alert('Issue reported successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (id, currentUpvotes) => {
    const { error } = await supabase
      .from('issues')
      .update({ upvotes: (currentUpvotes || 0) + 1 })
      .eq('id', id);

    if (error) alert('Could not upvote: ' + error.message);
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) alert('Failed to update status: ' + error.message);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this issue report?')) return;
    const { error } = await supabase.from('issues').delete().eq('id', id);
    if (error) alert('Failed to delete issue: ' + error.message);
  };

  const exportToCSV = () => {
    if (filteredIssues.length === 0) return alert('No issues available to export.');

    const headers = ['ID', 'Title', 'Description', 'Category ID', 'Status', 'Upvotes', 'Location', 'Created At'];
    const rows = filteredIssues.map(issue => [
      issue.id,
      `"${issue.title.replace(/"/g, '""')}"`,
      `"${(issue.description || '').replace(/"/g, '""')}"`,
      issue.category_id,
      issue.status,
      issue.upvotes || 0,
      `"${issue.location}"`,
      new Date(issue.created_at).toLocaleString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `civic_issues_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPass === 'admin123') {
      setIsAdmin(true);
      setAdminPass('');
    } else {
      alert('Invalid Admin Passcode');
    }
  };

  const filteredIssues = issues.filter((i) => {
    const matchCategory = filterCategory === 'all' || i.category_id === parseInt(filterCategory);
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchCategory && matchStatus;
  });

  const totalIssues = issues.length;
  const submittedCount = issues.filter(i => i.status === 'Submitted').length;
  const inProgressCount = issues.filter(i => i.status === 'In Progress').length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;
  const totalUpvotes = issues.reduce((acc, curr) => acc + (curr.upvotes || 0), 0);

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Civic Issue Tracker</h1>
          <p className="text-sm text-gray-500">
            {isAdmin ? 'Municipal Management Portal (All Reports)' : 'My Reported Issues'}
          </p>
        </div>

        <div>
          {isAdmin ? (
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded"
              >
                📥 Export CSV
              </button>
              <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
                🛡️ Admin View Active
              </span>
              <button
                onClick={() => setIsAdmin(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded font-medium"
              >
                Switch to My Device Reports
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="flex gap-2">
              <input
                type="password"
                placeholder="Admin Passcode"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="p-1 px-2 border rounded text-xs text-gray-800"
              />
              <button type="submit" className="bg-gray-800 hover:bg-black text-white text-xs px-3 py-1 rounded">
                Admin Portal
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Admin Analytics Cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="bg-white p-4 border rounded-lg shadow-sm text-center">
            <span className="text-xs text-gray-500 uppercase font-semibold">Total Reports</span>
            <p className="text-2xl font-bold text-gray-800 mt-1">{totalIssues}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg shadow-sm text-center">
            <span className="text-xs text-yellow-700 uppercase font-semibold">Submitted</span>
            <p className="text-2xl font-bold text-yellow-800 mt-1">{submittedCount}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm text-center">
            <span className="text-xs text-blue-700 uppercase font-semibold">In Progress</span>
            <p className="text-2xl font-bold text-blue-800 mt-1">{inProgressCount}</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm text-center">
            <span className="text-xs text-green-700 uppercase font-semibold">Resolved</span>
            <p className="text-2xl font-bold text-green-800 mt-1">{resolvedCount}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg shadow-sm text-center col-span-2 md:col-span-1">
            <span className="text-xs text-purple-700 uppercase font-semibold">Total Upvotes</span>
            <p className="text-2xl font-bold text-purple-800 mt-1">👍 {totalUpvotes}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {!isAdmin && (
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

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Live Device Coordinates</label>
            <input
              type="text"
              readOnly
              value={location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Acquiring GPS signal...'}
              className="p-3 border rounded-md w-full bg-gray-100 text-gray-800 font-mono text-sm"
            />
            <span className="text-xs text-blue-600 font-medium">{locStatus}</span>
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
            disabled={loading || !location}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition disabled:bg-gray-400"
          >
            {loading ? 'Submitting...' : 'Report Issue'}
          </button>
        </form>
      )}

      {/* Map View */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Interactive Issue Map</h2>
        <div className="h-80 w-full rounded-lg overflow-hidden border border-gray-300 shadow-sm bg-gray-100 flex items-center justify-center">
          {location ? (
            <MapContainer center={[location.lat, location.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
              <ChangeView center={[location.lat, location.lng]} />
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[location.lat, location.lng]}>
                <Popup>📍 Your Device Location</Popup>
              </Marker>

              {filteredIssues.map((issue) => {
                const coords = parsePoint(issue.location);
                if (!coords) return null;
                return (
                  <Marker key={issue.id} position={[coords.lat, coords.lng]}>
                    <Popup>
                      <strong>{issue.title}</strong>
                      <p>{issue.description}</p>
                      <span className="text-xs text-gray-500">Upvotes: 👍 {issue.upvotes || 0}</span>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          ) : (
            <p className="text-gray-500 font-medium">Acquiring live location...</p>
          )}
        </div>
      </div>

      {/* List Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {isAdmin ? 'Manage All Civic Reports' : 'My Device Reports'}
        </h2>

        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="p-2 border rounded-md bg-white text-gray-800 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="1">Roads & Potholes</option>
            <option value="2">Street Lighting</option>
            <option value="3">Water & Drainage</option>
            <option value="4">Sanitation & Garbage</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border rounded-md bg-white text-gray-800 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Issues Grid */}
      {filteredIssues.length === 0 ? (
        <div className="p-8 border rounded-lg bg-gray-50 text-center text-gray-500">
          No reports found for this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIssues.map((issue) => (
            <div key={issue.id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                    issue.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                    issue.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {issue.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{issue.description}</p>
              </div>

              <div>
                {issue.photo_url && (
                  <img
                    src={issue.photo_url}
                    alt="Proof"
                    className="w-full h-40 object-cover rounded-md mb-3"
                  />
                )}

                <div className="flex justify-between items-center py-2 border-t border-gray-100">
                  <button
                    onClick={() => handleUpvote(issue.id, issue.upvotes)}
                    className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded transition"
                  >
                    👍 Upvote ({issue.upvotes || 0})
                  </button>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-gray-600">Update Status:</label>
                      <select
                        value={issue.status}
                        onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                        className="p-1 border rounded text-xs bg-gray-50 text-gray-800"
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleDelete(issue.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 text-xs px-2.5 py-1 rounded font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}