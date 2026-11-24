// Lokify In-App Updater Engine
// Checks GitHub Releases API for new versions and triggers direct in-app installation.

export const CURRENT_APP_VERSION = '1.3.2';
export const GITHUB_REPO = 'Rev0nix/civic-tracker';

/**
 * Checks GitHub Releases API for newer version
 */
export async function checkForAppUpdate() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest?_t=${Date.now()}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!res.ok) {
      return {
        hasUpdate: false,
        currentVersion: `v${CURRENT_APP_VERSION}`,
        error: `Server responded with ${res.status}`,
      };
    }

    const data = await res.json();
    const latestTag = (data.tag_name || '').trim();
    const cleanLatest = latestTag.replace(/^v/, '');
    const cleanCurrent = CURRENT_APP_VERSION.replace(/^v/, '');

    const hasUpdate = isNewerVersion(cleanLatest, cleanCurrent);

    // Look for apk asset or fallback to browser download url
    const apkAsset = (data.assets || []).find(
      (a) => a.name && a.name.toLowerCase().endsWith('.apk')
    );

    const downloadUrl = apkAsset
      ? apkAsset.browser_download_url
      : `https://github.com/${GITHUB_REPO}/releases/download/${latestTag}/app-debug.apk`;

    const sizeFormatted = apkAsset
      ? `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB`
      : '4.5 MB';

    return {
      hasUpdate,
      latestVersion: latestTag || `v${cleanLatest}`,
      currentVersion: `v${CURRENT_APP_VERSION}`,
      releaseName: data.name || `Lokify ${latestTag}`,
      releaseNotes: data.body || 'Bug fixes, UI enhancements, and stability improvements.',
      downloadUrl,
      fileSize: sizeFormatted,
      publishedAt: data.published_at,
    };
  } catch (err) {
    console.warn('In-app update check error:', err);
    return {
      hasUpdate: false,
      currentVersion: `v${CURRENT_APP_VERSION}`,
      error: err.message || 'Network error while checking updates',
    };
  }
}

/**
 * Compares two semantic version strings
 */
function isNewerVersion(latest, current) {
  if (!latest || !current) return false;
  const lParts = latest.split('.').map((p) => parseInt(p, 10) || 0);
  const cParts = current.split('.').map((p) => parseInt(p, 10) || 0);

  for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Triggers in-app APK download / install on Android and Web
 */
export function triggerApkInstall(downloadUrl) {
  if (!downloadUrl) {
    downloadUrl = `https://github.com/${GITHUB_REPO}/releases/latest/download/app-debug.apk`;
  }

  // Create temporary anchor to initiate native Android browser download
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', 'lokify-update.apk');
  link.setAttribute('target', '_blank');
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Fallback for WebView / Capacitor containers
  try {
    if (window.open) {
      window.open(downloadUrl, '_system');
    }
  } catch {
    // Ignore fallback errors
  }
}
