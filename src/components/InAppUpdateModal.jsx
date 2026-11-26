import { useState } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  Sparkles,
  X,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react';
import { downloadAndInstallApkInApp, openDownloadedInstaller } from '../services/appUpdater';

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
    setDownloadStatusText('Connecting to update server...');
    setErrorMessage('');

    try {
      const result = await downloadAndInstallApkInApp(
        updateInfo,
        (progress, downloadedBytes, totalBytes) => {
          setDownloadProgress(progress);
          if (progress < 40) {
            setDownloadStatusText('Downloading Lokify.apk in-app...');
          } else if (progress < 90) {
            if (totalBytes > 0 && downloadedBytes > 0) {
              const dlMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
              const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
              setDownloadStatusText(`Receiving Lokify.apk: ${dlMb} MB / ${totalMb} MB...`);
            } else {
              setDownloadStatusText('Downloading Lokify.apk...');
            }
          } else if (progress < 100) {
            setDownloadStatusText('Verifying package integrity...');
          } else {
            setDownloadStatusText('Opening installer on screen...');
          }
        }
      );

      if (result && result.success) {
        setDownloadProgress(100);
        setDownloading(false);
        setDownloadComplete(true);
        setDownloadStatusText(
          result.message || 'Lokify.apk downloaded! Installer is opening on your screen.'
        );
      } else {
        throw new Error(result?.error || 'Update failed to download');
      }
    } catch (err) {
      console.error('Update failure:', err);
      setDownloading(false);
      setErrorMessage(err.message || 'Failed to complete update. Tap to retry.');
    }
  };

  const handleManualOpenInstaller = async () => {
    await openDownloadedInstaller();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-3.5 relative animate-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1F6FEB]/15 text-[#58A6FF] flex items-center justify-center">
              <DownloadCloud size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#F0F6FC]">Software Update</h3>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#238636]/15 text-[#3FB950] border border-[#238636]/30">
                  In-App
                </span>
              </div>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Lokify {updateInfo.latestVersion}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Version Difference Banner */}
        <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-[#8B949E] block text-[10px]">Current</span>
            <span className="text-[#F0F6FC] font-semibold">{updateInfo.currentVersion}</span>
          </div>
          <div className="text-[#58A6FF] font-bold text-sm">➔</div>
          <div>
            <span className="text-[#8B949E] block text-[10px]">New Release</span>
            <span className="text-[#3FB950] font-semibold">{updateInfo.latestVersion}</span>
          </div>
          <div className="text-right">
            <span className="text-[#8B949E] block text-[10px]">Package</span>
            <span className="text-[#58A6FF] font-medium">Lokify.apk</span>
          </div>
        </div>

        {/* Release Notes */}
        <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3 max-h-32 overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#58A6FF] mb-1">
            <Sparkles size={12} />
            <span>What's New</span>
          </div>
          <p className="text-xs text-[#8B949E] leading-relaxed whitespace-pre-line">
            {updateInfo.releaseNotes}
          </p>
        </div>

        {/* Progress Bar (when downloading) */}
        {downloading && (
          <div className="space-y-1.5 bg-[#0D1117] border border-[#30363D] rounded-xl p-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#58A6FF] flex items-center gap-1.5 truncate text-[11px]">
                <Loader2 size={11} className="animate-spin text-[#58A6FF] shrink-0" />
                <span>{downloadStatusText || 'Downloading Lokify.apk...'}</span>
              </span>
              <span className="text-[#F0F6FC] font-bold shrink-0 ml-2 text-xs">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#161B22] overflow-hidden p-0.5 border border-[#30363D]">
              <div
                className="h-full rounded-full bg-[#1F6FEB] transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-[#8B949E] text-center">
              Direct in-app download · No external browser
            </p>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="bg-[#321616] border border-[#5C2424] rounded-xl p-2.5 text-xs text-[#F85149] flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Success Guidance Banner */}
        {downloadComplete && (
          <div className="bg-[#238636]/10 border border-[#238636]/30 rounded-xl p-3 text-xs text-[#3FB950] flex items-start gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs text-[#F0F6FC]">Lokify.apk Downloaded</p>
              <p className="text-[#8B949E] text-[11px] mt-0.5 leading-relaxed">
                {downloadStatusText || 'The update package was saved to your device. The installer prompt will open automatically, or tap Install Lokify.apk below.'}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-[#58A6FF]">
                <ShieldCheck size={11} />
                <span>Verified Safe & Clean · Official Lokify.apk Release</span>
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
              className="w-full bg-[#1F6FEB] hover:bg-[#388BFD] text-white text-xs font-semibold py-3 px-4 rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <DownloadCloud size={15} />
              <span>{downloading ? 'Downloading...' : 'Update Now (In-App)'}</span>
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleManualOpenInstaller}
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-xs py-3 px-4 rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
              >
                <PackageCheck size={16} />
                <span>Install Lokify.apk</span>
              </button>
              <button
                onClick={onClose}
                className="w-full bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] font-semibold text-xs py-2 px-4 rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Done</span>
              </button>
            </div>
          )}

          {!downloadComplete && (
            <div className="flex items-center justify-center">
              <button
                onClick={onClose}
                className="text-xs text-[#8B949E] hover:text-[#C9D1D9] py-1 transition"
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
