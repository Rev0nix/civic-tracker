import { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  MapPin,
  ChevronRight,
  MessageSquare,
  Clock,
} from 'lucide-react';
import {
  STATUS_CONFIG,
  formatIssueId,
  getCategoryName,
  getRelativeTime,
  getCategoryIllustration,
} from '../constants/theme';
import { extractLocality } from '../googleMaps';

export default function MyIssuesScreen({
  issues = [],
  addresses = {},
  currentDeviceId,
  currentUserEmail,
  onSelectIssue,
  onOpenReport,
}) {
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'Open' | 'In Progress' | 'Resolved'

  // Filter issues belonging ONLY to this user (by device_id or user_email)
  const myIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchDevice = currentDeviceId && issue.device_id === currentDeviceId;
      const matchEmail = currentUserEmail && issue.user_email?.toLowerCase() === currentUserEmail.toLowerCase();
      return matchDevice || matchEmail;
    });
  }, [issues, currentDeviceId, currentUserEmail]);

  // Apply status filter
  const filteredList = useMemo(() => {
    return myIssues.filter((issue) => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Resolved') return issue.status === 'Resolved';
      if (activeFilter === 'In Progress') return issue.status === 'In Progress';
      if (activeFilter === 'Open') return issue.status === 'Open' || issue.status === 'Submitted';
      return true;
    });
  }, [myIssues, activeFilter]);

  // Synthesize authority note if not in database
  const getAuthorityNote = (issue) => {
    if (issue.status === 'Resolved') {
      return 'Fixed by municipal ward team. Please verify on site.';
    }
    if (issue.status === 'In Progress') {
      return 'Maintenance crew assigned. Field work is currently underway.';
    }
    if (issue.priority === 'Critical') {
      return 'High priority review pending with zonal engineer.';
    }
    return 'Submitted to local ward office for technical review.';
  };

  const filterTabs = ['All', 'Open', 'In Progress', 'Resolved'];

  return (
    <div className="h-full w-full flex flex-col bg-[#0D1117] text-[#F0F6FC] overflow-hidden">
      {/* Pinned Mobile Top Tab Header */}
      <header className="shrink-0 w-full px-4 pt-3.5 pb-2.5 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] space-y-2.5 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F0F6FC] leading-none">
              My Reports
            </h1>
            <p className="text-xs text-[#8B949E] mt-1">
              Track progress and official updates for your issues
            </p>
          </div>
          <span className="text-[11px] font-semibold bg-[#161B22] border border-[#30363D] px-2.5 py-0.5 rounded-full text-[#58A6FF]">
            {myIssues.length} {myIssues.length === 1 ? 'report' : 'reports'}
          </span>
        </div>

        {/* Small Sleek Segmented Toggle Switch Buttons */}
        <div className="inline-flex items-center bg-[#161B22] border border-[#30363D] p-0.5 rounded-lg max-w-full overflow-x-auto no-scrollbar">
          {filterTabs.map((tab) => {
            const isSelected = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-[#21262D] text-[#F0F6FC] shadow-sm font-semibold'
                    : 'text-[#8B949E] hover:text-[#C9D1D9]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </header>

      {/* Scrollable Issue List Container */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain px-3.5 py-3 pb-24 no-scrollbar">
        {filteredList.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-8 text-center my-6 flex flex-col items-center max-w-md mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#21262D] border border-[#30363D] text-[#58A6FF] flex items-center justify-center mb-4 shadow-sm">
              <ClipboardList size={26} strokeWidth={2} />
            </div>

            <h3 className="text-base font-bold text-[#F0F6FC] mb-1.5">No reports yet</h3>
            <p className="text-xs text-[#8B949E] max-w-xs mx-auto mb-5 leading-relaxed">
              When you report an issue, it will show up here along with live status updates and municipal actions.
            </p>

            <button
              onClick={onOpenReport}
              className="flex items-center gap-2 bg-[#1F6FEB] hover:bg-[#388BFD] text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Report an issue</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredList.map((issue) => {
              const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.Open;
              const formattedId = formatIssueId(issue.id);
              const categoryLabel = getCategoryName(issue.category_id);
              const relativeTime = getRelativeTime(issue.created_at);
              const imageSrc = issue.photo_url || getCategoryIllustration(issue.category_id);
              const authorityUpdate = getAuthorityNote(issue);
              const localityName = addresses[issue.id]
                ? extractLocality(addresses[issue.id])
                : extractLocality(null, issue.latitude, issue.longitude);

              return (
                <article
                  key={issue.id}
                  onClick={() => onSelectIssue(issue)}
                  className="bg-[#161B22] hover:bg-[#1C2128] border border-[#30363D] hover:border-[#444C56] rounded-2xl p-4 transition-all duration-150 cursor-pointer shadow-sm group flex flex-col justify-between"
                >
                  <div className="flex gap-3.5 items-start">
                    {/* Thumbnail Image */}
                    <div className="w-18 h-18 rounded-xl bg-[#0D1117] overflow-hidden shrink-0 border border-[#30363D] relative">
                      <img
                        src={imageSrc}
                        alt={issue.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-mono font-medium text-[#8B949E]">
                          {formattedId}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border"
                          style={{
                            color: statusCfg.color,
                            backgroundColor: statusCfg.bg,
                            borderColor: statusCfg.border,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: statusCfg.dot }}
                          />
                          {statusCfg.label}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-[#F0F6FC] group-hover:text-[#58A6FF] transition-colors leading-snug line-clamp-1">
                        {issue.title}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-[#8B949E] mt-1.5 flex-wrap">
                        <span className="font-medium text-[#C9D1D9]">{categoryLabel}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-[#58A6FF] shrink-0" />
                          <span className="truncate max-w-[120px]">{localityName}</span>
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock size={11} />
                          {relativeTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Authority Update Notification Strip */}
                  <div className="mt-3 pt-2.5 border-t border-[#30363D]/60 flex items-start gap-2 bg-[#0D1117]/60 rounded-xl p-2.5 border border-[#30363D]/40">
                    <div className="w-4 h-4 rounded-full bg-[#1F6FEB]/15 text-[#58A6FF] flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare size={10} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-[#58A6FF] block leading-none">
                        Ward Update
                      </span>
                      <p className="text-[11px] text-[#8B949E] mt-1 leading-relaxed line-clamp-2">
                        {authorityUpdate}
                      </p>
                    </div>
                    <ChevronRight size={13} className="text-[#8B949E] group-hover:text-[#F0F6FC] shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
