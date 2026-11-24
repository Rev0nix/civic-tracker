import { useState } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react';
import { triggerApkInstall } from '../services/appUpdater';

export default function InAppUpdateModal({
  isOpen,
  onClose,
  updateInfo,
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);

  if (!isOpen || !updateInfo) return null;

  const handleStartUpdate = () => {
    setDownloading(true);
    setDownloadProgress(15);

    // Smooth progressive feedback
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setDownloadProgress(100);
      setDownloading(false);
      setDownloadComplete(true);

      // Trigger actual APK download in Android / browser
      triggerApkInstall(updateInfo.downloadUrl);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080F0F]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#101819] border border-[#354144] rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 relative animate-in slide-in-from-bottom-4 duration-250 select-none"
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
                  NEW
                </span>
              </div>
              <p className="text-xs text-[#A5B1B3] mt-0.5">
                Lokify {updateInfo.latestVersion} is ready to install
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
            <span className="text-[#758588] block text-[10px] uppercase">Installed</span>
            <span className="text-[#F0F4F4] font-bold">{updateInfo.currentVersion}</span>
          </div>
          <div className="text-[#A3DCE3] font-bold text-sm">➔</div>
          <div>
            <span className="text-[#758588] block text-[10px] uppercase">New Release</span>
            <span className="text-[#43C88A] font-bold">{updateInfo.latestVersion}</span>
          </div>
          <div className="text-right">
            <span className="text-[#758588] block text-[10px] uppercase">Size</span>
            <span className="text-[#A3DCE3]">{updateInfo.fileSize}</span>
          </div>
        </div>

        {/* Release Notes Preview */}
        <div className="bg-[#080F0F]/60 border border-[#253538] rounded-2xl p-3.5 max-h-36 overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A3DCE3] mb-1.5">
            <Sparkles size={13} />
            <span>What's New</span>
          </div>
          <p className="text-xs text-[#A5B1B3] leading-relaxed whitespace-pre-line font-sans">
            {updateInfo.releaseNotes}
          </p>
        </div>

        {/* Progress Bar (when downloading) */}
        {downloading && (
          <div className="space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A3DCE3]">Downloading update package...</span>
              <span className="text-[#F0F4F4] font-bold">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#192223] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#28616A] via-[#A3DCE3] to-[#43C88A] transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Guidance Banner */}
        {downloadComplete && (
          <div className="bg-[#112C20] border border-[#1D5C3F] rounded-2xl p-3 text-xs text-[#43C88A] flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Download Initiated!</p>
              <p className="text-[#A5B1B3] text-[11px] mt-0.5 leading-relaxed font-sans">
                Check your device's notification bar or Downloads folder, and tap the APK to install.
              </p>
              <p className="text-[#758588] text-[10px] mt-1 font-sans">
                ℹ️ If Play Protect prompts "This app may be harmful", tap <strong>More details &rarr; Install anyway</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {!downloadComplete ? (
            <button
              onClick={handleStartUpdate}
              disabled={downloading}
              className="w-full bg-[#A3DCE3] hover:bg-[#85CBD3] text-[#080F0F] text-xs font-bold py-3.5 px-4 rounded-2xl transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-[#A3DCE3]/20 disabled:opacity-50"
            >
              <DownloadCloud size={16} />
              <span>{downloading ? 'Preparing Download...' : 'Install Update In-App'}</span>
            </button>
          ) : (
            <button
              onClick={handleStartUpdate}
              className="w-full bg-[#192223] hover:bg-[#202B2D] text-[#A3DCE3] border border-[#354144] hover:border-[#A3DCE3] text-xs font-bold py-3 px-4 rounded-2xl transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <DownloadCloud size={15} />
              <span>Download Again</span>
            </button>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onClose}
              className="text-xs text-[#758588] hover:text-[#A5B1B3] font-mono py-1.5 transition"
            >
              Maybe Later
            </button>

            <a
              href={`https://github.com/Rev0nix/civic-tracker/releases/tag/${updateInfo.latestVersion}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-[#A3DCE3] hover:underline font-mono"
            >
              <span>GitHub Release</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
