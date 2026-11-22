import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';
import { reverseGeocode, extractLocality } from './googleMaps';
import { analyzePriority, calculateDistance, compressImage, parseLocation } from './utils/issueHelpers';
import { sendSmsNotification } from './utils/smsService';
import AuthScreen from './components/AuthScreen';
import DesktopHeader from './components/DesktopHeader';
import BottomNav from './components/BottomNav';
import SmsBanner from './components/SmsBanner';
import FeedScreen from './components/FeedScreen';
import MyIssuesScreen from './components/MyIssuesScreen';
import AlertsScreen from './components/AlertsScreen';
import ProfileScreen from './components/ProfileScreen';
import ReportIssueModal from './components/ReportIssueModal';
import IssueDetailModal from './components/IssueDetailModal';
import AdminModal from './components/AdminModal';
import AiAssistantModal from './components/AiAssistantModal';
import CivicMap from './components/CivicMap';
import AppLogo from './components/AppLogo';
import { Bell, CheckCircle2, AlertTriangle, MapPin, Plus } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'my-issues' | 'alerts' | 'profile'
  const [issues, setIssues] = useState([]);
  const [addresses, setAddresses] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Acquiring live GPS...');
  const [currentLocality, setCurrentLocality] = useState('Locating...');

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
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const isAdmin = currentUser?.role === 'admin' || adminOverride;

  // Splash Screen & Toast
  const [showSplash, setShowSplash] = useState(true);
  const [toast, setToast] = useState(null);

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

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // GPS Acquisition
  const acquireGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser/device.');
      return;
    }

    setLocationStatus('Acquiring high accuracy GPS lock...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocationStatus(`Locked: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);

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
      () => {
        // Fallback network position
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(coords);
            setLocationStatus(`Network Location: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
            try {
              const address = await reverseGeocode(coords.lat, coords.lng);
              if (address) {
                setCurrentLocality(extractLocality(address, coords.lat, coords.lng));
              }
            } catch {
              setCurrentLocality('City Center');
            }
          },
          () => {
            setLocationStatus('Please enable device location permissions.');
            setCurrentLocality('Anna Nagar');
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

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

    // 4. Insert into Supabase
    const { error: insertErr } = await supabase.from('issues').insert([
      {
        title,
        user_email: targetEmail,
        description,
        photo_url: photoUrl,
        location: pointLocation,
        category_id: parseInt(categoryId, 10),
        status: 'Submitted',
        device_id: deviceId,
        upvotes: 0,
        priority,
      },
    ]);

    if (insertErr) throw insertErr;

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
      text: `Lokify Civic Report: ${issue.title} (Status: ${issue.status})`,
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
      <div className="bg-[#080F0F] min-h-screen text-[#F0F4F4]">
        {/* Animated Startup Splash Screen */}
        {showSplash && (
          <div className="fixed inset-0 z-50 bg-[#080F0F] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
            <AppLogo size="xl" className="mb-6 animate-pulse" />
            <h1 className="text-4xl font-extrabold tracking-tight text-[#F0F4F4] mb-2 font-mono">
              LOKIFY
            </h1>
            <p className="text-xs font-mono text-[#A5B1B3] tracking-widest uppercase">
              Civic Issue Reporting & Municipal Tracking
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
    <div className="bg-[#080F0F] text-[#F0F4F4] min-h-screen relative font-sans flex flex-col">
      {/* Live Carrier SMS Heads-Up Notification Banner */}
      <SmsBanner />

      {/* Desktop Website Top Header */}
      <DesktopHeader
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        unreadAlertsCount={unreadAlertsCount}
        currentUser={currentUser}
        currentLocality={currentLocality}
        onOpenReport={() => setIsReportModalOpen(true)}
        onLogout={handleLogout}
        onOpenAdminPortal={() => setIsAdminModalOpen(true)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-300 ${
            toast.type === 'success'
              ? 'bg-[#112C20] border-[#1D5C3F] text-[#43C88A]'
              : toast.type === 'error'
              ? 'bg-[#321616] border-[#5C2424] text-[#EF6666]'
              : 'bg-[#192223] border-[#354144] text-[#A3DCE3]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertTriangle size={18} className="shrink-0" />
          ) : (
            <Bell size={18} className="shrink-0" />
          )}
          <span className="text-xs font-mono font-medium leading-relaxed">{toast.message}</span>
        </div>
      )}

      {/* Active Tab Screen */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-0 sm:px-4">
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
          />
        )}

        {activeTab === 'map' && (
          <div className="py-6 px-4 max-w-7xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#354144]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black font-mono tracking-tight text-[#F0F4F4]">
                    Civic GIS Map
                  </h2>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#132B2F] text-[#A3DCE3] border border-[#28616A]">
                    Live Spatial Radar
                  </span>
                </div>
                <p className="text-xs font-mono text-[#A5B1B3] mt-0.5">
                  Real-time geospatial map of municipal issues. Dual engine: Google Maps (Key: 016089-E20F62-171E41) & Leaflet Dark GIS.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={acquireGPSLocation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#192223] hover:bg-[#202B2D] border border-[#354144] text-[#A3DCE3] text-xs font-mono font-semibold transition"
                >
                  <MapPin size={14} />
                  <span>Locate Me</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] text-xs font-mono font-bold transition shadow-md"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Report Issue</span>
                </button>
              </div>
            </div>

            <CivicMap
              latitude={userLocation?.lat}
              longitude={userLocation?.lng}
              issues={issues}
              addresses={addresses}
              onSelectIssue={(issue) => setSelectedIssue(issue)}
              height="h-[640px]"
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
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenAdminPortal={() => setIsAdminModalOpen(true)}
            isAdminActive={isAdmin}
            onLogout={handleLogout}
            onOpenAiAssistant={() => setIsAiModalOpen(true)}
            onUpdateProfile={(updated) => {
              setCurrentUser((prev) => ({ ...prev, ...updated }));
              showToast('Profile & SMS routing updated!', 'success');
            }}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation (visible on mobile screens) */}
      <div className="md:hidden">
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          unreadAlertsCount={unreadAlertsCount}
        />
      </div>

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

      {/* Screen 5: Dedicated Issue Details Modal */}
      <IssueDetailModal
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        addressText={selectedIssue ? addresses[selectedIssue.id] : ''}
        onUpvote={handleUpvote}
        isUpvoted={selectedIssue ? upvotedIssueIds.includes(selectedIssue.id) : false}
        onShare={handleShare}
        onConfirmFixed={handleConfirmFixed}
      />

      {/* Municipal Authority Admin Center */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAdmin={isAdmin}
        onAuthenticate={(authStatus) => {
          setAdminOverride(authStatus);
          showToast('Authenticated as Municipal Official', 'success');
        }}
        onExitAdmin={() => {
          setAdminOverride(false);
          showToast('Exited Admin Mode', 'info');
        }}
        issues={issues}
        onUpdateStatus={handleAdminStatusChange}
        onDeleteIssue={handleDeleteIssue}
        onExportCSV={handleExportCSV}
        onSelectIssue={(issue) => {
          setIsAdminModalOpen(false);
          setSelectedIssue(issue);
        }}
      />

      {/* Multilingual Civic AI Assistant */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
}
