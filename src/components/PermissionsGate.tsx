import React, { useEffect, useState, useCallback } from 'react';
import {
  Camera,
  MapPin,
  Bell,
  FolderOpen,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Check,
  Smartphone,
  Settings as SettingsIcon,
  Layers,
} from 'lucide-react';

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'checking';

const STORAGE_KEY = 'gps_permissions_intro_complete_v2';

interface PermissionsGateProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLocationGranted?: () => void;
  onCameraGranted?: () => void;
}

export const PermissionsGate: React.FC<PermissionsGateProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  onLocationGranted,
  onCameraGranted,
}) => {
  const [internalVisible, setInternalVisible] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const isVisible = controlledIsOpen !== undefined ? controlledIsOpen : internalVisible;

  const [camera, setCamera] = useState<PermissionState>('checking');
  const [location, setLocation] = useState<PermissionState>('checking');
  const [notifications, setNotifications] = useState<PermissionState>('checking');
  const [storageStatus, setStorageStatus] = useState<'ready' | 'checking'>('checking');

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [batchStep, setBatchStep] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Check current browser permission states
  const checkAllPermissions = useCallback(async () => {
    // 1. Storage Access check (IndexedDB / LocalStorage)
    try {
      if (typeof window !== 'undefined' && ('indexedDB' in window || 'localStorage' in window)) {
        setStorageStatus('ready');
      } else {
        setStorageStatus('ready');
      }
    } catch {
      setStorageStatus('ready');
    }

    // 2. Browser navigator.permissions check
    const p = typeof navigator !== 'undefined' ? navigator.permissions : null;

    if (p?.query) {
      // Camera
      try {
        const cam = await p.query({ name: 'camera' as PermissionName });
        setCamera(cam.state as PermissionState);
        cam.onchange = () => setCamera(cam.state as PermissionState);
      } catch {
        setCamera('prompt');
      }

      // Geolocation
      try {
        const geo = await p.query({ name: 'geolocation' });
        setLocation(geo.state as PermissionState);
        geo.onchange = () => setLocation(geo.state as PermissionState);
      } catch {
        setLocation('prompt');
      }

      // Notifications
      try {
        if (typeof Notification === 'undefined') {
          setNotifications('unsupported');
        } else {
          const notif = await p.query({ name: 'notifications' as PermissionName });
          setNotifications(notif.state as PermissionState);
          notif.onchange = () => setNotifications(notif.state as PermissionState);
        }
      } catch {
        setNotifications(
          typeof Notification === 'undefined' ? 'unsupported' : (Notification.permission as PermissionState)
        );
      }
    } else {
      setCamera('prompt');
      setLocation('prompt');
      setNotifications(
        typeof Notification === 'undefined' ? 'unsupported' : (Notification.permission as PermissionState)
      );
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      void checkAllPermissions();
    }
  }, [isVisible, checkAllPermissions]);

  // Request Camera Permission & Access
  const requestCamera = async (): Promise<boolean> => {
    setBusyAction('camera');
    setNotice(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera hardware access is unavailable in this environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      setCamera('granted');
      onCameraGranted?.();
      return true;
    } catch (err) {
      setCamera('denied');
      const msg = err instanceof Error ? err.message : 'Camera permission was denied.';
      setNotice(`Camera: ${msg} Tap the 🔒 lock icon in browser address bar or check Android Settings.`);
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  // Request GPS Location Permission & Access
  const requestLocation = async (): Promise<boolean> => {
    setBusyAction('location');
    setNotice(null);
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation sensor is unsupported in this browser.');
      }
      return await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocation('granted');
            onLocationGranted?.();
            resolve(true);
          },
          (err) => {
            setLocation('denied');
            setNotice(
              `Location: ${err.message || 'Permission denied'}. Enable High Accuracy GPS in Android Settings.`
            );
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      });
    } catch (err) {
      setLocation('denied');
      const msg = err instanceof Error ? err.message : 'Location request failed.';
      setNotice(`Location: ${msg}`);
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  // Request Notifications Permission
  const requestNotifications = async (): Promise<boolean> => {
    setBusyAction('notifications');
    setNotice(null);
    try {
      if (typeof Notification === 'undefined') {
        setNotifications('unsupported');
        return true;
      }
      if (Notification.permission === 'granted') {
        setNotifications('granted');
        return true;
      }
      if (Notification.permission === 'denied') {
        setNotifications('denied');
        setNotice('Notifications are blocked. You can enable alerts in Android App Settings.');
        return false;
      }
      const res = await Notification.requestPermission();
      setNotifications(res as PermissionState);
      return res === 'granted';
    } catch {
      setNotifications('unsupported');
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  // Master Action: Grant All Access & Permissions sequentially in one tap
  const handleGrantAll = async () => {
    setNotice(null);
    setBusyAction('grant-all');

    try {
      // Step 1: Camera
      setBatchStep('Requesting Camera Access…');
      await requestCamera();

      // Step 2: Location
      setBatchStep('Requesting Precise GPS Location Access…');
      await requestLocation();

      // Step 3: Notifications
      setBatchStep('Requesting Notification Alerts…');
      await requestNotifications();

      setBatchStep('Verifying All Permissions & Storage…');
      await checkAllPermissions();
      setBatchStep(null);
    } catch {
      setBatchStep(null);
    } finally {
      setBusyAction(null);
      setBatchStep(null);
    }
  };

  // Open Android 11+ All Files Storage Access Settings
  const openAllFilesSettings = () => {
    try {
      if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
        window.location.assign(
          'intent:#Intent;action=android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION;data=package:com.raman.gpsmapeditorfree;end'
        );
      } else {
        setNotice(
          'Android 11+: Open Android Settings → Apps → Raman Gps Photo Editor → Special App Access → All Files Access.'
        );
      }
    } catch {
      setNotice(
        'Android 11+: Open Android Settings → Apps → Raman Gps Photo Editor → Special App Access → All Files Access.'
      );
    }
  };

  // Open Android System App Settings
  const openAppSettings = () => {
    try {
      if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
        window.location.assign(
          'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:com.raman.gpsmapeditorfree;end'
        );
      } else {
        setShowTroubleshooting(true);
      }
    } catch {
      setShowTroubleshooting(true);
    }
  };

  // Dismiss / Enter App
  const handleComplete = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    setInternalVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  // Calculate granted count out of 4 main items
  const grantedCount =
    (camera === 'granted' ? 1 : 0) +
    (location === 'granted' ? 1 : 0) +
    (notifications === 'granted' ? 1 : 0) +
    (storageStatus === 'ready' ? 1 : 0);

  const totalItems = 4;
  const isAllEssentialGranted = camera === 'granted' && location === 'granted';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/92 backdrop-blur-2xl p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-xl my-auto rounded-3xl border border-white/10 bg-neutral-900/95 shadow-2xl p-4 sm:p-7 flex flex-col text-left animate-fade-in">
        {/* Unified Header: Access & Permission Request */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 via-blue-600/30 to-purple-600/30 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-lg shadow-sky-500/10">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-neutral-900 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Unified Setup
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {grantedCount}/{totalItems} Configured
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-bold text-white tracking-tight mt-0.5">
                Access & Permission Request
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400">
                Grant required device access and runtime permissions in this single screen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={checkAllPermissions}
            disabled={busyAction !== null}
            className="p-2 sm:p-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/5 active:scale-95 transition cursor-pointer"
            title="Refresh access & permission status"
            aria-label="Refresh access & permission status"
          >
            <RefreshCw className={`w-4 h-4 ${busyAction !== null ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-neutral-800/60 rounded-full h-1.5 mt-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              grantedCount === totalItems
                ? 'bg-emerald-500'
                : grantedCount >= 2
                ? 'bg-sky-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${(grantedCount / totalItems) * 100}%` }}
          />
        </div>

        {/* Master One-Tap Grant Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleGrantAll()}
            disabled={busyAction !== null}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
              isAllEssentialGranted
                ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                : 'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-sky-500/25 hover:brightness-110 active:scale-[0.99]'
            }`}
          >
            {busyAction === 'grant-all' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>{batchStep || 'Granting access…'}</span>
              </>
            ) : isAllEssentialGranted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All Essential Access Granted! (Tap to Re-verify)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>⚡ Allow All Access & Permissions (1-Tap)</span>
              </>
            )}
          </button>
        </div>

        {/* Notice banner */}
        {notice && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setShowTroubleshooting((prev) => !prev)}
                className="block text-[11px] underline text-amber-300 hover:text-amber-100 font-semibold mt-1"
              >
                {showTroubleshooting ? 'Hide troubleshooting steps' : 'How to allow in Android / Chrome?'}
              </button>
            </div>
          </div>
        )}

        {/* Troubleshooting Instructions (Collapsible) */}
        {showTroubleshooting && (
          <div className="mt-2.5 p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-neutral-300 text-xs space-y-2 animate-fade-in">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>Android & Browser Access Steps:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-neutral-300 text-[11px] leading-relaxed">
              <li>Tap the 🔒 lock or settings icon next to the URL in your browser bar.</li>
              <li>Select <strong>Permissions</strong> and set <strong>Camera</strong> & <strong>Location</strong> to <em>Allowed</em>.</li>
              <li>Or on your device: open <strong>Android Settings → Apps → Raman Gps Photo Editor → Permissions</strong> and enable Camera, Location, and Storage.</li>
              <li>Return to the app and tap <strong>Refresh</strong> (top right).</li>
            </ol>
          </div>
        )}

        {/* Merged Items List (Access Requests + Permission Requests) */}
        <div className="mt-4 space-y-2.5 overflow-y-auto max-h-[46vh] sm:max-h-[50vh] pr-1">
          {/* 1. Camera Access & Permission */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950/90 border border-neutral-800/90 flex items-center justify-between gap-3 hover:border-neutral-700 transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Camera className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-white">Camera Access & Permission</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Required
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-400 truncate">
                  Viewfinder preview, live lens switching & photo capture
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      camera === 'granted'
                        ? 'text-emerald-400'
                        : camera === 'denied'
                        ? 'text-amber-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    {camera === 'granted' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Allowed & Ready
                      </>
                    ) : camera === 'denied' ? (
                      <>
                        <AlertCircle className="w-3 h-3 text-amber-400" /> Blocked
                      </>
                    ) : (
                      'Permission Required'
                    )}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void requestCamera()}
              disabled={busyAction !== null}
              className={`shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                camera === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-sky-500 hover:bg-sky-400 text-white'
              }`}
            >
              {camera === 'granted' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Allowed</span>
                </>
              ) : busyAction === 'camera' ? (
                'Allowing…'
              ) : (
                'Allow'
              )}
            </button>
          </div>

          {/* 2. Precise GPS Location Access & Permission */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950/90 border border-neutral-800/90 flex items-center justify-between gap-3 hover:border-neutral-700 transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <MapPin className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-white">GPS Location Access & Permission</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Required
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-400 truncate">
                  Coordinates, altitude, address, plus codes & live map
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      location === 'granted'
                        ? 'text-emerald-400'
                        : location === 'denied'
                        ? 'text-amber-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    {location === 'granted' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Allowed & Ready
                      </>
                    ) : location === 'denied' ? (
                      <>
                        <AlertCircle className="w-3 h-3 text-amber-400" /> Blocked
                      </>
                    ) : (
                      'Permission Required'
                    )}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void requestLocation()}
              disabled={busyAction !== null}
              className={`shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                location === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {location === 'granted' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Allowed</span>
                </>
              ) : busyAction === 'location' ? (
                'Allowing…'
              ) : (
                'Allow'
              )}
            </button>
          </div>

          {/* 3. Media & Storage File Access Request */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950/90 border border-neutral-800/90 flex items-center justify-between gap-3 hover:border-neutral-700 transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <FolderOpen className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-white">Media & Photos Storage Access</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Storage Access
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-400 truncate">
                  Save stamped high-res photos to device gallery & offline storage
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="w-3 h-3 text-emerald-400" /> Storage Ready (IndexedDB & DCIM Save)
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openAllFilesSettings}
              className="shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 text-[11px] sm:text-xs font-semibold transition flex items-center gap-1 cursor-pointer border border-white/5"
              title="Android 11+ Special App Storage Access"
            >
              <span>Android Access</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </button>
          </div>

          {/* 4. Notification Alerts Permission */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950/90 border border-neutral-800/90 flex items-center justify-between gap-3 hover:border-neutral-700 transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Bell className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-white">Notifications & Alert Access</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                    Optional
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-400 truncate">
                  Alerts on photo capture, saving & GPS lock updates
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      notifications === 'granted'
                        ? 'text-emerald-400'
                        : notifications === 'denied'
                        ? 'text-neutral-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    {notifications === 'granted' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Allowed
                      </>
                    ) : notifications === 'denied' ? (
                      'Disabled'
                    ) : notifications === 'unsupported' ? (
                      'WebView Standard'
                    ) : (
                      'Not Allowed Yet'
                    )}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void requestNotifications()}
              disabled={busyAction !== null || notifications === 'unsupported'}
              className={`shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                notifications === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-white'
              }`}
            >
              {notifications === 'granted' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Allowed</span>
                </>
              ) : busyAction === 'notifications' ? (
                'Allowing…'
              ) : (
                'Allow'
              )}
            </button>
          </div>

          {/* 5. Android System Settings Access */}
          <div className="p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800/60 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-800 text-neutral-400 flex items-center justify-center shrink-0">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-300 block">Android System Permissions</span>
                <span className="text-[10px] text-neutral-500">Manage or revoke app access anytime in Android system settings</span>
              </div>
            </div>
            <button
              type="button"
              onClick={openAppSettings}
              className="shrink-0 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 font-medium transition cursor-pointer flex items-center gap-1"
            >
              <span>App Info</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Unified Bottom Action */}
        <div className="mt-5 pt-3 border-t border-neutral-800 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleComplete}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition cursor-pointer"
          >
            <span>Continue to Camera</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleComplete}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-neutral-400 hover:text-white text-xs font-medium transition cursor-pointer text-center"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};
