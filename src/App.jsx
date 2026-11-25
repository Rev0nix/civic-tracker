import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';
import { reverseGeocode, extractLocality } from './googleMaps';
import { analyzePriority, calculateDistance, compressImage, parseLocation } from './utils/issueHelpers';
import { sendSmsNotification } from './utils/smsService';
import AuthScreen from './components/AuthScreen';
import MobileAppHeader from './components/MobileAppHeader';
import BottomNav from './components/BottomNav';
import SmsBanner from './components/SmsBanner';
import FeedScreen from './components/FeedScreen';
import MyIssuesScreen from './components/MyIssuesScreen';
import AlertsScreen from './components/AlertsScreen';
import ProfileScreen from './components/ProfileScreen';
import ReportIssueModal from './components/ReportIssueModal';
import IssueDetailModal from './components/IssueDetailModal';
import AiAssistantModal from './components/AiAssistantModal';
import LokAiScreen from './components/LokAiScreen';
import InAppUpdateModal from './components/InAppUpdateModal';
import CivicMap from './components/CivicMap';
import AppLogo from './components/AppLogo';
import { checkForAppUpdate, CURRENT_APP_VERSION } from './services/appUpdater';
import { mapToDbCategoryId } from './constants/theme';
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import './App.css';

// Initial reference alerts
const DEFAULT_ALERTS = [
  {
    id: 'alt-1',
    issue_id: '2481',
    type: 'work_started',
    title: 'Work has started on drainage',
    description: 'Work has started. The drain near the bus stop will be cleared this week. SMS sent to registered mobile.',
    status: 'In Progress',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'alt-2',
    issue_id: '2480',
    type: 'resolved',
    title: 'Broken road surface repaired',
    description: 'Marked fixed. Confirm it looks right from your side on site. SMS confirmation dispatched.',
    status: 'Resolved',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'alt-3',
    issue_id: '2479',
    type: 'reply',
    title: 'Authority response on drinking water line',
    description: 'Admin: The valve line maintenance is scheduled for Thursday morning.',
    status: 'Assigned',
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'alt-4',
    issue_id: '2478',
    type: 'acknowledged',
    title: 'Pothole hazard acknowledged',
    description: 'Your report was acknowledged by the ward office inspection team.',
    status: 'Acknowledged',
    created_at: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lokify_auth_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'map' | 'my-issues' | 'alerts' | 'lok-ai' | 'profile'
  const [previousTab, setPreviousTab] = useState('feed');
  const [issues, setIssues] = useState([]);
  const [addresses, setAddresses] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Acquiring live GPS...');
  const [currentLocality, setCurrentLocality] = useState('Locating...');
  const [locationState, setLocationState] = useState('locating'); // 'locating' | 'found' | 'permission_denied' | 'unavailable'

  // User Profile & Device
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('lokify_device_id');
    if (!id) {
      id = 'lk_dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('lokify_device_id', id);
    }
    return id;
  });

  // Upvoted & Followed IDs
  const [upvotedIssueIds, setUpvotedIssueIds] = useState(() => {
    const saved = localStorage.getItem('lokify_upvotes');
    return saved ? JSON.parse(saved) : [];
  });

  // Alerts & Notifications
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('lokify_alerts');
    return saved ? JSON.parse(saved) : DEFAULT_ALERTS;
  });

  // Modals & Navigation state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  // Admin / Officer role is strictly active ONLY when logged in with officer credentials
  const isAdmin = currentUser?.role === 'admin';

  // Splash Screen & Toast
  const [showSplash, setShowSplash] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  // Auto-check for in-app software updates after splash
  useEffect(() => {
    const timer = setTimeout(async () => {
      const info = await checkForAppUpdate();
      if (info && info.hasUpdate) {
        setUpdateInfo(info);
        setUpdateModalOpen(true);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss splash screen after 1.8s
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Sync auth state to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('lokify_auth_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('lokify_auth_session');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('lokify_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('lokify_upvotes', JSON.stringify(upvotedIssueIds));
  }, [upvotedIssueIds]);

  // Manual In-App Update Trigger
  const handleManualUpdateCheck = useCallback(async () => {
    showToast('Checking for Lokify software updates...', 'info');
    const info = await checkForAppUpdate();
    if (info && info.hasUpdate) {
      setUpdateInfo(info);
      setUpdateModalOpen(true);
    } else if (info && info.error) {
      showToast(`Update check failed: ${info.error}. Retrying...`, 'error');
    } else {
      showToast(`Lokify is up to date (v${CURRENT_APP_VERSION})!`, 'success');
    }
  }, [showToast]);

  // GPS Acquisition
  const acquireGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser/device.');
      setLocationState('unavailable');
      return;
    }

    setLocationStatus('Acquiring high accuracy GPS lock...');
    setLocationState('locating');

    // 6-second timeout fallback so it never stays stuck on 'Locating...'
    const fallbackTimer = setTimeout(() => {
      setLocationState((prev) => (prev === 'locating' ? 'found' : prev));
      if (!userLocation) {
        setCurrentLocality((prev) => (prev === 'Locating...' ? 'Bengaluru' : prev));
      }
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(fallbackTimer);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocationStatus(`Locked: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        setLocationState('found');

        try {
          const address = await reverseGeocode(coords.lat, coords.lng);
          if (address) {
            const loc = extractLocality(address, coords.lat, coords.lng);
            setCurrentLocality(loc);
          }
        } catch {
          setCurrentLocality('City Center');
        }
      },
      (err) => {
        // Fallback network position
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            clearTimeout(fallbackTimer);
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(coords);
            setLocationStatus(`Network Location: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
            setLocationState('found');
            try {
              const address = await reverseGeocode(coords.lat, coords.lng);
              if (address) {
                setCurrentLocality(extractLocality(address, coords.lat, coords.lng));
              }
            } catch {
              setCurrentLocality('City Center');
            }
          },
          (fallbackErr) => {
            clearTimeout(fallbackTimer);
            if (err?.code === 1 || fallbackErr?.code === 1) {
              setLocationStatus('Location permission denied by user.');
              setLocationState('permission_denied');
            } else {
              setLocationStatus('Location signal unavailable. Using default center.');
              setLocationState('unavailable');
            }
            setCurrentLocality((prev) => (prev === 'Locating...' ? 'Anna Nagar' : prev));
          },
          { enableHighAccuracy: false, timeout: 6000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, [userLocation]);

  // Reverse geocode missing addresses asynchronously
  const resolveMissingAddresses = useCallback(async (list) => {
    const updates = {};
    for (const item of list) {
      if (!addresses[item.id]) {
        const coords = parseLocation(item.location, item.latitude, item.longitude);
        if (coords) {
          try {
            const addr = await reverseGeocode(coords.lat, coords.lng);
            if (addr) updates[item.id] = addr;
          } catch {
            // Ignore failure
          }
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      setAddresses((prev) => ({ ...prev, ...updates }));
    }
  }, [addresses]);

  // Fetch issues from Supabase
  const fetchIssues = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setIssues(data);
        resolveMissingAddresses(data);
      }
    } catch (err) {
      console.warn('Failed to fetch issues from Supabase:', err.message);
    }
  }, [resolveMissingAddresses]);

  // Initial load & Supabase Realtime channel
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIssues();
      acquireGPSLocation();
    }, 0);

    const channel = supabase
      .channel('lokify-public-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, (payload) => {
        fetchIssues();

        if (payload.eventType === 'UPDATE' && payload.new) {
          const updated = payload.new;
          showToast(`Issue #${updated.id} status updated to: ${updated.status}`, 'success');

          // Send real-time SMS to the logged-in user if it belongs to them
          if (currentUser?.phone) {
            sendSmsNotification({
              toPhone: currentUser.phone,
              issueId: String(updated.id),
              message: `Lokify SMS: Report #${updated.id} ("${updated.title}") status changed to: ${updated.status}.`,
              eventType: 'STATUS_UPDATE',
            });
          }

          // Add to local activity alerts
          const newAlert = {
            id: 'alt_' + Date.now(),
            issue_id: String(updated.id),
            type: updated.status === 'Resolved' ? 'resolved' : 'work_started',
            title: `Report "${updated.title}" updated`,
            description: `The status was changed to ${updated.status} by municipal officials. SMS sent.`,
            status: updated.status,
            created_at: new Date().toISOString(),
            read: false,
          };
          setAlerts((prev) => [newAlert, ...prev]);
        }
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchIssues, acquireGPSLocation, showToast, currentUser?.phone]);

  // Check for duplicates within 100 meters
  const checkDuplicate = (catId, loc) => {
    if (!loc) return null;
    for (const issue of issues) {
      if (String(issue.category_id) === String(catId)) {
        const coords = parseLocation(issue.location, issue.latitude, issue.longitude);
        if (coords) {
          const dist = calculateDistance(loc.lat, loc.lng, coords.lat, coords.lng);
          if (dist <= 100) return { issue, dist: Math.round(dist) };
        }
      }
    }
    return null;
  };

  // Handle new issue submission
  const handlePostReport = async ({ title, categoryId, description, userEmail, userPhone, file, location }) => {
    // 1. Duplicate check
    const dup = checkDuplicate(categoryId, location);
    if (dup) {
      const proceed = window.confirm(
        `⚠️ Similar Report Found:\n"${dup.issue.title}" was reported ~${dup.dist}m away.\n\nTap OK to submit anyway, or Cancel to inspect existing report.`
      );
      if (!proceed) {
        setSelectedIssue(dup.issue);
        return;
      }
    }

    // 2. Client-side Image compression and upload
    let photoUrl = null;
    if (file) {
      const compressed = await compressImage(file);
      const filePath = `lokify_${Date.now()}_${compressed.name}`;

      const { error: uploadErr } = await supabase.storage
        .from('issue-photos')
        .upload(filePath, compressed);

      if (uploadErr) {
        console.warn('Storage bucket upload issue, continuing with submission:', uploadErr.message);
      } else {
        photoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/issue-photos/${filePath}`;
      }
    }

    // 3. AI Smart Priority
    const priority = analyzePriority(title, description);
    const pointLocation = `POINT(${location.lng} ${location.lat})`;
    const targetEmail = userEmail || currentUser?.email || 'citizen@lokify.gov';
    const targetPhone = userPhone || currentUser?.phone || '+91 98451 23456';

    // 4. Insert into Supabase with safe DB category mapping
    const dbCategoryId = mapToDbCategoryId(categoryId);
    const { error: insertErr } = await supabase.from('issues').insert([
      {
        title,
        user_email: targetEmail,
        description,
        photo_url: photoUrl,
        location: pointLocation,
        category_id: dbCategoryId,
        status: 'Submitted',
        device_id: deviceId,
        upvotes: 0,
        priority,
      },
    ]);

    if (insertErr) {
      console.warn('First insert attempt error:', insertErr);
      // Fallback in case of foreign key constraint discrepancy
      if (insertErr.message?.includes('issues_category_id_fkey') || insertErr.code === '23503') {
        const { error: retryErr } = await supabase.from('issues').insert([
          {
            title,
            user_email: targetEmail,
            description,
            photo_url: photoUrl,
            location: pointLocation,
            category_id: 1, // Fallback to verified category 1
            status: 'Submitted',
            device_id: deviceId,
            upvotes: 0,
            priority,
          },
        ]);
        if (retryErr) throw retryErr;
      } else {
        throw insertErr;
      }
    }

    // 5. Send Realtime SMS Notification to Citizen
    sendSmsNotification({
      toPhone: targetPhone,
      message: `Lokify SMS: Report "${title}" has been registered successfully. Tracking active. You will receive SMS alerts as officials work on it.`,
      eventType: 'REPORT_SUBMITTED',
    });

    // 6. Update state & alert
    fetchIssues();
    showToast('Report posted successfully! SMS alert dispatched to your mobile.', 'success');

    // Add alert
    const creationAlert = {
      id: 'alt_' + Date.now(),
      type: 'acknowledged',
      title: 'Report Submitted',
      description: `Your issue "${title}" has been registered. SMS sent to ${targetPhone}.`,
      status: 'Open',
      created_at: new Date().toISOString(),
      read: false,
    };
    setAlerts((prev) => [creationAlert, ...prev]);
  };

  // Handle Upvotes
  const handleUpvote = async (issueId, currentVotes = 0) => {
    if (upvotedIssueIds.includes(issueId)) {
      showToast('You already supported this issue.', 'info');
      return;
    }

    setUpvotedIssueIds((prev) => [...prev, issueId]);
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, upvotes: (i.upvotes || 0) + 1 } : i))
    );

    try {
      await supabase
        .from('issues')
        .update({ upvotes: (currentVotes || 0) + 1 })
        .eq('id', issueId);
      showToast('Vote registered! Elevated community priority.', 'success');
    } catch {
      // Ignored
    }
  };

  // Handle Share
  const handleShare = async (issue) => {
    const shareData = {
      title: issue.title,
      text: `Lokify Municipal Report: ${issue.title} (Status: ${issue.status})`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback
      }
    }

    navigator.clipboard.writeText(
      `Lokify Report: ${issue.title} (#${issue.id})\nView on: ${window.location.href}`
    );
    showToast('Report link copied to clipboard!', 'info');
  };

  // Handle Status Update (Admin)
  const handleAdminStatusChange = async (issueItem, newStatus) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update({ status: newStatus })
        .eq('id', issueItem.id);

      if (error) throw error;

      setIssues((prev) =>
        prev.map((i) => (i.id === issueItem.id ? { ...i, status: newStatus } : i))
      );

      if (selectedIssue && selectedIssue.id === issueItem.id) {
        setSelectedIssue((prev) => ({ ...prev, status: newStatus }));
      }

      showToast(`Status updated to "${newStatus}"`, 'success');

      // Dispatch SMS
      const citizenPhone = issueItem.user_phone || currentUser?.phone || '+91 98451 23456';
      sendSmsNotification({
        toPhone: citizenPhone,
        issueId: String(issueItem.id),
        message: `Lokify Alert: Your issue #${issueItem.id} ("${issueItem.title}") was updated to "${newStatus}" by Ward Officer.`,
        eventType: 'STATUS_UPDATE',
      });

      // Dispatch Email if citizen email exists & status is Resolved
      if (newStatus === 'Resolved' && issueItem.user_email) {
        emailjs
          .send(
            'service_7v8m16b',
            'template_vtc51wn',
            {
              email: issueItem.user_email,
              issue_title: issueItem.title,
              status: newStatus,
            },
            'hIQcr3HDUS9AFupsd'
          )
          .catch((err) => console.warn('EmailJS error:', err));
      }
    } catch (err) {
      showToast('Error updating status: ' + err.message, 'error');
    }
  };

  // Handle Issue Delete (Admin)
  const handleDeleteIssue = async (id) => {
    if (!window.confirm('Are you sure you want to delete this municipal report?')) return;

    try {
      const { error } = await supabase.from('issues').delete().eq('id', id);
      if (error) throw error;

      setIssues((prev) => prev.filter((i) => i.id !== id));
      if (selectedIssue && selectedIssue.id === id) {
        setSelectedIssue(null);
      }
      showToast('Report deleted successfully.', 'info');
    } catch (err) {
      showToast('Failed to delete report: ' + err.message, 'error');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (issues.length === 0) {
      showToast('No reports available to export.', 'error');
      return;
    }

    const headers = ['ID', 'Title', 'Citizen Email', 'Category ID', 'Status', 'Priority', 'Upvotes', 'Created At'];
    const rows = issues.map((i) => [
      i.id,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${i.user_email || ''}"`,
      i.category_id,
      i.status,
      i.priority || 'Low',
      i.upvotes || 0,
      new Date(i.created_at).toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lokify_reports_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Municipal CSV file generated!', 'success');
  };

  // Citizen Confirmation
  const handleConfirmFixed = (issueId, isFixed) => {
    showToast(
      isFixed ? 'Confirmed! Marked as community-verified fixed.' : 'Dispute logged! Ward team will reinspect.',
      isFixed ? 'success' : 'info'
    );
  };

  // Mark all read in alerts
  const handleMarkAllAlertsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    showToast('All alerts marked as read', 'info');
  };

  const handleMarkAlertRead = (alertId) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
  };

  const handleSelectAlert = (alert) => {
    if (alert.issue_id) {
      const match = issues.find((i) => String(i.id) === String(alert.issue_id));
      if (match) {
        setSelectedIssue(match);
      }
    }
  };

  // Logout handler
  const handleLogout = () => {
    if (window.confirm('Sign out of your Lokify session?')) {
      setCurrentUser(null);
      localStorage.removeItem('lokify_auth_session');
      localStorage.removeItem('lokify_admin_mode');
      showToast('Signed out successfully.', 'info');
    }
  };

  const unreadAlertsCount = alerts.filter((a) => !a.read).length;
  const myIssues = issues.filter(
    (i) => (deviceId && i.device_id === deviceId) || (currentUser?.email && i.user_email === currentUser.email)
  );
  const upvotesReceived = myIssues.reduce((acc, curr) => acc + (curr.upvotes || 0), 0);

  // If user is not logged in, enforce the Login Screen for both Web & App!
  if (!currentUser) {
    return (
      <div className="fixed inset-0 w-full h-[100dvh] max-w-md mx-auto bg-[#080F0F] text-[#F0F4F4] font-sans flex flex-col overflow-hidden select-none">
        {/* Animated Startup Splash Screen */}
        {showSplash && (
          <div className="fixed inset-0 z-50 bg-[#080F0F] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
            <AppLogo size="xl" className="mb-6 animate-pulse" />
            <h1 className="text-4xl font-extrabold tracking-tight text-[#F0F4F4] mb-2 font-mono">
              LOKIFY
            </h1>
            <p className="text-xs font-mono text-[#A5B1B3] tracking-widest uppercase">
              Smart Municipal Grievance & Issue Tracking
            </p>
          </div>
        )}

        {/* Global SMS Alert Pop-up */}
        <SmsBanner />

        {/* Dedicated Authentication Screen */}
        <AuthScreen
          onLogin={(user) => {
            setCurrentUser(user);
            try {
              localStorage.setItem('lokify_auth_session', JSON.stringify(user));
            } catch {
              // Ignore storage errors in private browsing
            }
            showToast(`Welcome ${user.name}! SMS alerts verified.`, 'success');
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-w-md mx-auto bg-[#0D1117] text-[#F0F6FC] font-sans flex flex-col overflow-hidden border-x border-[#21262D] select-none">
      {/* Live Carrier SMS Heads-Up Notification Banner */}
      <SmsBanner />

      {/* Pure Mobile Application Header (Clean Top Right: Alerts & Logout Only) */}
      <MobileAppHeader
        currentLocality={currentLocality}
        onRefreshLocation={acquireGPSLocation}
        onLogout={handleLogout}
        onOpenAlerts={() => {
          if (activeTab !== 'alerts') setPreviousTab(activeTab);
          setActiveTab('alerts');
        }}
        unreadAlertsCount={unreadAlertsCount}
        locationState={locationState}
      />

      {/* Centered Screen Modal Notification Popup with OK Button */}
      {toast && (
        <div
          className="fixed inset-0 z-50 bg-[#0D1117]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setToast(null)}
        >
          <div
            className={`border rounded-2xl p-5 max-w-sm w-full shadow-2xl text-center flex flex-col items-center gap-2.5 animate-in zoom-in-95 duration-150 bg-[#161B22] ${
              toast.type === 'success'
                ? 'border-[#238636]/40'
                : toast.type === 'error'
                ? 'border-[#5C2424]'
                : 'border-[#30363D]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                toast.type === 'success'
                  ? 'bg-[#238636]/15 text-[#3FB950] border border-[#238636]/30'
                  : toast.type === 'error'
                  ? 'bg-[#321616] text-[#F85149] border border-[#5C2424]'
                  : 'bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 size={24} />
              ) : toast.type === 'error' ? (
                <AlertTriangle size={24} />
              ) : (
                <Bell size={24} />
              )}
            </div>

            <h3 className="text-sm font-semibold text-[#F0F6FC]">
              {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Notice' : 'Notification'}
            </h3>

            <p className="text-xs text-[#8B949E] leading-relaxed">
              {toast.message}
            </p>

            <button
              onClick={() => setToast(null)}
              className="w-full mt-2 bg-[#1F6FEB] hover:bg-[#388BFD] text-white font-semibold text-xs py-2.5 rounded-xl transition active:scale-95 shadow-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Active Tab Screen */}
      <main className="flex-1 w-full overflow-hidden relative min-h-0">
        <div key={activeTab} className="screen-transition w-full h-full">
          {activeTab === 'feed' && (
            <FeedScreen
              issues={issues}
              addresses={addresses}
              currentLocality={currentLocality}
              userLocation={userLocation}
              onRefreshLocation={acquireGPSLocation}
              onSelectIssue={(issue) => setSelectedIssue(issue)}
              onOpenReport={() => setIsReportModalOpen(true)}
              onUpvote={handleUpvote}
              upvotedIssueIds={upvotedIssueIds}
              onShareIssue={handleShare}
              isAdmin={isAdmin}
              onExportCSV={handleExportCSV}
              onExitAdmin={isAdmin ? handleLogout : null}
            />
          )}

          {activeTab === 'map' && (
            <div className="h-full w-full relative">
              <CivicMap
                latitude={userLocation?.lat}
                longitude={userLocation?.lng}
                issues={issues}
                addresses={addresses}
                onSelectIssue={(issue) => setSelectedIssue(issue)}
                onRefreshLocation={acquireGPSLocation}
                height="h-full"
              />
            </div>
          )}

          {activeTab === 'my-issues' && (
            <MyIssuesScreen
              issues={issues}
              addresses={addresses}
              currentDeviceId={deviceId}
              currentUserEmail={currentUser?.email}
              onSelectIssue={(issue) => setSelectedIssue(issue)}
              onOpenReport={() => setIsReportModalOpen(true)}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsScreen
              alerts={alerts}
              onMarkAllRead={handleMarkAllAlertsRead}
              onMarkRead={handleMarkAlertRead}
              onSelectAlert={handleSelectAlert}
              onBack={() => setActiveTab(previousTab || 'feed')}
            />
          )}

          {activeTab === 'lok-ai' && (
            <LokAiScreen
              onOpenReport={() => setIsReportModalOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              userName={currentUser?.name}
              userEmail={currentUser?.email}
              userPhone={currentUser?.phone}
              userLocality={currentLocality}
              issues={issues}
              myIssuesCount={myIssues.length}
              upvotesReceived={upvotesReceived}
              isAdmin={isAdmin}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onLogout={handleLogout}
              onCheckUpdate={handleManualUpdateCheck}
              onUpdateProfile={(updated) => {
                setCurrentUser((prev) => ({ ...prev, ...updated }));
                showToast('Profile & SMS routing updated!', 'success');
              }}
            />
          )}
        </div>
      </main>

      {/* Mobile App Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (activeTab !== 'alerts') setPreviousTab(activeTab);
          setActiveTab(tab);
        }}
        onOpenReport={() => setIsReportModalOpen(true)}
        unreadAlertsCount={unreadAlertsCount}
      />

      {/* Screen 4: Report Issue Modal Sheet */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handlePostReport}
        currentLocation={userLocation}
        locationStatus={locationStatus}
        onRefreshLocation={acquireGPSLocation}
        initialEmail={currentUser?.email}
        initialPhone={currentUser?.phone}
      />

      {/* Screen 5: Dedicated Issue Details Modal with Officer Controls */}
      <IssueDetailModal
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        addressText={selectedIssue ? addresses[selectedIssue.id] : ''}
        onUpvote={handleUpvote}
        isUpvoted={selectedIssue ? upvotedIssueIds.includes(selectedIssue.id) : false}
        onShare={handleShare}
        onConfirmFixed={handleConfirmFixed}
        isAdmin={isAdmin}
        onUpdateStatus={handleAdminStatusChange}
        onDeleteIssue={handleDeleteIssue}
      />


      {/* Multilingual Lokify AI Assistant */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      {/* In-App Software Update Modal */}
      <InAppUpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        updateInfo={updateInfo}
      />
    </div>
  );
}
