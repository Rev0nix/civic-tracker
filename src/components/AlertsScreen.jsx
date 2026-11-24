import { useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Wrench,
  MessageSquare,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { formatIssueId, getRelativeTime } from '../constants/theme';

export default function AlertsScreen({
  alerts = [],
  onMarkAllRead,
  onMarkRead,
  onSelectAlert,
  onBack,
}) {
  // Group notifications into Today, Yesterday, Earlier
  const groupedAlerts = useMemo(() => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const nowTime = new Date().setHours(0, 0, 0, 0);
    const yesterdayTime = nowTime - 24 * 60 * 60 * 1000;

    alerts.forEach((alert) => {
      const alertTime = new Date(alert.created_at || 0).getTime();
      if (alertTime >= nowTime) {
        today.push(alert);
      } else if (alertTime >= yesterdayTime) {
        yesterday.push(alert);
      } else {
        earlier.push(alert);
      }
    });

    return { today, yesterday, earlier };
  }, [alerts]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const getAlertIcon = (type, status) => {
    if (status === 'Resolved' || type === 'resolved') {
      return {
        icon: CheckCircle2,
        bg: 'bg-[#112C20]',
        text: 'text-[#43C88A]',
        border: 'border-[#1D5C3F]',
      };
    }
    if (status === 'In Progress' || type === 'work_started') {
      return {
        icon: Wrench,
        bg: 'bg-[#163236]',
        text: 'text-[#38BDF8]',
        border: 'border-[#315C60]',
      };
    }
    if (type === 'reply') {
      return {
        icon: MessageSquare,
        bg: 'bg-[#142938]',
        text: 'text-[#8DBBEB]',
        border: 'border-[#274F6E]',
      };
    }
    return {
      icon: AlertCircle,
      bg: 'bg-[#132B2F]',
      text: 'text-[#A3DCE3]',
      border: 'border-[#28616A]',
    };
  };

  const renderAlertCard = (alert) => {
    const style = getAlertIcon(alert.type, alert.status);
    const Icon = style.icon;
    const isUnread = !alert.read;

    return (
      <article
        key={alert.id}
        onClick={() => {
          onMarkRead(alert.id);
          onSelectAlert(alert);
        }}
        className={`bg-[#192223] hover:bg-[#202B2D] border rounded-3xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-md flex items-start gap-4 relative group ${
          isUnread ? 'border-[#28616A]' : 'border-[#354144]'
        }`}
      >
        {/* Unread Indicator Dot */}
        {isUnread && (
          <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#A3DCE3] shadow-sm shadow-[#A3DCE3]/50 animate-pulse" />
        )}

        {/* Circular Coloured Icon */}
        <div
          className={`w-11 h-11 rounded-full ${style.bg} ${style.border} ${style.text} border flex items-center justify-center shrink-0 mt-0.5`}
        >
          <Icon size={18} strokeWidth={2.2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold text-[#A3DCE3]">
              {alert.issue_id ? formatIssueId(alert.issue_id) : 'LOKIFY'}
            </span>
            <span className="text-xs text-[#758588]">·</span>
            <span className="text-xs font-mono text-[#758588]">
              {getRelativeTime(alert.created_at)}
            </span>
            {alert.status && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-[#101819] text-[#A5B1B3] border border-[#354144]">
                {alert.status}
              </span>
            )}
          </div>

          <h4 className="text-sm font-bold text-[#F0F4F4] group-hover:text-[#A3DCE3] transition-colors leading-snug mb-1">
            {alert.title}
          </h4>

          <p className="text-xs text-[#A5B1B3] leading-relaxed">
            {alert.description}
          </p>
        </div>
      </article>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#080F0F] text-[#F0F4F4] overflow-hidden">
      {/* Pinned Mobile Top Tab Section */}
      <header className="shrink-0 w-full px-3 py-3 bg-[#101819] border-b border-[#253538] flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-[#192223] hover:bg-[#202B2D] text-[#A3DCE3] hover:text-[#F0F4F4] border border-[#354144] flex items-center justify-center transition active:scale-95 shadow-sm shrink-0"
              title="Back to previous screen"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-[#F0F4F4] font-mono leading-none">
              Carrier Alerts
            </h1>
            <p className="text-[10px] font-mono text-[#758588] mt-0.5 truncate">
              Real-time SMS & municipal updates
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 bg-[#192223] hover:bg-[#202B2D] border border-[#354144] hover:border-[#A3DCE3] px-3 py-1.5 rounded-xl text-xs font-mono font-semibold text-[#A3DCE3] transition active:scale-95 shadow-sm shrink-0"
          >
            <CheckCheck size={13} />
            <span>Mark read</span>
          </button>
        )}
      </header>

      {/* Scrollable Alerts List Container */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain px-3 py-3 pb-6 no-scrollbar">

      {alerts.length === 0 ? (
        <div className="bg-[#192223] border border-[#354144] rounded-3xl p-10 text-center my-6 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center mb-4">
            <Bell size={24} />
          </div>
          <h3 className="text-lg font-bold text-[#F0F4F4] mb-1">No alerts yet</h3>
          <p className="text-xs text-[#758588] max-w-xs mx-auto">
            Updates regarding your reported issues and municipal responses will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today Group */}
          {groupedAlerts.today.length > 0 && (
            <section>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#758588] mb-3 px-1">
                Today
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {groupedAlerts.today.map(renderAlertCard)}
              </div>
            </section>
          )}

          {/* Yesterday Group */}
          {groupedAlerts.yesterday.length > 0 && (
            <section>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#758588] mb-3 px-1">
                Yesterday
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {groupedAlerts.yesterday.map(renderAlertCard)}
              </div>
            </section>
          )}

          {/* Earlier Group */}
          {groupedAlerts.earlier.length > 0 && (
            <section>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#758588] mb-3 px-1">
                Earlier
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {groupedAlerts.earlier.map(renderAlertCard)}
              </div>
            </section>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
