import { useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Wrench,
  MessageSquare,
  AlertCircle,
  ArrowLeft,
  Clock,
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
        bg: 'bg-[#238636]/15',
        text: 'text-[#3FB950]',
        border: 'border-[#238636]/30',
      };
    }
    if (status === 'In Progress' || type === 'work_started') {
      return {
        icon: Wrench,
        bg: 'bg-[#1F6FEB]/15',
        text: 'text-[#58A6FF]',
        border: 'border-[#1F6FEB]/30',
      };
    }
    if (type === 'reply') {
      return {
        icon: MessageSquare,
        bg: 'bg-[#8957E5]/15',
        text: 'text-[#D2A8FF]',
        border: 'border-[#8957E5]/30',
      };
    }
    return {
      icon: AlertCircle,
      bg: 'bg-[#21262D]',
      text: 'text-[#58A6FF]',
      border: 'border-[#30363D]',
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
        className={`bg-[#161B22] hover:bg-[#1C2128] border rounded-xl p-3.5 transition-all duration-150 cursor-pointer shadow-sm flex items-start gap-3 relative group ${
          isUnread ? 'border-[#58A6FF]/60' : 'border-[#30363D]'
        }`}
      >
        {/* Unread Indicator Dot */}
        {isUnread && (
          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#58A6FF] shadow-sm shadow-[#58A6FF]/50" />
        )}

        {/* Circular Icon */}
        <div
          className={`w-9 h-9 rounded-xl ${style.bg} ${style.border} ${style.text} border flex items-center justify-center shrink-0 mt-0.5`}
        >
          <Icon size={16} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-mono text-[#8B949E]">
              {alert.issue_id ? formatIssueId(alert.issue_id) : 'LOKIFY'}
            </span>
            <span className="text-xs text-[#8B949E]">·</span>
            <span className="text-[11px] text-[#8B949E] flex items-center gap-1">
              <Clock size={10} />
              {getRelativeTime(alert.created_at)}
            </span>
            {alert.status && (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-[#21262D] text-[#C9D1D9] border border-[#30363D]">
                {alert.status}
              </span>
            )}
          </div>

          <h4 className="text-xs font-semibold text-[#F0F6FC] group-hover:text-[#58A6FF] transition-colors leading-snug mb-0.5">
            {alert.title}
          </h4>

          <p className="text-[11px] text-[#8B949E] leading-relaxed">
            {alert.description}
          </p>
        </div>
      </article>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0D1117] text-[#F0F6FC] overflow-hidden">
      {/* Pinned Mobile Top Tab Section */}
      <header className="shrink-0 w-full px-4 py-3 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] flex items-center justify-center transition active:scale-95 shadow-sm shrink-0"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-[#F0F6FC] leading-none">
              Updates & Alerts
            </h1>
            <p className="text-xs text-[#8B949E] mt-0.5 truncate">
              SMS dispatch notices & municipal actions
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] px-2.5 py-1 rounded-lg text-xs font-medium text-[#58A6FF] transition active:scale-95 shadow-sm shrink-0"
          >
            <CheckCheck size={13} />
            <span>Mark all read</span>
          </button>
        )}
      </header>

      {/* Scrollable Alerts List Container */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain px-3.5 py-3 pb-6 no-scrollbar">
        {alerts.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-8 text-center my-6 flex flex-col items-center max-w-sm mx-auto shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#21262D] text-[#58A6FF] flex items-center justify-center mb-3">
              <Bell size={22} />
            </div>
            <h3 className="text-sm font-bold text-[#F0F6FC] mb-1">No alerts yet</h3>
            <p className="text-xs text-[#8B949E] max-w-xs mx-auto leading-relaxed">
              Updates regarding your reports and municipal notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Today Group */}
            {groupedAlerts.today.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[#8B949E] mb-2 px-1">
                  Today
                </h2>
                <div className="grid grid-cols-1 gap-2.5">
                  {groupedAlerts.today.map(renderAlertCard)}
                </div>
              </section>
            )}

            {/* Yesterday Group */}
            {groupedAlerts.yesterday.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[#8B949E] mb-2 px-1">
                  Yesterday
                </h2>
                <div className="grid grid-cols-1 gap-2.5">
                  {groupedAlerts.yesterday.map(renderAlertCard)}
                </div>
              </section>
            )}

            {/* Earlier Group */}
            {groupedAlerts.earlier.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[#8B949E] mb-2 px-1">
                  Earlier
                </h2>
                <div className="grid grid-cols-1 gap-2.5">
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
