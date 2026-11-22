import { useState } from 'react';
import {
  X,
  ShieldCheck,
  Download,
  Trash2,
  Search,
  LogOut,
  Phone,
} from 'lucide-react';
import { formatIssueId, getCategoryName, getRelativeTime } from '../constants/theme';
import { sendSmsNotification } from '../utils/smsService';

export default function AdminModal({
  isOpen,
  onClose,
  isAdmin,
  onAuthenticate,
  onExitAdmin,
  issues = [],
  onUpdateStatus,
  onDeleteIssue,
  onExportCSV,
  onSelectIssue,
}) {
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  if (!isOpen) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === 'admin123') {
      onAuthenticate(true);
      setPasscode('');
      setAuthError('');
    } else {
      setAuthError('Invalid passcode. Default passcode is admin123');
    }
  };

  const handleStatusChangeWithSms = (issue, newStatus) => {
    onUpdateStatus(issue, newStatus);

    // Dispatch SMS notification to citizen
    const targetPhone = issue.user_phone || '+91 98451 23456';
    sendSmsNotification({
      toPhone: targetPhone,
      issueId: String(issue.id),
      message: `Lokify Alert: Issue #${formatIssueId(issue.id)} ("${issue.title}") was updated to "${newStatus}" by Ward Officer.`,
      eventType: 'STATUS_UPDATE',
    });
  };

  const filteredIssues = issues.filter((issue) => {
    if (categoryFilter !== 'all' && String(issue.category_id) !== String(categoryFilter)) {
      return false;
    }
    if (statusFilter !== 'all' && issue.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = issue.title?.toLowerCase().includes(q);
      const matchId = formatIssueId(issue.id).toLowerCase().includes(q);
      const matchEmail = issue.user_email?.toLowerCase().includes(q);
      const matchPhone = issue.user_phone?.toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  const total = issues.length;
  const openCount = issues.filter((i) => i.status === 'Submitted' || i.status === 'Open').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

  return (
    <div className="fixed inset-0 z-50 bg-[#080F0F]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-[#101819] border border-[#354144] rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative p-5 sm:p-7 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#354144] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#132B2F] border border-[#28616A] text-[#A3DCE3] flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#758588] block">
                MUNICIPAL AUTHORITY
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#F0F4F4] tracking-tight">
                Admin Control Center
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={onExportCSV}
                className="flex items-center gap-1.5 bg-[#192223] hover:bg-[#202B2D] border border-[#354144] hover:border-[#A3DCE3] text-[#A3DCE3] text-xs font-mono font-semibold px-3.5 py-2 rounded-xl transition active:scale-95"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#192223] border border-[#354144] text-[#A5B1B3] hover:text-[#F0F4F4] transition active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!isAdmin ? (
          /* Authentication Screen */
          <div className="py-12 px-4 max-w-sm mx-auto text-center">
            <div className="w-14 h-14 rounded-3xl bg-[#192223] border border-[#354144] text-[#A3DCE3] flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={26} />
            </div>
            <h3 className="text-lg font-bold text-[#F0F4F4] mb-1">
              Official Verification
            </h3>
            <p className="text-xs text-[#758588] font-mono mb-6 leading-relaxed">
              Enter municipal authority passcode to manage issues, change status, and trigger citizen SMS dispatch.
            </p>

            {authError && (
              <div className="mb-4 p-3 bg-[#321616] border border-[#5C2424] text-[#EF6666] text-xs font-mono rounded-xl">
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                placeholder="Enter Passcode (admin123)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-[#192223] border border-[#354144] focus:border-[#A3DCE3] text-[#F0F4F4] placeholder-[#758588] text-sm text-center px-4 py-3 rounded-xl focus:outline-none font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] font-bold text-xs py-3.5 rounded-xl shadow-lg transition active:scale-95"
              >
                Authenticate Session
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Management */
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#192223] border border-[#354144] p-4 rounded-2xl text-center">
                <span className="text-[10px] font-mono font-bold uppercase text-[#758588] block">
                  Total
                </span>
                <span className="text-2xl font-black text-[#F0F4F4] mt-1 block">
                  {total}
                </span>
              </div>
              <div className="bg-[#192223] border border-[#354144] p-4 rounded-2xl text-center">
                <span className="text-[10px] font-mono font-bold uppercase text-[#A5B1B3] block">
                  Open
                </span>
                <span className="text-2xl font-black text-[#A5B1B3] mt-1 block">
                  {openCount}
                </span>
              </div>
              <div className="bg-[#192223] border border-[#354144] p-4 rounded-2xl text-center">
                <span className="text-[10px] font-mono font-bold uppercase text-[#38BDF8] block">
                  In Progress
                </span>
                <span className="text-2xl font-black text-[#38BDF8] mt-1 block">
                  {inProgressCount}
                </span>
              </div>
              <div className="bg-[#192223] border border-[#354144] p-4 rounded-2xl text-center">
                <span className="text-[10px] font-mono font-bold uppercase text-[#43C88A] block">
                  Resolved
                </span>
                <span className="text-2xl font-black text-[#43C88A] mt-1 block">
                  {resolvedCount}
                </span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758588]" />
                <input
                  type="text"
                  placeholder="Filter by title, LK-ID, citizen email or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#192223] border border-[#354144] text-xs text-[#F0F4F4] placeholder-[#758588] pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-[#A3DCE3]"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#192223] border border-[#354144] text-xs font-mono text-[#F0F4F4] px-3 py-2 rounded-xl focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="1">Pothole</option>
                <option value="2">Streetlight</option>
                <option value="3">Garbage</option>
                <option value="4">Water & Sewage</option>
                <option value="5">Drainage</option>
                <option value="6">Road Damage</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#192223] border border-[#354144] text-xs font-mono text-[#F0F4F4] px-3 py-2 rounded-xl focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Submitted">Submitted / Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            {/* Issues List */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-[#758588]">
                  No reports matching query.
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-[#192223] border border-[#354144] hover:border-[#28616A] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition"
                  >
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectIssue(issue)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold text-[#A3DCE3]">
                          {formatIssueId(issue.id)}
                        </span>
                        <span className="text-xs text-[#758588]">·</span>
                        <span className="text-xs text-[#A5B1B3]">
                          {getCategoryName(issue.category_id)}
                        </span>
                        <span className="text-xs text-[#758588]">·</span>
                        <span className="text-xs font-mono text-[#758588]">
                          {getRelativeTime(issue.created_at)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#F0F4F4] truncate">
                        {issue.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-[#758588] mt-1">
                        {issue.user_email && <span>Citizen: {issue.user_email}</span>}
                        {issue.user_phone && (
                          <span className="flex items-center gap-1 text-[#A3DCE3]">
                            <Phone size={10} />
                            <span>{issue.user_phone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-[#354144]">
                      <select
                        value={issue.status}
                        onChange={(e) => handleStatusChangeWithSms(issue, e.target.value)}
                        className="bg-[#101819] border border-[#354144] text-xs font-mono font-semibold text-[#A3DCE3] px-3 py-1.5 rounded-xl focus:outline-none"
                      >
                        <option value="Submitted">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>

                      <button
                        onClick={() => onDeleteIssue(issue.id)}
                        className="p-2 rounded-xl bg-[#202B2D] hover:bg-[#321616] text-[#EF6666] border border-[#354144] hover:border-[#5C2424] transition"
                        title="Delete Issue"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Exit Admin Button */}
            <div className="pt-3 border-t border-[#354144] flex justify-between items-center">
              <span className="text-xs font-mono text-[#43C88A] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#43C88A] inline-block animate-pulse" />
                Live Admin Mode · SMS Gateway Active
              </span>

              <button
                onClick={onExitAdmin}
                className="flex items-center gap-1 text-xs font-mono text-[#758588] hover:text-[#EF6666] transition"
              >
                <LogOut size={13} />
                <span>Exit Admin Mode</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
