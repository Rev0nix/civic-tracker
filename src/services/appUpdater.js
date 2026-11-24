// Lokify In-App Updater Engine
// Multi-source resilient update checker for Android and Web
// Downloads and installs APK directly within the app without opening external browsers.

export const CURRENT_APP_VERSION = '1.3.9';
export const GITHUB_REPO = 'Rev0nix/civic-tracker';

/**
 * Checks multiple endpoints (raw GitHub, jsDelivr, GitHub API) to guarantee
 * update detection even if GitHub API is rate-limited or cached.
 */
export async function checkForAppUpdate() {
  const cleanCurrent = CURRENT_APP_VERSION.replace(/^v/, '');
  const timestamp = Date.now();

  const sources = [
    // 1. Raw GitHub version.json (NO 60 req/hr rate limit, updates instantly on push)
    {
      url: `https://raw.githubusercontent.com/${GITHUB_REPO}/main/version.json?_t=${timestamp}`,
      type: 'json_version',
    },
    // 2. jsDelivr CDN version.json (Global high-availability mirror, zero rate limits)
    {
      url: `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/version.json?_t=${timestamp}`,
      type: 'json_version',
    },
    // 3. GitHub Pages version.json
    {
      url: `https://rev0nix.github.io/civic-tracker/version.json?_t=${timestamp}`,
      type: 'json_version',
    },
    // 4. GitHub Releases API (Official API latest endpoint)
    {
      url: `https://api.github.com/repos/${GITHUB_REPO}/releases/latest?_t=${timestamp}`,
      type: 'github_release',
    },
    // 5. GitHub Releases list (Array fallback in case releases/latest is delayed)
    {
      url: `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=3&_t=${timestamp}`,
      type: 'github_releases_list',
    },
  ];

  let lastError = null;

  for (const source of sources) {
    try {
      const res = await fetch(source.url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!res.ok) {
        lastError = `Status ${res.status} from ${source.type}`;
        continue;
      }

      const data = await res.json();
      let latestTag = '';
      let downloadUrl = '';
      let releaseNotes = '';
      let fileSize = '4.5 MB';
      let releaseName = '';

      if (source.type === 'json_version') {
        latestTag = (data.version || data.tag_name || '').trim();
        downloadUrl =
          data.downloadUrl ||
          `https://github.com/${GITHUB_REPO}/releases/download/v${latestTag.replace(/^v/, '')}/app-release.apk`;
        releaseNotes = data.releaseNotes || 'Latest improvements and bug fixes.';
        fileSize = data.fileSize || '4.5 MB';
        releaseName = data.releaseName || `Lokify v${latestTag.replace(/^v/, '')}`;
      } else if (source.type === 'github_release') {
        latestTag = (data.tag_name || '').trim();
        releaseName = data.name || `Lokify ${latestTag}`;
        releaseNotes = data.body || 'Latest bug fixes and performance upgrades.';
        const apkAsset = (data.assets || []).find(
          (a) => a.name && a.name.toLowerCase().endsWith('.apk')
        );
        downloadUrl = apkAsset
          ? apkAsset.browser_download_url
          : `https://github.com/${GITHUB_REPO}/releases/download/${latestTag}/app-release.apk`;
        if (apkAsset && apkAsset.size) {
          fileSize = `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB`;
        }
      } else if (source.type === 'github_releases_list') {
        const release = Array.isArray(data) ? data.find((r) => !r.draft) : null;
        if (!release) continue;
        latestTag = (release.tag_name || '').trim();
        releaseName = release.name || `Lokify ${latestTag}`;
        releaseNotes = release.body || 'Latest bug fixes and performance upgrades.';
        const apkAsset = (release.assets || []).find(
          (a) => a.name && a.name.toLowerCase().endsWith('.apk')
        );
        downloadUrl = apkAsset
          ? apkAsset.browser_download_url
          : `https://github.com/${GITHUB_REPO}/releases/download/${latestTag}/app-release.apk`;
        if (apkAsset && apkAsset.size) {
          fileSize = `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB`;
        }
      }

      const cleanLatest = latestTag.replace(/^v/, '');
      if (!cleanLatest) continue;

      const hasUpdate = isNewerVersion(cleanLatest, cleanCurrent);

      return {
        hasUpdate,
        latestVersion: `v${cleanLatest}`,
        currentVersion: `v${cleanCurrent}`,
        releaseName,
        releaseNotes,
        downloadUrl,
        fileSize,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      lastError = err.message;
    }
  }

  return {
    hasUpdate: false,
    currentVersion: `v${cleanCurrent}`,
    error: lastError || 'Unable to reach update servers',
  };
}

/**
 * Compares two semantic version strings (e.g. "1.3.6" vs "1.3.4")
 */
export function isNewerVersion(latest, current) {
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
 * Downloads and installs the APK purely IN-APP without opening any external browser.
 * On Android, utilizes the native LokifyNativeUpdater Kotlin plugin to stream
 * bytes and launch the package installer directly.
 * 
 * @param {object} updateInfo - The update info object returned from checkForAppUpdate
 * @param {function} onProgress - Callback (percent, downloadedBytes, totalBytes)
 */
export async function downloadAndInstallApkInApp(updateInfo, onProgress) {
  const downloadUrl =
    updateInfo?.downloadUrl ||
    `https://github.com/${GITHUB_REPO}/releases/latest/download/app-release.apk`;
  const cleanVersion = (updateInfo?.latestVersion || 'latest').replace(/^v/, '');

  // 1. Android Native Capacitor Engine
  try {
    const nativeUpdater =
      window.Capacitor?.Plugins?.LokifyNativeUpdater ||
      (window.Capacitor?.isPluginAvailable &&
        window.Capacitor.isPluginAvailable('LokifyNativeUpdater') &&
        window.Capacitor.Plugins.LokifyNativeUpdater);

    if (nativeUpdater) {
      let listenerHandle = null;
      if (typeof nativeUpdater.addListener === 'function') {
        listenerHandle = await nativeUpdater.addListener('downloadProgress', (data) => {
          if (onProgress && typeof onProgress === 'function') {
            onProgress(data.progress || 0, data.downloadedBytes || 0, data.totalBytes || 0);
          }
        });
      }

      const res = await nativeUpdater.downloadAndInstall({
        url: downloadUrl,
        version: cleanVersion,
      });

      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }

      return {
        success: true,
        inApp: true,
        message: 'Native installer opened in-app',
        res,
      };
    }
  } catch (err) {
    console.warn('Native in-app updater error, evaluating fallback:', err);
  }

  // 2. Browser / Progressive fallback (Never leaves or opens external browser window)
  try {
    if (onProgress) onProgress(15, 0, 0);

    const stepInterval = setInterval(() => {
      if (onProgress) {
        onProgress((prev) => (prev >= 90 ? 90 : (prev || 15) + 20));
      }
    }, 250);

    // Create an invisible download trigger in DOM without navigating the active window
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `lokify-v${cleanVersion}.apk`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    await new Promise((resolve) => setTimeout(resolve, 1000));
    clearInterval(stepInterval);
    if (document.body.contains(link)) document.body.removeChild(link);

    if (onProgress) onProgress(100, 0, 0);

    return {
      success: true,
      inApp: true,
      message: 'Update download triggered in-app',
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}
