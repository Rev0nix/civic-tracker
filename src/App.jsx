import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import emailjs from '@emailjs/browser';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const categoryNames = {
  1: 'Roads & Potholes',
  2: 'Street Lighting',
  3: 'Water & Drainage',
  4: 'Sanitation & Garbage',
};

const categoryBadges = {
  1: 'bg-red-50 text-red-700 border-red-200',
  2: 'bg-amber-50 text-amber-700 border-amber-200',
  3: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  4: 'bg-purple-50 text-purple-700 border-purple-200',
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
      case 2: color = '#F59E0B'; break;
      case 3: color = '#06B6D4'; break;
      case 4: color = '#8B5CF6'; break;
      default: color = '#3B82F6';
    }
  }

  const svgMarker = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="34" height="34" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>`;

  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: svgMarker,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
};

const userIcon = L.divIcon({
  className: 'user-leaflet-icon',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563EB" width="30" height="30" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
      <circle cx="12" cy="12" r="8" fill="#2563EB" stroke="#FFFFFF" stroke-width="3"/>
    </svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const getDeviceId = () => {
  let deviceId = localStorage.getItem('civic_tracker_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('civic_tracker_device_id', deviceId);
  }
  return deviceId;
};

// Canvas Image Compression Helper
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.75
        );
      };
    };
  });
};

// Universal Location Parser
const parseLocation = (loc) => {
  if (!loc) return null;

  if (typeof loc === 'object') {
    if (loc.coordinates && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      return { lng: parseFloat(loc.coordinates[0]), lat: parseFloat(loc.coordinates[1]) };
    }
    if (loc.lat && loc.lng) return { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
  }

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

// Visual Progress Timeline Component
function ProgressTimeline({ status }) {
  const steps = ['Submitted', 'In Progress', 'Resolved'];
  const currentIndex = steps.indexOf(status) !== -1 ? steps.indexOf(status) : 0;

  return (
    <div className="w-full my-4 px-2">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0 rounded-full" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 -translate-y-1/2 z-0 transition-all duration-500 rounded-full"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                } ${isCurrent ? 'ring-4 ring-indigo-100 scale-110' : ''}`}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[11px] mt-1.5 font-medium tracking-tight ${
                  isCompleted ? 'text-indigo-950 font-semibold' : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [userEmail, setUserEmail] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locStatus, setLocStatus] = useState('Acquiring live GPS location...');
  
  // Data State
  const [issues, setIssues] = useState([]);
  const [addresses, setAddresses] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  // Status Notification Banner State
  const [notification, setNotification] = useState(null);

  // Admin Modal Detailed View State
  const [adminSelectedIssue, setAdminSelectedIssue] = useState(null);
  const [modalAddressText, setModalAddressText] = useState('Resolving location...');

  const deviceId = getDeviceId();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
    } else {
      setFile(null);
      setImagePreview(null);
    }
  };

  const getExactGPSLocation = () => {
    setLocStatus('Requesting GPS lock from mobile device...');
    if (!navigator.geolocation) {
      setLocStatus('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        setLocStatus(`GPS Locked: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (${Math.round(pos.coords.accuracy)}m accuracy)`);
      },
      (err) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(coords);
            setLocStatus(`Network Location: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
          },
          (fallbackErr) => {
            setLocStatus(`GPS Error (${fallbackErr.code}): Please turn ON device location.`);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchIssues();
    getExactGPSLocation();

    const channel = supabase
      .channel('public:issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, (payload) => {
        fetchIssues();
        if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedIssue = payload.new;
          if (updatedIssue.device_id === deviceId || isAdmin) {
            triggerNotification(`Report "${updatedIssue.title}" status updated to: ${updatedIssue.status}`);
          }
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isAdmin]);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const sendResolvedEmail = (recipientEmail, issueTitle, status) => {
    if (!recipientEmail) return;

    const templateParams = {
      to_email: recipientEmail,
      issue_title: issueTitle,
      status: status,
    };

    emailjs
      .send(
        'service_7v8m16b',
        'template_vtc51wn',
        templateParams,
        'hIQcr3HDUS9AFupsd'
      )
      .then(
        () => triggerNotification('Notification email dispatched to citizen!'),
        (err) => console.warn('Email send error:', err)
      );
  };

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
    if (!location) {
      alert('GPS location is required. Please tap "Refresh GPS Location" and grant location permission.');
      return;
    }
    setLoading(true);

    try {
      let photoUrl = null;
      if (file) {
        const compressedFile = await compressImage(file);
        const filePath = `${Date.now()}_${compressedFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('issue-photos')
          .upload(filePath, compressedFile);
        if (uploadError) throw uploadError;

        photoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/issue-photos/${filePath}`;
      }

      const pointLocation = `POINT(${location.lng} ${location.lat})`;

      const { error: insertError } = await supabase.from('issues').insert([
        {
          title,
          user_email: userEmail,
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
      setUserEmail('');
      setDescription('');
      setFile(null);
      setImagePreview(null);
      fetchIssues();
      triggerNotification('Issue reported successfully!');
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

  const handleStatusChange = async (issueItem, newStatus) => {
    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', issueItem.id);

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      if (adminSelectedIssue && adminSelectedIssue.id === issueItem.id) {
        setAdminSelectedIssue((prev) => ({ ...prev, status: newStatus }));
      }

      if (newStatus === 'Resolved' && issueItem.user_email) {
        sendResolvedEmail(issueItem.user_email, issueItem.title, newStatus);
      }

      triggerNotification(`Status updated to "${newStatus}"`);
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
      triggerNotification('Report deleted successfully');
      fetchIssues();
    }
  };

  const exportToCSV = () => {
    if (filteredIssues.length === 0) return alert('No issues available to export.');

    const headers = ['ID', 'Title', 'User Email', 'Description', 'Category ID', 'Status', 'Upvotes', 'Location', 'Created At'];
    const rows = filteredIssues.map(issue => [
      issue.id,
      `"${issue.title.replace(/"/g, '""')}"`,
      `"${issue.user_email || ''}"`,
      `"${(issue.description || '').replace(/"/g, '""')}"`,
      issue.category_id,
      issue.status,
      issue.upvotes || 0,
      `"${JSON.stringify(issue.location || '')}"`,
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

  const handleCardClick = (issue) => {
    if (isAdmin) {
      setAdminSelectedIssue(issue);
    }
  };

  const filteredIssues = issues.filter((i) => {
    const matchCategory = filterCategory === 'all' || i.category_id === parseInt(filterCategory);
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    
    const query = searchQuery.toLowerCase();
    const addressStr = addresses[i.id] || '';
    const matchSearch =
      !query ||
      i.title.toLowerCase().includes(query) ||
      (i.description && i.description.toLowerCase().includes(query)) ||
      addressStr.toLowerCase().includes(query);

    return matchCategory && matchStatus && matchSearch;
  });

  const totalIssues = issues.length;
  const submittedCount = issues.filter(i => i.status === 'Submitted').length;
  const inProgressCount = issues.filter(i => i.status === 'In Progress').length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;
  const totalUpvotes = issues.reduce((acc, curr) => acc + (curr.upvotes || 0), 0);

  const modalCoords = adminSelectedIssue ? parseLocation(adminSelectedIssue.location) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12">
      {/* Realtime Notification Banner */}
      {notification && (
        <div className="fixed top-5 right-5 bg-indigo-600 text-white px-5 py-3.5 rounded-xl shadow-2xl z-[10001] transition transform flex items-center gap-3 text-sm font-semibold animate-bounce border border-indigo-400">
          <span className="text-lg">🔔</span> {notification}
        </div>
      )}

      {/* Glassmorphism Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-indigo-200">
              🏛️
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">CivicTrack</h1>
              <p className="text-xs font-medium text-slate-500">
                {isAdmin ? 'Municipal Governance & Action Center' : 'Citizen Infrastructure Reporting Portal'}
              </p>
            </div>
          </div>

          <div>
            {isAdmin ? (
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                  onClick={exportToCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  📥 Export CSV
                </button>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-1.5 rounded-full">
                  🛡️ Admin Active
                </span>
                <button
                  onClick={() => setIsAdmin(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-lg transition border border-slate-300"
                >
                  Exit Admin View
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="flex gap-2">
                <input
                  type="password"
                  placeholder="Admin Passcode"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none w-36"
                />
                <button type="submit" className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm">
                  Admin Portal
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Admin Analytics Cards */}
        {isAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Total Reports</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{totalIssues}</p>
            </div>
            <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl shadow-sm text-center">
              <span className="text-[11px] text-amber-700 uppercase font-bold tracking-wider">Submitted</span>
              <p className="text-3xl font-black text-amber-800 mt-1">{submittedCount}</p>
            </div>
            <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl shadow-sm text-center">
              <span className="text-[11px] text-blue-700 uppercase font-bold tracking-wider">In Progress</span>
              <p className="text-3xl font-black text-blue-800 mt-1">{inProgressCount}</p>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl shadow-sm text-center">
              <span className="text-[11px] text-emerald-700 uppercase font-bold tracking-wider">Resolved</span>
              <p className="text-3xl font-black text-emerald-800 mt-1">{resolvedCount}</p>
            </div>
            <div className="bg-indigo-50/60 border border-indigo-200/80 p-4 rounded-xl shadow-sm text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-indigo-700 uppercase font-bold tracking-wider">Total Upvotes</span>
              <p className="text-3xl font-black text-indigo-900 mt-1">👍 {totalUpvotes}</p>
            </div>
          </div>
        )}

        {/* Citizen Form Container */}
        {!isAdmin && (
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm mb-10 transition">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
              <span className="text-xl">📢</span>
              <h2 className="text-xl font-bold text-slate-900">Report a New Civic Issue</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Issue Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Damaged Pothole on Main Road"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="p-3 border border-slate-300 rounded-xl w-full bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="p-3 border border-slate-300 rounded-xl w-full bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Issue Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="p-3 border border-slate-300 rounded-xl w-full bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                >
                  <option value="1">Roads & Potholes</option>
                  <option value="2">Street Lighting</option>
                  <option value="3">Water & Drainage</option>
                  <option value="4">Sanitation & Garbage</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Live GPS Coordinates <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={getExactGPSLocation}
                    className="text-xs text-indigo-600 font-bold hover:underline bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100"
                  >
                    🔄 Refresh GPS
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Acquiring GPS signal...'}
                  className="p-3 border border-slate-300 rounded-xl w-full bg-slate-100/70 text-slate-800 font-mono text-sm"
                />
                <span className="text-[11px] text-indigo-600 font-medium block mt-1">{locStatus}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Detailed Description
              </label>
              <textarea
                placeholder="Describe the issue location landmarks and severity..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-3 border border-slate-300 rounded-xl w-full bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition h-28"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Upload Photo Proof (Compressed Automatically)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="p-2 text-sm text-slate-600 bg-slate-50 border border-slate-300 rounded-xl w-full"
              />
              {imagePreview && (
                <div className="mt-3 relative w-36 h-36 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[10px] font-semibold text-center py-1">
                    Ready to Compress
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !location}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-xl transition shadow-md shadow-indigo-200 disabled:bg-slate-300 disabled:shadow-none w-full sm:w-auto"
            >
              {loading ? 'Compressing & Submitting...' : 'Submit Official Report'}
            </button>
          </form>
        )}

        {/* Main Interactive Map View */}
        <div className="mb-10 relative z-0" style={{ isolation: 'isolate' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <h2 className="text-xl font-extrabold text-slate-900">Interactive Infrastructure Map</h2>
            <div className="flex gap-3 text-xs font-bold text-slate-600 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-sm"></span> Roads</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm"></span> Lighting</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-cyan-500 inline-block shadow-sm"></span> Water</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block shadow-sm"></span> Sanitation</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm"></span> Resolved</span>
            </div>
          </div>

          <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-slate-100 flex items-center justify-center relative z-0">
            {location ? (
              <MapContainer center={[location.lat, location.lng]} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <ChangeView center={[location.lat, location.lng]} />
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.lat, location.lng]} icon={userIcon}>
                  <Popup>📍 Your Current Location</Popup>
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
                        <div className="p-1">
                          <strong className="text-slate-900">{issue.title}</strong>
                          <p className="text-xs text-slate-600 my-1">{issue.description}</p>
                          <span className="text-xs font-bold text-indigo-600">Upvotes: 👍 {issue.upvotes || 0}</span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            ) : (
              <p className="text-slate-500 font-medium animate-pulse">Acquiring GPS spatial feed...</p>
            )}
          </div>
        </div>

        {/* List Header, Search & Filter Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {isAdmin ? 'Manage All Civic Reports' : 'My Reported Issues'}
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Showing {filteredIssues.length} issue report(s)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Search titles, text, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-1 sm:w-64 transition"
            />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
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
              className="p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
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
          <div className="p-12 border border-slate-200 rounded-2xl bg-white text-center text-slate-500 shadow-sm">
            <span className="text-3xl block mb-2">🔍</span>
            <p className="font-semibold text-slate-700">No matching reports found</p>
            <span className="text-xs text-slate-400">Try adjusting your search query or filter settings</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredIssues.map((issue) => {
              const locText = addresses[issue.id];
              const coords = parseLocation(issue.location);
              const googleMapsUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;

              return (
                <div
                  key={issue.id}
                  onClick={() => handleCardClick(issue)}
                  className={`p-5 border border-slate-200/90 rounded-2xl bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between transition duration-200 ${
                    isAdmin ? 'hover:border-indigo-400 cursor-pointer' : ''
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div>
                        <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border inline-block mb-1.5 ${
                          categoryBadges[issue.category_id] || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {categoryNames[issue.category_id] || 'Civic Issue'}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">{issue.title}</h3>
                        {issue.user_email && (
                          <span className="text-xs text-slate-400 block font-mono mt-0.5">📧 {issue.user_email}</span>
                        )}
                      </div>
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap shadow-sm ${
                        issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        issue.status === 'In Progress' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {issue.status}
                      </span>
                    </div>

                    {/* Progress Timeline */}
                    <ProgressTimeline status={issue.status} />

                    <p className="text-slate-600 text-sm mb-4 leading-relaxed">{issue.description}</p>
                  </div>

                  <div>
                    {issue.photo_url && (
                      <img
                        src={issue.photo_url}
                        alt="Proof"
                        className="w-full h-44 object-cover rounded-xl mb-4 border border-slate-200 shadow-inner"
                      />
                    )}

                    {coords && (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 mb-4 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <span>📍 Address Location</span>
                        </div>
                        <p className="text-slate-800 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                          {locText || `Latitude: ${coords.lat.toFixed(5)}, Longitude: ${coords.lng.toFixed(5)}`}
                        </p>
                        <div className="flex justify-between items-center pt-1 text-[11px] font-mono text-slate-500">
                          <span>GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                          {googleMapsUrl && (
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 font-sans font-bold hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Google Maps ↗
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-2.5 border-t border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpvote(issue.id, issue.upvotes);
                        }}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-1.5 rounded-lg transition"
                      >
                        👍 Upvote ({issue.upvotes || 0})
                      </button>
                      {isAdmin ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdminSelectedIssue(issue);
                          }}
                          className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold px-3 py-1.5 rounded-lg transition border border-indigo-100"
                        >
                          🔍 View Details ↗
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          {new Date(issue.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 mt-2"
                      >
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-600">Update Status:</label>
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue, e.target.value)}
                            className="p-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="Submitted">Submitted</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ADMIN FULL REPORT DETAILS MODAL */}
      {adminSelectedIssue && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setAdminSelectedIssue(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto border border-slate-200 z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setAdminSelectedIssue(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 text-2xl font-bold leading-none"
            >
              &times;
            </button>

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 mb-5 pr-6">
              <div>
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full inline-block mb-2">
                  🛡️ Admin View • {categoryNames[adminSelectedIssue.category_id] || 'Civic Issue'}
                </span>
                <h2 className="text-2xl font-black text-slate-900">{adminSelectedIssue.title}</h2>
                {adminSelectedIssue.user_email && (
                  <p className="text-xs text-indigo-800 font-semibold mt-1">
                    📧 Reporter Email: {adminSelectedIssue.user_email}
                  </p>
                )}
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                adminSelectedIssue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                adminSelectedIssue.status === 'In Progress' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {adminSelectedIssue.status}
              </span>
            </div>

            {/* Modal Progress Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Resolution Milestone</span>
              <ProgressTimeline status={adminSelectedIssue.status} />
            </div>

            {/* High-Res Proof Image */}
            {adminSelectedIssue.photo_url && (
              <div className="mb-5">
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-1.5">Uploaded Proof Photo</h4>
                <img
                  src={adminSelectedIssue.photo_url}
                  alt="Proof"
                  className="w-full max-h-80 object-cover rounded-xl border border-slate-200 shadow-sm"
                />
              </div>
            )}

            {/* Full Detailed Description */}
            <div className="mb-5">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-1.5">Complete Issue Description</h4>
              <p className="text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed text-sm">
                {adminSelectedIssue.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Exact Encoded Location & Address Section */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-5">
              <h4 className="text-xs font-bold uppercase text-indigo-900 mb-2">Exact Encoded Location & Address</h4>
              <div className="bg-white p-3 rounded-lg border border-indigo-100 mb-3 leading-relaxed">
                <p className="text-sm font-semibold text-slate-900">
                  📍 {modalAddressText}
                </p>
              </div>
              {modalCoords ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-mono text-slate-700 bg-white p-3 rounded-lg border border-indigo-100">
                  <span>GPS: Latitude {modalCoords.lat.toFixed(6)}, Longitude {modalCoords.lng.toFixed(6)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${modalCoords.lat},${modalCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs px-3.5 py-1.5 rounded-lg font-bold whitespace-nowrap shadow-sm"
                  >
                    Open Google Maps ↗
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                  No GPS coordinates attached to this report.
                </p>
              )}
            </div>

            {/* Metadata Summary */}
            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-200 mb-6">
              <div>
                <span className="font-semibold block text-slate-400">Submitted Timestamp:</span>
                {new Date(adminSelectedIssue.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold block text-slate-400">Community Upvotes:</span>
                👍 {adminSelectedIssue.upvotes || 0} Upvotes
              </div>
            </div>

            {/* Admin Actions Bar inside Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 bg-slate-100 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-4 sm:p-6 rounded-b-2xl">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Update Status:</label>
                <select
                  value={adminSelectedIssue.status}
                  onChange={(e) => handleStatusChange(adminSelectedIssue, e.target.value)}
                  className="p-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Submitted">Submitted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <button
                onClick={() => handleDelete(adminSelectedIssue.id)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-sm transition"
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