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
  onSelectIssue,
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
    <div className="h-full w-full flex flex-col bg-[#080F0F] text-[#F0F4F4] overflow-hidden">
      {/* Pinned Mobile Top Tab Section (Stays fixed at top, never scrolls away!) */}
      <header className="shrink-0 w-full px-3 pt-2.5 pb-2 bg-[#080F0F] border-b border-[#253538] space-y-2.5 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black tracking-tight text-[#F0F4F4] font-mono leading-none">
              Lokify Feed
            </h1>
            <p className="text-[10px] font-mono text-[#758588] mt-0.5">
              Ward defects & municipal infrastructure
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#192223] border border-[#253538] p-0.5 rounded-xl">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                  viewMode === 'list'
                    ? 'bg-[#315C60] text-[#A3DCE3]'
                    : 'text-[#758588]'
                }`}
              >
                <List size={13} />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                  viewMode === 'map'
                    ? 'bg-[#315C60] text-[#A3DCE3]'
                    : 'text-[#758588]'
                }`}
              >
                <MapIcon size={13} />
                <span>Map</span>
              </button>
            </div>

            {/* Search Trigger */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-1.5 rounded-xl border transition ${
                showSearch || searchQuery
                  ? 'bg-[#315C60] border-[#A3DCE3] text-[#A3DCE3]'
                  : 'bg-[#192223] border-[#253538] text-[#758588]'
              }`}
              aria-label="Toggle search"
            >
              <Search size={14} />
            </button>
          </div>
        </div>

        {/* Compact Mobile Metrics Pills */}
        <div className="grid grid-cols-4 gap-1.5 bg-[#101819] border border-[#253538] p-1.5 rounded-2xl text-center">
          <div>
            <span className="text-[8px] font-mono uppercase text-[#758588] block">TOTAL</span>
            <span className="text-sm font-bold font-mono text-[#F0F4F4]">{totalCount}</span>
          </div>
          <div>
            <span className="text-[8px] font-mono uppercase text-[#A5B1B3] block">OPEN</span>
            <span className="text-sm font-bold font-mono text-[#A5B1B3]">{openCount}</span>
          </div>
          <div>
            <span className="text-[8px] font-mono uppercase text-[#38BDF8] block">ACTIVE</span>
            <span className="text-sm font-bold font-mono text-[#38BDF8]">{inProgressCount}</span>
          </div>
          <div>
            <span className="text-[8px] font-mono uppercase text-[#43C88A] block">FIXED</span>
            <span className="text-sm font-bold font-mono text-[#43C88A]">{resolvedCount}</span>
          </div>
        </div>

        {/* Search Input */}
        {showSearch && (
          <div className="relative animate-in fade-in duration-150">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#758588]" />
            <input
              type="text"
              placeholder="Search reports or LK-ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#192223] border border-[#253538] text-[#F0F4F4] placeholder-[#758588] text-xs pl-8 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-[#A3DCE3] font-mono"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#758588]"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Category Filter Horizontal Scroll */}
        <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 py-0.5">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-[11px] font-mono transition-all whitespace-nowrap border select-none ${
                  isSelected
                    ? 'bg-[#315C60] border-[#A3DCE3] text-[#A3DCE3] font-bold'
                    : 'bg-[#192223] border-[#253538] text-[#758588]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Status Filter Sub-Bar */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            {['All', 'Open', 'In Progress', 'Resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setActiveStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition ${
                  activeStatus === st
                    ? 'text-[#F0F4F4] bg-[#202B2D] border border-[#354144]'
                    : 'text-[#758588] hover:text-[#A5B1B3]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono text-[#758588]">
            {filteredIssues.length} issue{filteredIssues.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      {/* Scrollable Issue List or Map Container */}
      <div className="flex-1 w-full overflow-y-auto overscroll-contain px-3 py-3 pb-24 no-scrollbar">
        {/* Main Content: Map View OR List Feed */}
        {viewMode === 'map' ? (
          <div className="h-full min-h-[450px]">
            <CivicMap
              latitude={userLocation?.lat}
              longitude={userLocation?.lng}
              issues={filteredIssues}
              addresses={addresses}
              onSelectIssue={onSelectIssue}
              height="h-full"
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
            /* Single Column Pure Mobile Feed */
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
      </div>
    </div>
  );
}
