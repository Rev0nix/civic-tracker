import { useState, useMemo } from 'react';
import {
  MapPin,
  Search,
  ThumbsUp,
  Share2,
  Map as MapIcon,
  List,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Download,
} from 'lucide-react';
import {
  CATEGORIES,
  STATUS_CONFIG,
  formatIssueId,
  getCategoryName,
  getRelativeTime,
  getCategoryIllustration,
} from '../constants/theme';
import CivicMap from './CivicMap';
import { extractLocality } from '../googleMaps';

export default function FeedScreen({
  issues = [],
  addresses = {},
  userLocation,
  onRefreshLocation,
  onSelectIssue,
  onUpvote,
  upvotedIssueIds = [],
  onShareIssue,
  isAdmin = false,
  onExportCSV,
  onExitAdmin,
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // Summary Metrics
  const totalCount = issues.length;
  const openCount = issues.filter((i) => i.status === 'Submitted' || i.status === 'Open').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

  // Filter issues based on category, status, and search query
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Category filter
      if (activeCategory !== 'all' && String(issue.category_id) !== String(activeCategory)) {
        return false;
      }

      // Status filter
      if (activeStatus !== 'All') {
        const isResolved = issue.status === 'Resolved';
        if (activeStatus === 'Resolved' && !isResolved) return false;
        if (activeStatus === 'In Progress' && issue.status !== 'In Progress') return false;
        if (activeStatus === 'Open' && (issue.status !== 'Open' && issue.status !== 'Submitted')) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = issue.title?.toLowerCase().includes(q);
        const descMatch = issue.description?.toLowerCase().includes(q);
        const addressMatch = addresses[issue.id]?.toLowerCase().includes(q);
        const idMatch = formatIssueId(issue.id).toLowerCase().includes(q);
        const phoneMatch = issue.user_phone?.toLowerCase().includes(q);
        const emailMatch = issue.user_email?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !addressMatch && !idMatch && !phoneMatch && !emailMatch) {
          return false;
        }
      }

      return true;
    });
  }, [issues, activeCategory, activeStatus, searchQuery, addresses]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0D1117] text-[#E6EDF3] overflow-hidden font-sans">
      {/* Pinned Top Navigation & Filters */}
      <header className="shrink-0 w-full px-3.5 pt-3 pb-2.5 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#30363D] space-y-2.5 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
              Community Feed
            </h1>
            <p className="text-[11px] text-slate-400 font-normal">
              Reports and updates near your neighborhood
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Small Sleek View Mode Switch */}
            <div className="inline-flex items-center bg-[#161B22] border border-[#30363D] p-0.5 rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-teal-500/20 text-teal-300 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="List View"
              >
                <List size={12} />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition ${
                  viewMode === 'map'
                    ? 'bg-teal-500/20 text-teal-300 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Map View"
              >
                <MapIcon size={12} />
                <span>Map</span>
              </button>
            </div>

            {/* Compact Search Trigger */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-1.5 rounded-lg border transition ${
                showSearch || searchQuery
                  ? 'bg-teal-500/20 border-teal-500/60 text-teal-300'
                  : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Toggle search"
            >
              <Search size={14} />
            </button>
          </div>
        </div>

        {/* Official Ward Officer Banner (if Admin) */}
        {isAdmin && (
          <div className="bg-teal-950/40 border border-teal-700/50 rounded-xl p-2.5 px-3 flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-teal-800/40 text-teal-300 flex items-center justify-center shrink-0">
                <ShieldCheck size={14} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wide block">
                    Ward Officer View
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  Tap any report card to manage status & dispatch SMS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onExportCSV && (
                <button
                  onClick={onExportCSV}
                  className="flex items-center gap-1 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] text-teal-300 text-[11px] font-medium px-2 py-0.5 rounded-lg transition"
                >
                  <Download size={11} />
                  <span>CSV</span>
                </button>
              )}
              {onExitAdmin && (
                <button
                  onClick={onExitAdmin}
                  className="text-[11px] text-rose-400 hover:underline px-1 py-0.5"
                >
                  Exit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Small Metrics Counter */}
        <div className="grid grid-cols-4 gap-1.5 bg-[#161B22] border border-[#30363D] p-1.5 rounded-xl text-center">
          <div>
            <span className="text-[9px] uppercase text-slate-400 block font-medium">TOTAL</span>
            <span className="text-xs font-bold text-white">{totalCount}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-slate-400 block font-medium">OPEN</span>
            <span className="text-xs font-bold text-rose-400">{openCount}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-slate-400 block font-medium">ACTIVE</span>
            <span className="text-xs font-bold text-amber-400">{inProgressCount}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-slate-400 block font-medium">FIXED</span>
            <span className="text-xs font-bold text-emerald-400">{resolvedCount}</span>
          </div>
        </div>

        {/* Expandable Search Input */}
        {showSearch && (
          <div className="relative animate-in fade-in duration-150">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search reports by title or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] text-white placeholder-slate-500 text-xs pl-8 pr-8 py-1.5 rounded-lg focus:outline-none focus:border-teal-400 font-normal"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Small Category Pill Selector */}
        <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 py-0.5">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap border ${
                  isSelected
                    ? 'bg-teal-500/20 border-teal-500/60 text-teal-300 font-semibold'
                    : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Small Status Switch Buttons */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="inline-flex items-center gap-1 p-0.5 bg-[#161B22] border border-[#30363D] rounded-lg">
            {['All', 'Open', 'In Progress', 'Resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setActiveStatus(st)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                  activeStatus === st
                    ? 'bg-[#21262D] text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 font-normal">
            {filteredIssues.length} {filteredIssues.length === 1 ? 'report' : 'reports'}
          </span>
        </div>
      </header>

      {/* Scrollable Issue List or Map Container */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain px-3.5 py-3 pb-24 no-scrollbar">
        {viewMode === 'map' ? (
          <div className="h-full min-h-[450px] rounded-xl overflow-hidden border border-[#30363D]">
            <CivicMap
              latitude={userLocation?.lat}
              longitude={userLocation?.lng}
              issues={filteredIssues}
              addresses={addresses}
              onSelectIssue={onSelectIssue}
              onRefreshLocation={onRefreshLocation}
              height="h-full"
            />
          </div>
        ) : (
          <div>
            {filteredIssues.length === 0 ? (
              <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-10 text-center max-w-sm mx-auto my-8">
                <div className="w-12 h-12 rounded-xl bg-[#21262D] text-teal-400 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">No reports found</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  No issues match the selected category or status filter in this locality.
                </p>
                <button
                  onClick={() => {
                    setActiveCategory('all');
                    setActiveStatus('All');
                    setSearchQuery('');
                  }}
                  className="bg-[#21262D] hover:bg-[#30363D] text-teal-300 border border-[#30363D] text-xs font-medium px-3.5 py-1.5 rounded-lg transition"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              /* Single Column Clean Human Feed of Report Cards */
              <div className="flex flex-col gap-3">
                {filteredIssues.map((issue) => {
                  const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.Open;
                  const formattedId = formatIssueId(issue.id);
                  const categoryLabel = getCategoryName(issue.category_id);
                  const relativeTime = getRelativeTime(issue.created_at);
                  const imageSrc = issue.photo_url || getCategoryIllustration(issue.category_id);
                  const isUpvoted = upvotedIssueIds.includes(issue.id);
                  const localityName = addresses[issue.id]
                    ? extractLocality(addresses[issue.id])
                    : extractLocality(null, issue.latitude, issue.longitude);

                  return (
                    <article
                      key={issue.id}
                      onClick={() => onSelectIssue(issue)}
                      className="bg-[#161B22] hover:bg-[#1C2128] border border-[#30363D] hover:border-slate-600 rounded-2xl overflow-hidden transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md group flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Image Thumbnail */}
                        <div className="relative w-full h-48 bg-[#0D1117] overflow-hidden">
                          <img
                            src={imageSrc}
                            alt={issue.title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#161B22] via-transparent to-black/20" />

                          {/* Friendly Status Badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md border shadow-sm"
                              style={{
                                color: statusCfg.color,
                                backgroundColor: `${statusCfg.bg}EE`,
                                borderColor: statusCfg.border,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: statusCfg.dot }}
                              />
                              {statusCfg.label}
                            </span>

                            {issue.priority && (
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border backdrop-blur-md ${
                                  issue.priority === 'High'
                                    ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                                    : issue.priority === 'Medium'
                                    ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                                    : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                                }`}
                              >
                                {issue.priority}
                              </span>
                            )}
                          </div>

                          {/* Locality Pill */}
                          <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center gap-1 bg-[#0D1117]/85 backdrop-blur-md text-slate-200 text-[11px] px-2.5 py-1 rounded-full border border-[#30363D]">
                              <MapPin size={11} className="text-teal-400" />
                              <span className="truncate max-w-[130px] font-medium">{localityName}</span>
                            </span>
                          </div>

                          {/* Officer Management Banner Tag (if Admin) */}
                          {isAdmin && (
                            <div className="absolute bottom-2.5 left-3 right-3">
                              <div className="bg-teal-950/90 backdrop-blur-md border border-teal-700/60 text-teal-300 text-[11px] px-2.5 py-1.5 rounded-lg flex items-center justify-between shadow-md">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <ShieldCheck size={13} />
                                  <span>Tap card to manage report</span>
                                </span>
                                <span className="text-[10px] text-slate-300">
                                  Officer Control
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="p-4">
                          {/* Metadata */}
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                            <span className="text-teal-400 font-semibold font-mono text-[11px]">{formattedId}</span>
                            <span>·</span>
                            <span className="text-slate-300 font-medium">{categoryLabel}</span>
                            <span>·</span>
                            <span>{relativeTime}</span>
                          </div>

                          {/* Title */}
                          <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors leading-snug mb-1.5">
                            {issue.title}
                          </h3>

                          {/* Description */}
                          {issue.description && (
                            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2 font-normal">
                              {issue.description}
                            </p>
                          )}

                          {/* Citizen info snippet for officer */}
                          {isAdmin && issue.user_email && (
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-[#30363D]">
                              <span className="truncate max-w-[200px]">By: {issue.user_email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Bar */}
                      <div
                        className="px-4 py-2.5 border-t border-[#30363D] flex items-center justify-between bg-[#161B22]/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Upvote Button */}
                        <button
                          onClick={() => onUpvote(issue.id, issue.upvotes)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition active:scale-95 border ${
                            isUpvoted
                              ? 'bg-teal-500/20 border-teal-500/60 text-teal-300 font-semibold'
                              : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-white hover:border-slate-500'
                          }`}
                        >
                          <ThumbsUp size={13} className={isUpvoted ? 'fill-current' : ''} />
                          <span>{issue.upvotes || 0}</span>
                        </button>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onShareIssue(issue)}
                            className="p-1.5 rounded-full bg-[#21262D] border border-[#30363D] text-slate-400 hover:text-teal-300 transition active:scale-95"
                            title="Share Report"
                          >
                            <Share2 size={13} />
                          </button>

                          <button
                            onClick={() => onSelectIssue(issue)}
                            className="flex items-center gap-1 text-xs font-medium text-teal-400 hover:underline px-1.5 py-0.5"
                          >
                            <span>{isAdmin ? 'Manage' : 'View Details'}</span>
                            <ArrowUpRight size={13} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
