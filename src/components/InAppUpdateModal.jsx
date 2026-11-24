import { useState } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  Sparkles,
  X,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { downloadAndInstallApkInApp } from '../services/appUpdater';

export default function InAppUpdateModal({
  isOpen,
  onClose,
  updateInfo,
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !updateInfo) return null;

  const handleStartInAppUpdate = async () => {
    setDownloading(true);
    setDownloadProgress(10);
    setDownloadStatusText('Connecting to in-app update service...');
    setErrorMessage('');

    try {
      const result = await downloadAndInstallApkInApp(
        updateInfo,
        (progress, downloadedBytes, totalBytes) => {
          setDownloadProgress(progress);
          if (progress < 40) {
            setDownloadStatusText('Downloading APK package in-app...');
          } else if (progress < 90) {
            if (totalBytes > 0 && downloadedBytes > 0) {
              const dlMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
              const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
              setDownloadStatusText(`Receiving package: ${dlMb} MB / ${totalMb} MB...`);
            } else {
              setDownloadStatusText('Streaming update package in-app...');
            }
          } else if (progress < 100) {
            setDownloadStatusText('Verifying package integrity...');
          } else {
            setDownloadStatusText('Launching Android Package Installer on screen...');
          }
        }
      );

      if (result && result.success) {
        setDownloadProgress(100);
        setDownloading(false);
        setDownloadComplete(true);
        setDownloadStatusText('Installer prompt launched! Tap Install on screen.');
      } else {
        throw new Error(result?.error || 'Update failed to download in-app');
      }
    } catch (err) {
      console.error('In-app update failure:', err);
      setDownloading(false);
      setErrorMessage(err.message || 'Failed to complete update in-app. Tap to retry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080F0F]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#101819] border border-[#354144] rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#28616A] to-[#A3DCE3] text-[#080F0F] flex items-center justify-center shadow-lg shadow-[#A3DCE3]/20">
              <DownloadCloud size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F0F4F4]">Software Update</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#112C20] text-[#43C88A] border border-[#1D5C3F]">
                  IN-APP
                </span>
              </div>
              <p className="text-xs text-[#A5B1B3] mt-0.5 font-mono">
                Lokify {updateInfo.latestVersion}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#192223] text-[#758588] hover:text-[#F0F4F4] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Version Difference Banner */}
        <div className="bg-[#192223] border border-[#354144] rounded-2xl p-3.5 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[#758588] block text-[10px] uppercase">Current</span>
            <span className="text-[#F0F4F4] font-bold">{updateInfo.currentVersion}</span>
          </div>
          <div className="text-[#A3DCE3] font-bold text-sm">➔</div>
          <div>
            <span className="text-[#758588] block text-[10px] uppercase">New Release</span>
            <span className="text-[#43C88A] font-bold">{updateInfo.latestVersion}</span>
          </div>
          <div className="text-right">
            <span className="text-[#758588] block text-[10px] uppercase">Package</span>
            <span className="text-[#A3DCE3]">{updateInfo.fileSize || '4.5 MB'}</span>
          </div>
        </div>

        {/* Release Notes Preview */}
        <div className="bg-[#080F0F]/60 border border-[#253538] rounded-2xl p-3.5 max-h-36 overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A3DCE3] mb-1.5">
            <Sparkles size={13} />
            <span>What's New in this Release</span>
          </div>
          <p className="text-xs text-[#A5B1B3] leading-relaxed whitespace-pre-line font-sans">
            {updateInfo.releaseNotes}
          </p>
        </div>

        {/* Progress Bar (when downloading) */}
        {downloading && (
          <div className="space-y-2 bg-[#192223] border border-[#354144] rounded-2xl p-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A3DCE3] flex items-center gap-1.5 truncate">
                <Loader2 size={12} className="animate-spin text-[#A3DCE3] shrink-0" />
                <span>{downloadStatusText || 'Downloading update in-app...'}</span>
              </span>
              <span className="text-[#F0F4F4] font-bold shrink-0 ml-2">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#101819] overflow-hidden p-0.5 border border-[#354144]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#28616A] via-[#A3DCE3] to-[#43C88A] transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#758588] text-center">
              Direct In-App download · Stays inside Lokify
            </p>
          </div>
        )}

        {/* Error message if download fails */}
        {errorMessage && (
          <div className="bg-[#321616] border border-[#5C2424] rounded-2xl p-3 text-xs text-[#EF6666] flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 font-mono text-[11px] leading-relaxed">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Success Guidance Banner */}
        {downloadComplete && (
          <div className="bg-[#112C20] border border-[#1D5C3F] rounded-2xl p-3.5 text-xs text-[#43C88A] flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Package Ready to Install!</p>
              <p className="text-[#A5B1B3] text-[11px] mt-1 leading-relaxed font-sans">
                The package installer was launched directly on screen. Tap <strong>Update</strong> to complete.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#A3DCE3] font-mono">
                <ShieldCheck size={12} />
                <span>100% In-App · No Browser Redirection</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {!downloadComplete ? (
            <button
              onClick={handleStartInAppUpdate}
              disabled={downloading}
              className="w-full bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] text-xs font-bold py-3.5 px-4 rounded-2xl transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-[#A3DCE3]/20 disabled:opacity-50"
            >
              <DownloadCloud size={16} />
              <span>{downloading ? 'Downloading In-App...' : 'Update Lokify Now (In-App)'}</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] font-bold text-xs py-3 px-4 rounded-2xl transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>OK</span>
            </button>
          )}

          {!downloadComplete && (
            <div className="flex items-center justify-center pt-1">
              <button
                onClick={onClose}
                className="text-xs text-[#758588] hover:text-[#A5B1B3] font-mono py-1.5 transition"
              >
                Maybe Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
