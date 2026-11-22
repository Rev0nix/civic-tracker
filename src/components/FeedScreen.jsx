import { useState, useMemo } from 'react';
import {
  MapPin,
  Search,
  ThumbsUp,
  Share2,
  Plus,
  Map as MapIcon,
  List,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
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
  currentLocality = 'Near Ward Office',
  userLocation,
  onRefreshLocation,
  onSelectIssue,
  onOpenReport,
  onUpvote,
  upvotedIssueIds = [],
  onShareIssue,
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // Summary Metrics for the Website
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
        if (!titleMatch && !descMatch && !addressMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });
  }, [issues, activeCategory, activeStatus, searchQuery, addresses]);

  return (
    <div className="min-h-screen bg-[#080F0F] text-[#F0F4F4] pb-28 pt-6 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
      {/* Top Website Header & Hero Banner */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#758588]">
                YOUR AREA
              </span>
              <span className="w-2 h-2 rounded-full bg-[#A3DCE3] animate-pulse" />
              <span className="text-xs font-mono text-[#A3DCE3] bg-[#132B2F] border border-[#28616A] px-2.5 py-0.5 rounded-full">
                Active Ward jurisdiction
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F0F4F4] font-mono">
              Issues near you
            </h1>
            <p className="text-xs sm:text-sm text-[#A5B1B3] mt-1 font-sans">
              Live spatial civic feed covering reported potholes, streetlights, drainage, and sanitation.
            </p>
          </div>

          {/* Quick Locality & Controls Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onRefreshLocation}
              className="flex items-center gap-2 bg-[#192223] border border-[#354144] hover:border-[#A3DCE3] px-4 py-2 rounded-2xl text-xs font-mono text-[#A3DCE3] transition active:scale-95 shadow-sm"
              title="Refresh GPS Location"
            >
              <MapPin size={14} className="text-[#A3DCE3]" />
              <span className="max-w-[160px] truncate">{currentLocality}</span>
              <RefreshCw size={12} className="text-[#758588] hover:text-[#A3DCE3]" />
            </button>

            {/* List / Map Switcher */}
            <div className="flex items-center bg-[#192223] border border-[#354144] p-1 rounded-2xl">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
                  viewMode === 'list'
                    ? 'bg-[#315C60] text-[#A3DCE3] border border-[#A3DCE3]'
                    : 'text-[#758588] hover:text-[#F0F4F4]'
                }`}
              >
                <List size={14} />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
                  viewMode === 'map'
                    ? 'bg-[#315C60] text-[#A3DCE3] border border-[#A3DCE3]'
                    : 'text-[#758588] hover:text-[#F0F4F4]'
                }`}
              >
                <MapIcon size={14} />
                <span>Map</span>
              </button>
            </div>

            {/* Search Trigger */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2.5 rounded-2xl border transition active:scale-95 ${
                showSearch || searchQuery
                  ? 'bg-[#315C60] border-[#A3DCE3] text-[#A3DCE3]'
                  : 'bg-[#192223] border-[#354144] text-[#A5B1B3] hover:text-[#F0F4F4]'
              }`}
              aria-label="Toggle search"
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* Website Overview Metrics Cards (Visible on desktop & tablets) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-[#192223] border border-[#354144] rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#758588] block">
              TOTAL REPORTS
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#F0F4F4] font-mono mt-1 block">
              {totalCount}
            </span>
          </div>

          <div className="bg-[#192223] border border-[#354144] rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A5B1B3] block">
              OPEN / SUBMITTED
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#A5B1B3] font-mono mt-1 block">
              {openCount}
            </span>
          </div>

          <div className="bg-[#192223] border border-[#354144] rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#38BDF8] block">
              IN PROGRESS
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#38BDF8] font-mono mt-1 block">
              {inProgressCount}
            </span>
          </div>

          <div className="bg-[#192223] border border-[#354144] rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#43C88A] block">
              RESOLVED ISSUES
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#43C88A] font-mono mt-1 block">
              {resolvedCount}
            </span>
          </div>
        </div>

        {/* Collapsible Search Input */}
        {showSearch && (
          <div className="mb-6 relative animate-in fade-in slide-in-from-top-2 duration-200">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
            <input
              type="text"
              placeholder="Search reports across titles, street locations, descriptions, or LK-ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#192223] border border-[#354144] text-[#F0F4F4] placeholder-[#758588] text-sm pl-10 pr-10 py-3 rounded-2xl focus:outline-none focus:border-[#A3DCE3] transition font-medium"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#758588] hover:text-[#F0F4F4]"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="overflow-x-auto no-scrollbar flex items-center gap-2 pb-2">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-mono font-medium transition-all whitespace-nowrap border select-none ${
                  isSelected
                    ? 'bg-[#315C60] border-[#A3DCE3] text-[#A3DCE3] shadow-md shadow-[#315C60]/30 font-semibold'
                    : 'bg-[#192223] border-[#354144] text-[#A5B1B3] hover:text-[#F0F4F4] hover:border-[#758588]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Status Filter Sub-Bar */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#354144]">
        <div className="flex items-center gap-2">
          {['All', 'Open', 'In Progress', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setActiveStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
                activeStatus === st
                  ? 'text-[#F0F4F4] bg-[#202B2D] border border-[#354144]'
                  : 'text-[#758588] hover:text-[#A5B1B3]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-[#758588]">
          Showing {filteredIssues.length} report{filteredIssues.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Main Content: Map View OR List Feed */}
      {viewMode === 'map' ? (
        <div className="mb-8">
          <CivicMap
            latitude={userLocation?.lat}
            longitude={userLocation?.lng}
            issues={filteredIssues}
            addresses={addresses}
            onSelectIssue={onSelectIssue}
            height="h-[580px]"
          />
        </div>
      ) : (
        <div>
          {filteredIssues.length === 0 ? (
            <div className="bg-[#192223] border border-[#354144] rounded-3xl p-12 text-center max-w-xl mx-auto my-8">
              <div className="w-14 h-14 rounded-2xl bg-[#202B2D] border border-[#354144] text-[#A3DCE3] flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#F0F4F4] mb-1">No reports matching filters</h3>
              <p className="text-xs text-[#758588] max-w-xs mx-auto mb-6 leading-relaxed">
                There are no municipal reports matching the current category or status filter in this locality.
              </p>
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setActiveStatus('All');
                  setSearchQuery('');
                }}
                className="bg-[#202B2D] hover:bg-[#28616A] text-[#A3DCE3] border border-[#354144] text-xs font-mono font-semibold px-4 py-2 rounded-xl transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* Multi-Column Responsive Grid on Desktop Website */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    className="bg-[#192223] hover:bg-[#202B2D] border border-[#354144] hover:border-[#28616A] rounded-3xl overflow-hidden transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl group flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Media Preview */}
                      <div className="relative w-full h-52 bg-[#101819] overflow-hidden">
                        <img
                          src={imageSrc}
                          alt={issue.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#192223] via-transparent to-black/30" />

                        {/* Status Badge Over Image */}
                        <div className="absolute top-4 left-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold backdrop-blur-md border shadow-md"
                            style={{
                              color: statusCfg.color,
                              backgroundColor: `${statusCfg.bg}EE`,
                              borderColor: statusCfg.border,
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: statusCfg.dot }}
                            />
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Locality Chip */}
                        <div className="absolute top-4 right-4">
                          <span className="inline-flex items-center gap-1 bg-[#080F0F]/80 backdrop-blur-md text-[#F0F4F4] text-[11px] font-mono px-2.5 py-1 rounded-full border border-[#354144]">
                            <MapPin size={11} className="text-[#A3DCE3]" />
                            <span className="truncate max-w-[130px]">{localityName}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5">
                        {/* Technical Meta Line */}
                        <div className="flex items-center gap-2 text-xs font-mono text-[#758588] mb-2">
                          <span className="text-[#A3DCE3] font-bold">{formattedId}</span>
                          <span>·</span>
                          <span className="text-[#A5B1B3]">{categoryLabel}</span>
                          <span>·</span>
                          <span>{relativeTime}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-[#F0F4F4] group-hover:text-[#A3DCE3] transition-colors leading-snug mb-2">
                          {issue.title}
                        </h3>

                        {/* Brief description preview */}
                        {issue.description && (
                          <p className="text-xs text-[#A5B1B3] line-clamp-2 leading-relaxed mb-4">
                            {issue.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar of Card */}
                    <div
                      className="p-5 pt-3 border-t border-[#354144]/60 flex items-center justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Upvote Button */}
                      <button
                        onClick={() => onUpvote(issue.id, issue.upvotes)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold transition active:scale-95 border ${
                          isUpvoted
                            ? 'bg-[#315C60] border-[#A3DCE3] text-[#A3DCE3]'
                            : 'bg-[#202B2D] border-[#354144] text-[#A5B1B3] hover:text-[#F0F4F4] hover:border-[#758588]'
                        }`}
                      >
                        <ThumbsUp size={13} className={isUpvoted ? 'fill-current' : ''} />
                        <span>{issue.upvotes || 0}</span>
                      </button>

                      {/* Share Button & Details indicator */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onShareIssue(issue)}
                          className="p-2 rounded-full bg-[#202B2D] border border-[#354144] text-[#A5B1B3] hover:text-[#A3DCE3] transition active:scale-95"
                          title="Share Issue"
                        >
                          <Share2 size={14} />
                        </button>

                        <button
                          onClick={() => onSelectIssue(issue)}
                          className="flex items-center gap-1 text-xs font-mono font-medium text-[#A3DCE3] hover:underline px-2 py-1"
                        >
                          <span>Timeline</span>
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

      {/* Floating Action Button (+ Report issue for mobile) */}
      <div className="fixed bottom-20 right-5 z-30 md:hidden">
        <button
          onClick={onOpenReport}
          className="flex items-center gap-2 bg-[#A3DCE3] hover:bg-[#88CDD5] text-[#080F0F] px-5 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-[#A3DCE3]/20 transition-all duration-200 active:scale-95 border border-[#A3DCE3]"
          aria-label="Report new issue"
        >
          <Plus size={18} strokeWidth={2.6} />
          <span className="tracking-tight">Report issue</span>
        </button>
      </div>
    </div>
  );
}
