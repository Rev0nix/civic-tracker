import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const categoryNames = {
  1: 'Roads & Potholes',
  2: 'Street Lighting',
  3: 'Water & Drainage',
  4: 'Sanitation & Garbage',
};

const createCustomIcon = (categoryId, status) => {
  let color = '#3B82F6';

  if (status === 'Resolved') {
    color = '#10B981';
  } else if (status === 'In Progress') {
    color = '#F59E0B';
  } else {
    switch (parseInt(categoryId)) {
      case 1: color = '#EF4444'; break;
      case 2: color = '#EAB308'; break;
      case 3: color = '#06B6D4'; break;
      case 4: color = '#8B5CF6'; break;
      default: color = '#3B82F6';
    }
  }

  const svgMarker = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>`;

  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: svgMarker,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const userIcon = L.divIcon({
  className: 'user-leaflet-icon',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563EB" width="28" height="28">
      <circle cx="12" cy="12" r="8" fill="#2563EB" stroke="#FFFFFF" stroke-width="3"/>
    </svg>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const getDeviceId = () => {
  let deviceId = localStorage.getItem('civic_tracker_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('civic_tracker_device_id', deviceId);
  }
  return deviceId;
};

// Strict location parser: Returns null if no authentic GPS data exists
const parseLocation = (loc) => {
  if (!loc) return null;
  if (typeof loc === 'object' && loc.lat && loc.lng) return loc;

  if (typeof loc === 'string') {
    const pointMatch = loc.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (pointMatch) {
      return { lng: parseFloat(pointMatch[1]), lat: parseFloat(pointMatch[2]) };
    }

    const parts = loc.split(',');
    if (parts.length === 2) {
      const p1 = parseFloat(parts[0]);
      const p2 = parseFloat(parts[1]);
      if (!isNaN(p1) && !isNaN(p2)) {
        if (Math.abs(p1) <= 90 && Math.abs(p2) <= 180) {
          return { lat: p1, lng: p2 };
        }
        return { lat: p2, lng: p1 };
      }
    }
  }
  return null;
};

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 16);
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
  const [locStatus, setLocStatus] = useState('Acquiring live GPS location...');
  
  // Data State
  const [issues, setIssues] = useState([]);
  const [addresses, setAddresses] = useState({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  // Admin Modal Detailed View State
  const [adminSelectedIssue, setAdminSelectedIssue] = useState(null);
  const [modalAddressText, setModalAddressText] = useState('Resolving location...');

  const deviceId = getDeviceId();

  useEffect(() => {
    fetchIssues();

    const channel = supabase
      .channel('public:issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        fetchIssues();
      })
      .subscribe();

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          setLocStatus(`GPS Active: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        },
        (err) => setLocStatus(`GPS Error: ${err.message}`),
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
    if (!error && data) {
      setIssues(data);
      resolveAddresses(data);
    }
  };

  const resolveAddresses = async (issueList) => {
    const newAddresses = {};
    for (const issue of issueList) {
      const coords = parseLocation(issue.location);
      if (coords && !addresses[issue.id]) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18`
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              newAddresses[issue.id] = data.display_name;
            } else {
              newAddresses[issue.id] = `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
            }
          }
        } catch {
          newAddresses[issue.id] = `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        }
      }
    }
    setAddresses((prev) => ({ ...prev, ...newAddresses }));
  };

  useEffect(() => {
    if (!adminSelectedIssue) return;

    const coords = parseLocation(adminSelectedIssue.location);
    if (!coords) {
      setModalAddressText('No location data attached to this report.');
      return;
    }

    setModalAddressText(`Resolving address for Lat ${coords.lat.toFixed(5)}, Lng ${coords.lng.toFixed(5)}...`);

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.display_name) {
          setModalAddressText(data.display_name);
        } else {
          setModalAddressText(`Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}`);
        }
      })
      .catch(() => {
        setModalAddressText(`Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}`);
      });
  }, [adminSelectedIssue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return alert('GPS signal required to submit issue. Please enable location.');
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

      // Save exact live GPS coordinates from citizen device
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
      fetchIssues();
      alert('Issue reported successfully with your exact location!');
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

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      if (adminSelectedIssue && adminSelectedIssue.id === id) {
        setAdminSelectedIssue((prev) => ({ ...prev, status: newStatus }));
      }
      fetchIssues();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this issue report?')) return;
    const { error } = await supabase.from('issues').delete().eq('id', id);
    if (error) {
      alert('Failed to delete issue: ' + error.message);
    } else {
      if (adminSelectedIssue && adminSelectedIssue.id === id) {
        setAdminSelectedIssue(null);
      }
      fetchIssues();
    }
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
      `"${issue.location || ''}"`,
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

  const handleCardDoubleClick = (issue) => {
    if (isAdmin) {
      setAdminSelectedIssue(issue);
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

  const modalCoords = adminSelectedIssue ? parseLocation(adminSelectedIssue.location) : null;

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans">
      {/* Header */}
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

      {/* Citizen Form */}
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

      {/* Main Map View */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Interactive Issue Map</h2>
        <div className="flex gap-4 text-xs font-semibold mb-3 text-gray-600">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Roads</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span> Lighting</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-500 inline-block"></span> Water</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span> Sanitation</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Resolved</span>
        </div>

        <div className="h-80 w-full rounded-lg overflow-hidden border border-gray-300 shadow-sm bg-gray-100 flex items-center justify-center">
          {location ? (
            <MapContainer center={[location.lat, location.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
              <ChangeView center={[location.lat, location.lng]} />
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[location.lat, location.lng]} icon={userIcon}>
                <Popup>📍 Your Device Location</Popup>
              </Marker>

              {filteredIssues.map((issue) => {
                const coords = parseLocation(issue.location);
                if (!coords) return null;
                return (
                  <Marker
                    key={issue.id}
                    position={[coords.lat, coords.lng]}
                    icon={createCustomIcon(issue.category_id, issue.status)}
                  >
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
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isAdmin ? 'Manage All Civic Reports' : 'My Device Reports'}
          </h2>
          {isAdmin && (
            <p className="text-xs text-purple-700 font-medium mt-0.5">
              ⚡ Admin Tip: Double-tap or double-click any card to view full issue details & exact location modal
            </p>
          )}
        </div>

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
          {filteredIssues.map((issue) => {
            const locText = addresses[issue.id];
            const coords = parseLocation(issue.location);
            const googleMapsUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;

            return (
              <div
                key={issue.id}
                onDoubleClick={() => handleCardDoubleClick(issue)}
                className={`p-4 border rounded-lg bg-white shadow-sm flex flex-col justify-between transition ${
                  isAdmin ? 'hover:border-purple-400 hover:shadow-md cursor-pointer' : ''
                }`}
                title={isAdmin ? 'Double-tap to open full report details' : ''}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                        {categoryNames[issue.category_id] || 'Civic Issue'}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
                    </div>
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

                  {/* Show Location Box ONLY when authentic GPS data is present */}
                  {coords && (
                    <div className="bg-blue-50/60 p-3 rounded-md border border-blue-100 mb-3 text-xs flex flex-col gap-1.5">
                      <div className="flex items-start gap-1.5 text-blue-900 font-semibold">
                        <span>📍 Issue Location:</span>
                      </div>
                      <p className="text-gray-800 font-medium leading-relaxed bg-white p-2 rounded border border-blue-100">
                        {locText || `Latitude: ${coords.lat.toFixed(5)}, Longitude: ${coords.lng.toFixed(5)}`}
                      </p>
                      <div className="flex justify-between items-center pt-1 text-[11px] font-mono text-gray-600">
                        <span>GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                        {googleMapsUrl && (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 font-sans font-semibold hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open Google Maps ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(issue.id, issue.upvotes);
                      }}
                      className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded transition"
                    >
                      👍 Upvote ({issue.upvotes || 0})
                    </button>
                    {isAdmin ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAdminSelectedIssue(issue);
                        }}
                        className="text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs font-semibold px-2.5 py-1 rounded transition"
                      >
                        🔍 Double-Tap Details ↗
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400">
                        {new Date(issue.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2 mt-2"
                    >
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
            );
          })}
        </div>
      )}

      {/* ADMIN FULL REPORT DETAILS MODAL */}
      {adminSelectedIssue && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setAdminSelectedIssue(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto border border-purple-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setAdminSelectedIssue(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
            >
              &times;
            </button>

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 mb-4 pr-6">
              <div>
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider bg-purple-100 px-2 py-0.5 rounded">
                  🛡️ Admin Detailed View • {categoryNames[adminSelectedIssue.category_id] || 'Civic Issue'}
                </span>
                <h2 className="text-2xl font-bold text-gray-900 mt-2">{adminSelectedIssue.title}</h2>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                adminSelectedIssue.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                adminSelectedIssue.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {adminSelectedIssue.status}
              </span>
            </div>

            {/* High-Res Proof Image */}
            {adminSelectedIssue.photo_url && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Uploaded Proof Photo</h4>
                <img
                  src={adminSelectedIssue.photo_url}
                  alt="Proof"
                  className="w-full max-h-80 object-cover rounded-lg border border-gray-200 shadow-sm"
                />
              </div>
            )}

            {/* Full Detailed Description */}
            <div className="mb-4">
              <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Complete Issue Description</h4>
              <p className="text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-200 whitespace-pre-wrap leading-relaxed">
                {adminSelectedIssue.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Exact Encoded Location & Address Section */}
            <div className="bg-purple-50/70 p-4 rounded-lg border border-purple-200 mb-4">
              <h4 className="text-xs font-bold uppercase text-purple-900 mb-2">Exact Encoded Location & Address</h4>
              <div className="bg-white p-3 rounded border border-purple-100 mb-3 leading-relaxed">
                <p className="text-sm font-semibold text-gray-900">
                  📍 {modalAddressText}
                </p>
              </div>
              {modalCoords ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-mono text-gray-700 bg-white p-2.5 rounded border border-purple-100">
                  <span>GPS: Latitude {modalCoords.lat.toFixed(6)}, Longitude {modalCoords.lng.toFixed(6)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${modalCoords.lat},${modalCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-purple-700 hover:bg-purple-800 text-white font-sans text-xs px-3 py-1.5 rounded font-semibold whitespace-nowrap"
                  >
                    Open Google Maps ↗
                  </a>
                </div>
              ) : (
                <p className="text-xs text-gray-500 bg-white p-2 rounded border border-gray-200">
                  No GPS coordinates attached to this legacy report.
                </p>
              )}
            </div>

            {/* Metadata Summary */}
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 pt-2 border-t border-gray-200 mb-6">
              <div>
                <span className="font-semibold block text-gray-500">Submitted Timestamp:</span>
                {new Date(adminSelectedIssue.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold block text-gray-500">Community Upvotes:</span>
                👍 {adminSelectedIssue.upvotes || 0} Upvotes
              </div>
            </div>

            {/* Admin Actions Bar inside Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 bg-gray-100 -mx-6 -mb-6 p-4 rounded-b-xl">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-700">Update Status:</label>
                <select
                  value={adminSelectedIssue.status}
                  onChange={(e) => handleStatusChange(adminSelectedIssue.id, e.target.value)}
                  className="p-1.5 border rounded text-xs bg-white text-gray-800 font-semibold"
                >
                  <option value="Submitted">Submitted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <button
                onClick={() => handleDelete(adminSelectedIssue.id)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3.5 py-1.5 rounded font-semibold"
              >
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}