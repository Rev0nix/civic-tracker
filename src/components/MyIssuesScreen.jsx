import { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  MapPin,
  ChevronRight,
  MessageSquare,
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
      return 'Marked fixed by municipal ward team. Please verify on site.';
    }
    if (issue.status === 'In Progress') {
      return 'Maintenance contractor assigned and field work is underway.';
    }
    if (issue.priority === 'Critical') {
      return 'Accelerated inspection pending due to high safety priority.';
    }
    return 'Submitted to local ward jurisdiction for technical review.';
  };

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain bg-[#080F0F] text-[#F0F4F4] pb-24 pt-3 px-3 no-scrollbar">
      {/* Mobile Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-black tracking-tight text-[#F0F4F4] font-mono">
            My Issues
          </h1>
          <span className="text-[11px] font-mono bg-[#192223] border border-[#253538] px-2.5 py-1 rounded-full text-[#A3DCE3]">
            {myIssues.length} reports
          </span>
        </div>
        <p className="text-xs text-[#758588]">
          Track status and municipal resolutions for your submissions
        </p>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#354144] pb-3 overflow-x-auto no-scrollbar">
        {['All', 'Open', 'In Progress', 'Resolved'].map((tab) => {
          const isSelected = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-[#315C60] text-[#A3DCE3] font-semibold border border-[#A3DCE3]'
                  : 'text-[#758588] hover:text-[#A5B1B3] bg-transparent'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredList.length === 0 ? (
        <div className="bg-[#192223] border border-[#354144] rounded-3xl p-12 text-center my-6 flex flex-col items-center max-w-lg mx-auto">
          {/* Decorative Teal Shape */}
          <div className="w-16 h-16 rounded-3xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center mb-5 shadow-lg shadow-[#132B2F]/50">
            <ClipboardList size={30} strokeWidth={2.2} />
          </div>

          <h3 className="text-xl font-bold text-[#F0F4F4] mb-2 font-mono">No reports yet.</h3>
          <p className="text-xs text-[#758588] max-w-xs mx-auto mb-6 leading-relaxed">
            Issues you post will appear here with their status, authority updates, and milestone tracking.
          </p>

          <button
            onClick={onOpenReport}
            className="flex items-center gap-2 bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] font-bold text-xs px-6 py-3 rounded-2xl shadow-lg transition active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Report your first issue</span>
          </button>
        </div>
      ) : (
        /* Multi-column grid on desktop website */
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
                className="bg-[#192223] hover:bg-[#202B2D] border border-[#354144] hover:border-[#28616A] rounded-3xl p-5 transition-all duration-200 cursor-pointer shadow-md group flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-4 items-start">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-2xl bg-[#101819] overflow-hidden shrink-0 border border-[#354144] relative">
                      <img
                        src={imageSrc}
                        alt={issue.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold text-[#A3DCE3]">
                          {formattedId}
                        </span>
                        <span
                          className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border"
                          style={{
                            color: statusCfg.color,
                            backgroundColor: statusCfg.bg,
                            borderColor: statusCfg.border,
                          }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#F0F4F4] group-hover:text-[#A3DCE3] transition-colors leading-snug truncate">
                        {issue.title}
                      </h3>

                      <div className="flex items-center gap-2 text-xs font-mono text-[#758588] mt-1.5 flex-wrap">
                        <span>{categoryLabel}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-[#A3DCE3]" />
                          <span className="truncate max-w-[120px]">{localityName}</span>
                        </span>
                        <span>·</span>
                        <span>{relativeTime}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Latest Authority Update Bar */}
                <div className="mt-4 pt-3 border-t border-[#354144]/60 flex items-start gap-2 bg-[#101819]/50 rounded-2xl p-3 border border-[#354144]/40">
                  <div className="w-5 h-5 rounded-full bg-[#132B2F] text-[#A3DCE3] flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={11} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A3DCE3] block">
                      Authority Update
                    </span>
                    <p className="text-xs text-[#A5B1B3] mt-0.5 leading-relaxed line-clamp-2">
                      {authorityUpdate}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-[#758588] group-hover:text-[#A3DCE3] shrink-0 mt-1" />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
