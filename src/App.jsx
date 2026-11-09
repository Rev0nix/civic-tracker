import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import emailjs from '@emailjs/browser';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import CivicMap from './components/CivicMap';

const categoryNames = {
  1: 'Roads & Potholes',
  2: 'Street Lighting',
  3: 'Water & Drainage',
  4: 'Sanitation & Garbage',
};

const categoryBadges = {
  1: 'bg-rose-50 text-rose-700 border-rose-200/80',
  2: 'bg-amber-50 text-amber-700 border-amber-200/80',
  3: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
  4: 'bg-purple-50 text-purple-700 border-purple-200/80',
};

// Distance calculator helper for AI Duplicate Detection (Haversine formula in meters)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// AI Smart Priority Scoring Analyzer
const analyzePriority = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('danger') || text.includes('accident') || text.includes('burst') || text.includes('severe') || text.includes('live wire') || text.includes('overflow')) {
    return 'Critical';
  } else if (text.includes('broken') || text.includes('damaged') || text.includes('leak') || text.includes('dark')) {
    return 'Medium';
  }
  return 'Low';
};

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
    <div className="w-full my-4 px-1">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-200/80 -translate-y-1/2 z-0 rounded-full" />
        <div
          className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-500 rounded-full shadow-sm"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300 ${
                  isCompleted
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-white'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                } ${isCurrent ? 'ring-4 ring-indigo-200/80 scale-110' : ''}`}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[11px] mt-1.5 font-bold tracking-tight ${
                  isCompleted ? 'text-slate-900' : 'text-slate-400'
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

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const menuRef = useRef(null);

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

  // AI Chatbot Drawer State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Namaste! I am your Civic AI Assistant. Ask me about issue statuses, municipal guidelines, or reporting timelines in English or Kannada.' }
  ]);

  const deviceId = getDeviceId();

  const [toastMessage, setToastMessage] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Auto-hide splash after 2.5 seconds once checks finish
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Close admin menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAdminMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time Notification useEffect
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'issues' },
        (payload) => {
          const updatedIssue = payload.new;
          setToastMessage(`📢 Issue #${updatedIssue.id} status updated to: ${updatedIssue.status}`);

          if (typeof fetchIssues === 'function') {
            fetchIssues();
          }

          setTimeout(() => {
            setToastMessage(null);
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      () => {
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

  // In-App OTA Version Checker
  useEffect(() => {
    async function checkAppVersion() {
      try {
        const { data, error } = await supabase
          .from('app_versions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !data) return;

        const currentAppVersion = '1.0.0';

        if (data.version !== currentAppVersion) {
          const userWantsUpdate = window.confirm(
            `🚀 New Update Available (v${data.version})!\n\nWhat's new: ${data.changelog || 'Performance improvements & bug fixes'}\n\nTap OK to update instantly.`
          );

          if (userWantsUpdate) {
            window.location.href = data.update_url;
          }
        }
      } catch (err) {
        console.warn('Version check skipped offline:', err);
      }
    }

    checkAppVersion();
  }, []);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const sendResolvedEmail = (recipientEmail, issueTitle, newStatus) => {
    if (!recipientEmail) return;

    const templateParams = {
      email: recipientEmail,
      issue_title: issueTitle,
      status: newStatus
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
        (err) => console.warn('Email send error:', err.text || err)
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

  const checkForDuplicates = () => {
    if (!location) return null;
    const nearby = issues.filter(issue => {
      if (issue.category_id !== parseInt(categoryId)) return false;
      const coords = parseLocation(issue.location);
      if (!coords) return false;
      const distance = calculateDistance(location.lat, location.lng, coords.lat, coords.lng);
      return distance <= 100;
    });
    return nearby.length > 0 ? nearby[0] : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      alert('GPS location is required. Please tap "Refresh GPS Location" and grant location permission.');
      return;
    }

    const duplicate = checkForDuplicates();
    if (duplicate) {
      const proceed = window.confirm(`⚠️ AI Notice: An issue similar to "${duplicate.title}" was already reported ~${Math.round(calculateDistance(location.lat, location.lng, parseLocation(duplicate.location).lat, parseLocation(duplicate.location).lng))}m away. Would you like to upvote that report instead?`);
      if (proceed) {
        handleUpvote(duplicate.id, duplicate.upvotes);
        return;
      }
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

      const priorityScore = analyzePriority(title, description);
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
          priority: priorityScore,
        },
      ]);

      if (insertError) throw insertError;

      setTitle('');
      setUserEmail('');
      setDescription('');
      setFile(null);
      setImagePreview(null);
      fetchIssues();
      triggerNotification(`Issue reported successfully! AI Priority: ${priorityScore}`);
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
    else fetchIssues();
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

  const exportToCSV = () => {
    if (filteredIssues.length === 0) return alert('No issues available to export.');

    const headers = ['ID', 'Title', 'User Email', 'Description', 'Category ID', 'Status', 'Priority', 'Upvotes', 'Location', 'Created At'];
    const rows = filteredIssues.map(issue => [
      issue.id,
      `"${issue.title.replace(/"/g, '""')}"`,
      `"${issue.user_email || ''}"`,
      `"${(issue.description || '').replace(/"/g, '""')}"`,
      issue.category_id,
      issue.status,
      issue.priority || 'Low',
      issue.upvotes || 0,
      `"${JSON.stringify(issue.location || '')}"`,
      new Date(issue.created_at).toLocaleString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `civic_tracker_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPass === 'admin123') {
      setIsAdmin(true);
      setAdminPass('');
      setShowAdminMenu(false);
    } else {
      alert('Invalid Passcode');
    }
  };

  const handleCardClick = (issue) => {
    if (isAdmin) {
      setAdminSelectedIssue(issue);
    }
  };

  const handleChatSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      let botReply = "I can help you track issues or understand municipal guidelines. Try asking about 'potholes', 'status', or 'timeline'.";
      const q = userMsg.toLowerCase();
      if (q.includes('status') || q.includes('track') || q.includes('ಸ್ಥಿತಿ')) {
        botReply = "You can view your submitted issues directly on this dashboard. Admins update statuses between 'Submitted', 'In Progress', and 'Resolved'.";
      } else if (q.includes('pothole') || q.includes('road') || q.includes('ಗುಂಡಿ')) {
        botReply = "Road and pothole issues are categorized under Priority 1. Critical safety hazards receive accelerated municipal review.";
      } else if (q.includes('kannada') || q.includes('ಕನ್ನಡ')) {
        botReply = "Namaskara! CivicTrack municipal portal ಮುಖಾಂತರ ನಿಮ್ಮ ಹತ್ತಿರದ ಸಮಸ್ಯೆಗಳನ್ನು ಸುಲಭವಾಗಿ ವರದಿ ಮಾಡಬಹುದು.";
      }
      setChatMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
    }, 600);
  };

  const filteredIssues = issues.filter((i) => {
    const matchCategory = filterCategory === 'all' || i.category_id === parseInt(filterCategory);
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;

    if (selectedFilter !== 'All') {
      if (selectedFilter === 'Resolved' && i.status !== 'Resolved') return false;
      if (selectedFilter !== 'Resolved' && categoryNames[i.category_id] !== selectedFilter) return false;
    }

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

  const handleDeleteIssue = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    try {
      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setIssues(prevIssues => prevIssues.filter(issue => issue.id !== id));
      setAdminSelectedIssue(null);
      alert("Report deleted successfully!");
    } catch (err) {
      console.error("Error deleting issue:", err.message);
      alert("Failed to delete report: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-700 font-sans antialiased pb-16 selection:bg-indigo-700 selection:text-white">

      {showSplash && (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white flex flex-col items-center justify-center z-[99999] p-6 text-center select-none">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-4xl font-black shadow-2xl shadow-indigo-500/50 mb-6 animate-pulse">
            🏛️
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
            CivicTrack
          </h1>
          <p className="text-xs font-semibold text-indigo-300/80 max-w-xs mb-8 leading-relaxed">
            Smart Municipal Infrastructure Tracking
          </p>
        </div>
      )}

      {notification && (
        <div className="fixed top-5 right-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl z-[10001] transition transform flex items-center gap-3 text-sm font-bold border border-white/20 animate-bounce backdrop-blur-lg">
          <span className="text-xl">🔔</span> {notification}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-800 via-indigo-600 to-purple-300 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-indigo-300/50">
              🏛️
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-800">
                CivicTrack
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse inline-block" />
                    Admin Active
                  </span>
                  <button
                    onClick={() => setIsAdmin(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1 rounded-xl transition border border-slate-300/80 active:scale-95 whitespace-nowrap shadow-2xs"
                  >
                    Exit
                  </button>
                </div>
                <button
                  onClick={exportToCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1 whitespace-nowrap"
                >
                  📥 Export CSV
                </button>
              </div>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition font-bold text-lg leading-none"
                  aria-label="More options"
                >
                  •••
                </button>

                {showAdminMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Access</p>
                    <form onSubmit={handleAdminLogin} className="flex flex-col gap-2">
                      <input
                        type="password"
                        placeholder="Enter Passcode"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        className="p-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none w-full bg-slate-50 font-mono"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md active:scale-95 w-full"
                      >
                        Authenticate
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {isAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs text-center hover:shadow-md transition">
              <span className="text-[11px] text-slate-400 uppercase font-extrabold tracking-wider">Total Reports</span>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">{totalIssues}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 p-4 sm:p-5 rounded-2xl shadow-xs text-center hover:shadow-md transition">
              <span className="text-[11px] text-amber-700 uppercase font-extrabold tracking-wider">Submitted</span>
              <p className="text-3xl sm:text-4xl font-black text-amber-800 mt-1">{submittedCount}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 p-4 sm:p-5 rounded-2xl shadow-xs text-center hover:shadow-md transition">
              <span className="text-[11px] text-blue-700 uppercase font-extrabold tracking-wider">In Progress</span>
              <p className="text-3xl sm:text-4xl font-black text-blue-800 mt-1">{inProgressCount}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 p-4 sm:p-5 rounded-2xl shadow-xs text-center hover:shadow-md transition">
              <span className="text-[11px] text-emerald-700 uppercase font-extrabold tracking-wider">Resolved</span>
              <p className="text-3xl sm:text-4xl font-black text-emerald-800 mt-1">{resolvedCount}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 border border-indigo-200/80 p-4 sm:p-5 rounded-2xl shadow-xs text-center col-span-2 sm:col-span-1 hover:shadow-md transition">
              <span className="text-[11px] text-indigo-700 uppercase font-extrabold tracking-wider">Total Upvotes</span>
              <p className="text-3xl sm:text-4xl font-black text-indigo-900 mt-1">👍 {totalUpvotes}</p>
            </div>
          </div>
        )}

        {!isAdmin && (
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md shadow-slate-200/50 mb-10 transition">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl">📢</span>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Report Infrastructure Issue</h2>
                  <p className="text-xs font-semibold text-slate-500">Live coordinates required for precise municipal action</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                  Issue Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Damaged Pothole near Main Road"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="p-3.5 border border-slate-300/80 rounded-2xl w-full bg-slate-50/60 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="p-3.5 border border-slate-300/80 rounded-2xl w-full bg-slate-50/60 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                  Issue Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="p-3.5 border border-slate-300/80 rounded-2xl w-full bg-slate-50/60 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-xs font-medium"
                >
                  <option value="1">Roads & Potholes</option>
                  <option value="2">Street Lighting</option>
                  <option value="3">Water & Drainage</option>
                  <option value="4">Sanitation & Garbage</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Live GPS Location <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={getExactGPSLocation}
                    className="text-xs text-indigo-600 font-bold hover:underline bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 transition active:scale-95"
                  >
                    🔄 Refresh GPS
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Acquiring GPS signal...'}
                  className="p-3.5 border border-slate-300/80 rounded-2xl w-full bg-slate-100/80 text-slate-800 font-mono text-sm"
                />
                <span className="text-[11px] text-indigo-600 font-semibold block mt-1.5">{locStatus}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                Detailed Description <span className="text-indigo-600 font-normal">(AI Priority Scoring Enabled)</span>
              </label>
              <textarea
                placeholder="Describe landmark details, hazard level, or relevant landmarks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-3.5 border border-slate-300/80 rounded-2xl w-full bg-slate-50/60 text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-xs h-28"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                Upload Photo Proof
              </label>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold py-3 px-4 rounded-2xl text-center transition active:scale-95 flex items-center justify-center gap-2">
                  <span>📷</span> Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-extrabold py-3 px-4 rounded-2xl text-center transition active:scale-95 flex items-center justify-center gap-2">
                  <span>🖼️</span> Gallery
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {imagePreview && (
                <div className="mt-4 relative w-40 h-40 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[10px] font-bold text-center py-1 backdrop-blur-xs">
                    Ready to Compress
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !location}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold py-4 px-9 rounded-2xl transition shadow-lg shadow-indigo-300/50 disabled:opacity-50 disabled:shadow-none w-full sm:w-auto active:scale-98"
            >
              {loading ? 'Compressing & Submitting...' : 'Submit Official Report'}
            </button>
          </form>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {['All', 'Roads', 'Lighting', 'Water', 'Sanitation', 'Resolved'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition active:scale-95 shadow-2xs ${selectedFilter === filter
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              {filter === 'All' ? '🌐 All Reports' : filter}
            </button>
          ))}
        </div>

        {/* Main Interactive Google Map View */}
        <div className="mb-10 relative z-0" style={{ isolation: 'isolate' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Interactive Map View</h2>
              <p className="text-xs font-semibold text-slate-500">Live spatial overview powered by Google Maps</p>
            </div>
            <div className="flex gap-2.5 text-xs font-bold text-slate-600 flex-wrap bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-xs"></span> Roads</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-xs"></span> Lighting</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-cyan-500 inline-block shadow-xs"></span> Water</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block shadow-xs"></span> Sanitation</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs"></span> Resolved</span>
            </div>
          </div>

          <div className="h-80 w-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-md bg-slate-100 flex items-center justify-center relative z-0">
            {location ? (
              <CivicMap latitude={location.lat} longitude={location.lng} />
            ) : (
              <p className="text-slate-500 font-bold animate-pulse">Locking location signal...</p>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isAdmin ? 'Manage All Reports' : 'My Reported Issues'}
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Showing {filteredIssues.length} active report(s)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Search title, text, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-3 border border-slate-300/80 rounded-2xl bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-1 sm:w-64 shadow-xs font-medium"
            />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-3 border border-slate-300/80 rounded-2xl bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs font-semibold"
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
              className="p-3 border border-slate-300/80 rounded-2xl bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-14 border border-slate-200/90 rounded-3xl bg-white text-center text-slate-500 shadow-xs">
            <span className="text-4xl block mb-3">🔍</span>
            <p className="font-extrabold text-slate-800 text-lg">No matching reports found</p>
            <span className="text-xs font-semibold text-slate-400">Try adjusting your search query or reset status filters</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredIssues.map((issue) => {
              const locText = addresses[issue.id];
              const coords = parseLocation(issue.location);
              const googleMapsUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;

              return (
                <div
                  key={issue.id}
                  onClick={() => handleCardClick(issue)}
                  className={`p-6 border border-slate-200/90 rounded-3xl bg-white shadow-xs hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between transition duration-300 ${isAdmin ? 'hover:border-indigo-400 cursor-pointer' : ''
                    }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div>
                        <div className="flex gap-2 items-center mb-2 flex-wrap">
                          <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border inline-block ${categoryBadges[issue.category_id] || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                            {categoryNames[issue.category_id] || 'Civic Issue'}
                          </span>
                          {issue.priority && (
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${issue.priority === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'
                              }`}>
                              ⚡ {issue.priority} Priority
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-slate-900 leading-snug">{issue.title}</h3>
                        {issue.user_email && (
                          <span className="text-xs text-slate-400 block font-mono mt-1 font-semibold">📧 {issue.user_email}</span>
                        )}
                      </div>
                      <span className={`text-xs font-black px-3.5 py-1 rounded-full whitespace-nowrap shadow-xs ${issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        issue.status === 'In Progress' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                        {issue.status}
                      </span>
                    </div>

                    <ProgressTimeline status={issue.status} />

                    <p className="text-slate-600 text-sm mb-4 leading-relaxed font-medium">{issue.description}</p>
                  </div>

                  <div>
                    {issue.photo_url && (
                      <img
                        src={issue.photo_url}
                        alt="Proof"
                        className="w-full h-48 object-cover rounded-2xl mb-4 border border-slate-200 shadow-inner"
                      />
                    )}

                    {coords && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-4 text-xs flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-slate-800 font-extrabold">
                          <span>📍 Location Address</span>
                        </div>
                        <p className="text-slate-800 font-semibold leading-relaxed bg-white p-3 rounded-xl border border-slate-200/90 text-xs shadow-2xs">
                          {locText || `Latitude: ${coords.lat.toFixed(5)}, Longitude: ${coords.lng.toFixed(5)}`}
                        </p>
                        <div className="flex justify-between items-center pt-1 text-[11px] font-mono text-slate-500">
                          <span>GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                          {googleMapsUrl && (
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 font-sans font-black hover:underline"
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
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black px-4 py-2 rounded-xl transition active:scale-95"
                      >
                        👍 Upvote ({issue.upvotes || 0})
                      </button>
                      {isAdmin ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdminSelectedIssue(issue);
                          }}
                          className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-extrabold px-3.5 py-2 rounded-xl transition border border-indigo-100 active:scale-95"
                        >
                          🔍 View Details ↗
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {new Date(issue.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between pt-3.5 border-t border-slate-100 gap-2 mt-2"
                      >
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-600">Update Status:</label>
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue, e.target.value)}
                            className="p-2 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

      <div className="fixed bottom-5 right-5 z-[9999]">
        {!isChatOpen ? (
          <button onClick={() => setIsChatOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl font-bold flex items-center gap-2 transition active:scale-95">
            💬 Ask Civic AI
          </button>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-80 sm:w-96 flex flex-col h-[420px] overflow-hidden">
            <div className="bg-indigo-600 text-white p-4 flex justify-between items-center font-bold">
              <span>🤖 Civic AI Assistant</span>
              <button onClick={() => setIsChatOpen(false)} className="text-white hover:text-slate-200">✕</button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${m.sender === 'user' ? 'bg-indigo-600 text-white ml-auto' : 'bg-white text-slate-800 border border-slate-200'}`}>
                  {m.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSend} className="p-3 border-t bg-white flex gap-2">
              <input type="text" placeholder="Ask in English or Kannada..." value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 p-2 border rounded-xl text-xs bg-slate-50 focus:outline-none" />
              <button type="submit" className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-xl font-bold">Send</button>
            </form>
          </div>
        )}
      </div>

      {adminSelectedIssue && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setAdminSelectedIssue(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto border border-slate-200 z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAdminSelectedIssue(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-lg transition"
            >
              &times;
            </button>

            <div className="flex items-start justify-between gap-4 mb-6 pr-8">
              <div>
                <span className="text-xs font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full inline-block mb-2">
                  📌 Report ID #{adminSelectedIssue.id} • {categoryNames[adminSelectedIssue.category_id]}
                </span>
                <h2 className="text-2xl font-black text-slate-900 leading-snug">{adminSelectedIssue.title}</h2>
                {adminSelectedIssue.user_email && (
                  <p className="text-xs text-indigo-800 font-bold mt-1 flex items-center gap-1.5">
                    <span>📧</span> Citizen Contact: {adminSelectedIssue.user_email}
                  </p>
                )}
              </div>
              <span className={`text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap shadow-xs ${
                adminSelectedIssue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                adminSelectedIssue.status === 'In Progress' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {adminSelectedIssue.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {adminSelectedIssue.photo_url ? (
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Visual Evidence</h4>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 h-64">
                    <img
                      src={adminSelectedIssue.photo_url}
                      alt="Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 p-6 text-slate-400 text-xs font-bold h-64">
                  No photo attached
                </div>
              )}

              <div className="flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Location Coordinates</h4>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4">
                    <p className="text-xs font-bold text-slate-800 leading-relaxed mb-2">
                      📍 {modalAddressText}
                    </p>
                    {modalCoords && (
                      <a
                        href={`https://www.google.com/maps?q=${modalCoords.lat},${modalCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 font-bold text-xs hover:underline block"
                      >
                        Open in Google Maps ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <span className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider block mb-1">AI Priority Score</span>
                  <span className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
                    ⚡ {adminSelectedIssue.priority || 'Low'} Priority Hazard
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Full Description</h4>
              <p className="text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200 whitespace-pre-wrap leading-relaxed text-sm font-medium">
                {adminSelectedIssue.description || 'No detailed description provided.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-5 border-t border-slate-200 bg-slate-50 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-5 sm:p-6 rounded-b-3xl gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-xs font-extrabold text-slate-700 whitespace-nowrap">Change Status:</label>
                <select
                  value={adminSelectedIssue.status}
                  onChange={(e) => handleStatusChange(adminSelectedIssue, e.target.value)}
                  className="p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-1 sm:w-44 shadow-xs"
                >
                  <option value="Submitted">Submitted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <button
                onClick={() => handleDeleteIssue(adminSelectedIssue.id)}
                className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-xs px-5 py-2.5 rounded-xl font-extrabold shadow-xs active:scale-95 transition w-full sm:w-auto"
              >
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[99999] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-indigo-500/50 flex items-center gap-3 animate-bounce">
          <span className="text-xl">🔔</span>
          <p className="text-xs font-bold tracking-wide">{toastMessage}</p>
        </div>
      )}

    </div>
  );
}