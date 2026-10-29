import React, { useRef, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  LocationData,
  TemplateType,
  AspectRatio,
  FlashMode,
  CapturedPhoto,
  MapType,
  Units,
} from '../types/gps';
import { TemplateCard } from './TemplateCard';
import { renderStampedPhoto } from '../utils/stampRenderer';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Grid,
  Clock,
  Menu,
  Sliders,
  MapPin,
  Image as ImageIcon,
  Upload,
  Settings,
  Sparkles,
  Compass,
  Radio,
  Crosshair,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Pin,
  PinOff,
  Layers,
  Globe,
  Gauge,
  Navigation,
  Palette,
  Maximize2,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface CameraViewProps {
  location: LocationData;
  template: TemplateType;
  capturedPhotos: CapturedPhoto[];
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  onUpdateLocation?: (updates: Partial<LocationData>) => void;
  onOpenTemplateSheet: () => void;
  onOpenCustomize: () => void;
  onOpenSettings: () => void;
  onOpenMapPicker: () => void;
  onOpenEditLocation: () => void;
  onOpenMenu: () => void;
  onOpenPhotoViewer: (photo: CapturedPhoto) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  location,
  template,
  capturedPhotos,
  onPhotoCaptured,
  onUpdateLocation,
  onOpenTemplateSheet,
  onOpenCustomize,
  onOpenSettings,
  onOpenMapPicker,
  onOpenEditLocation,
  onOpenMenu,
  onOpenPhotoViewer,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Invalidates in-flight getUserMedia requests when the camera view unmounts or switches lenses.
  const cameraStartTokenRef = useRef(0);

  // Top Options Panel Show/Hide Toggle & Auto-hide State
  const [isTopOptionsOpen, setIsTopOptionsOpen] = useState<boolean>(false);
  const [autoHideEnabled, setAutoHideEnabled] = useState<boolean>(false);
  const [autoHideSecondsRemaining, setAutoHideSecondsRemaining] = useState<number>(6);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Floating Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  // Camera Settings
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const restartCameraAfterFacingChangeRef = useRef<boolean>(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('full');
  const [gridMode, setGridMode] = useState<'rule_of_thirds' | 'crosshair' | 'none'>('rule_of_thirds');
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStarting, setCameraStarting] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number }>({ min: 1, max: 1, step: 0.1 });
  const [digitalZoomActive, setDigitalZoomActive] = useState<boolean>(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  // Viewfinder Overlays Visibility
  const [showHUD, setShowHUD] = useState<boolean>(false);
  const [showLevelLine, setShowLevelLine] = useState<boolean>(false);
  const [showStampPreview, setShowStampPreview] = useState<boolean>(true);
  const [isStampMinimized, setIsStampMinimized] = useState<boolean>(false);

  // Artificial Horizon Level Angle
  const [rollAngle, setRollAngle] = useState<number>(0);
  const isLevel = Math.abs(rollAngle) < 2;

  // Uploaded Photo Fallback Mode
  const [importedImage, setImportedImage] = useState<HTMLImageElement | null>(null);

  // Pinch-to-zoom support
  const cameraPinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };
  const handleCameraTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      cameraPinchStart.current = { distance: getTouchDistance(e.touches), zoom: zoomLevel };
    }
  };
  const handleCameraTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const start = cameraPinchStart.current;
      if (start && start.distance > 0) {
        const rawZoom = (start.zoom * distance) / start.distance;
        const clampedZoom = Math.max(zoomRange.min, Math.min(zoomRange.max, rawZoom));
        const nextZoom = zoomRange.step > 0
          ? zoomRange.min + Math.round((clampedZoom - zoomRange.min) / zoomRange.step) * zoomRange.step
          : clampedZoom;
        void applyDeviceZoom(Number(nextZoom.toFixed(2)));
      }
    }
  };
  const handleCameraTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) cameraPinchStart.current = null;
  };

  // Auto-hide Timer for Top Options Panel
  const resetAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    if (!autoHideEnabled || !isTopOptionsOpen) return;

    setAutoHideSecondsRemaining(6);

    countdownIntervalRef.current = setInterval(() => {
      setAutoHideSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    autoHideTimerRef.current = setTimeout(() => {
      setIsTopOptionsOpen(false);
    }, 6000);
  }, [autoHideEnabled, isTopOptionsOpen]);

  useEffect(() => {
    if (isTopOptionsOpen && autoHideEnabled) {
      resetAutoHideTimer();
    } else {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isTopOptionsOpen, autoHideEnabled, resetAutoHideTimer]);

  // Start Camera Stream
  const startCamera = async () => {
    const startToken = ++cameraStartTokenRef.current;
    setCameraStarting(true);
    setCameraActive(false);
    setZoomRange({ min: 1, max: 1, step: 0.1 });
    setZoomLevel(1);
    setDigitalZoomActive(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraError(null);
    setImportedImage(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraStarting(false);
      setCameraActive(false);
      setCameraError('Camera API unavailable. You can import any photo from your gallery.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: facingMode } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          });
        }
      }

      // getUserMedia may resolve after the component has unmounted or the user switched cameras.
      if (startToken !== cameraStartTokenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play interrupted or autoplay blocked:', playErr);
        }
      }

      const activeTrack = stream.getVideoTracks()[0];
      const caps = activeTrack?.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } }) | undefined;
      const zoomCaps = caps?.zoom;
      if (zoomCaps && Number.isFinite(zoomCaps.min) && Number.isFinite(zoomCaps.max) && zoomCaps.max > zoomCaps.min) {
        const step = zoomCaps.step && zoomCaps.step > 0 ? zoomCaps.step : 0.1;
        const settings = activeTrack.getSettings?.() as MediaTrackSettings & { zoom?: number };
        const current = Number.isFinite(settings.zoom) ? settings.zoom as number : zoomCaps.min;
        setZoomRange({ min: zoomCaps.min, max: zoomCaps.max, step });
        setZoomLevel(Math.max(zoomCaps.min, Math.min(zoomCaps.max, current)));
      } else {
        setZoomRange({ min: 1, max: 3, step: 0.1 });
        setZoomLevel(1);
        setDigitalZoomActive(true);
      }

      setCameraActive(true);
      applyFlashMode(flashMode, stream);
    } catch (err: any) {
      if (startToken === cameraStartTokenRef.current) {
        console.warn('Camera stream could not start:', err);
        setCameraActive(false);
        setCameraError('Camera access unavailable. Tap below to retry or import a photo.');
      }
    } finally {
      if (startToken === cameraStartTokenRef.current) setCameraStarting(false);
    }
  };

  const applyFlashMode = (mode: FlashMode, stream = streamRef.current) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        track
          .applyConstraints({
            advanced: [{ torch: mode === 'torch' || mode === 'on' } as any],
          })
          .catch(() => {});
      }
    }
  };

  useEffect(() => {
    if (restartCameraAfterFacingChangeRef.current) {
      restartCameraAfterFacingChangeRef.current = false;
      void startCamera();
    } else {
      void startCamera();
    }

    return () => {
      cameraStartTokenRef.current += 1;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  useEffect(() => {
    let cancelled = false;
    const syncCameraZoom = async () => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!cameraActive || importedImage || !track) {
        setZoomRange({ min: 1, max: 1, step: 0.1 });
        return;
      }
      try {
        const capabilities = track.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } }) | undefined;
        if (cancelled) return;
        const zoomCaps = capabilities?.zoom;
        if (!zoomCaps || !Number.isFinite(zoomCaps.min) || !Number.isFinite(zoomCaps.max) || zoomCaps.max <= zoomCaps.min) {
          if (cancelled) return;
          setZoomRange({ min: 1, max: 3, step: 0.1 });
          setZoomLevel(1);
          setDigitalZoomActive(true);
          return;
        }
        if (cancelled) return;
        setDigitalZoomActive(false);
        const step = zoomCaps.step && zoomCaps.step > 0 ? zoomCaps.step : 0.1;
        setZoomRange({ min: zoomCaps.min, max: zoomCaps.max, step });
        const settings = track.getSettings?.() as MediaTrackSettings & { zoom?: number };
        const current = Number.isFinite(settings.zoom) ? settings.zoom as number : zoomCaps.min;
        setZoomLevel(Math.max(zoomCaps.min, Math.min(zoomCaps.max, current)));
      } catch (error) {
        console.warn('Unable to read camera zoom capabilities:', error);
      }
    };
    void syncCameraZoom();
    return () => { cancelled = true; };
  }, [cameraActive, importedImage, facingMode]);

  const applyDeviceZoom = async (requestedZoom: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } }) | undefined;
    const zoomCaps = capabilities?.zoom;
    if (!track || !zoomCaps || zoomCaps.max <= zoomCaps.min) {
      if (track && cameraActive && !importedImage) {
        const digital = Math.max(1, Math.min(3, requestedZoom));
        setZoomRange({ min: 1, max: 3, step: 0.1 });
        setZoomLevel(digital);
        setDigitalZoomActive(true);
        showToast(`${digital.toFixed(1)}× Zoom`);
      }
      return;
    }
    const step = zoomCaps.step && zoomCaps.step > 0 ? zoomCaps.step : 0.1;
    const clamped = Math.max(zoomCaps.min, Math.min(zoomCaps.max, requestedZoom));
    const quantized = zoomCaps.min + Math.round((clamped - zoomCaps.min) / step) * step;
    const value = Number(Math.max(zoomCaps.min, Math.min(zoomCaps.max, quantized)).toFixed(3));
    try {
      try {
        await track.applyConstraints({ zoom: value } as MediaTrackConstraints);
      } catch {
        await track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
      }
      const appliedSettings = track.getSettings?.() as MediaTrackSettings & { zoom?: number };
      const appliedZoom = Number.isFinite(appliedSettings.zoom) ? appliedSettings.zoom as number : value;
      setDigitalZoomActive(false);
      setZoomLevel(appliedZoom);
      showToast(`${appliedZoom.toFixed(1)}× Zoom`);
    } catch (error) {
      console.warn('Camera zoom constraint rejected:', error);
      const digital = Math.max(1, Math.min(3, requestedZoom));
      setZoomRange({ min: 1, max: 3, step: 0.1 });
      setZoomLevel(digital);
      setDigitalZoomActive(true);
      showToast(`${digital.toFixed(1)}× Zoom`);
    }
  };

  // Device Orientation (Artificial Horizon & Bearing)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) {
        setRollAngle(Math.round(e.gamma));
      }
    };
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, []);

  // Web Audio Shutter Sound
  const playShutterSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {}
  };

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  // Tap-to-focus ring
  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });
    setTimeout(() => setFocusPoint(null), 1200);
  };

  // Safe Shutter Action: Never crashes if stream is warming up or unavailable
  const handleShutterClick = () => {
    if (isCapturing) return;

    if (isTopOptionsOpen) setIsTopOptionsOpen(false);

    // If camera is not ready and no photo was imported, attempt to activate camera smoothly
    if (!cameraActive && !importedImage) {
      if (!cameraStarting) {
        showToast('Activating camera...');
        void startCamera();
      } else {
        showToast('Camera is starting up...');
      }
      return;
    }

    if (timerSeconds > 0) {
      let count = timerSeconds;
      setCountdown(count);
      playBeep();

      const timerInterval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
          playBeep();
        } else {
          clearInterval(timerInterval);
          setCountdown(null);
          void executeCapture();
        }
      }, 1000);
    } else {
      void executeCapture();
    }
  };

  const executeCapture = async () => {
    setIsCapturing(true);

    try {
      let sourceImage: HTMLVideoElement | HTMLImageElement | null = null;

      if (importedImage && importedImage.complete) {
        sourceImage = importedImage;
      } else if (cameraActive && videoRef.current) {
        // Allow a brief buffer if stream is rendering first frame
        if (videoRef.current.videoWidth === 0) {
          for (let i = 0; i < 6; i++) {
            await new Promise((resolve) => setTimeout(resolve, 80));
            if (videoRef.current && videoRef.current.videoWidth > 0) break;
          }
        }

        if (videoRef.current && videoRef.current.videoWidth > 0) {
          sourceImage = videoRef.current;
          if (digitalZoomActive && zoomLevel > 1) {
            const video = videoRef.current;
            const cropWidth = video.videoWidth / zoomLevel;
            const cropHeight = video.videoHeight / zoomLevel;
            const cropX = (video.videoWidth - cropWidth) / 2;
            const cropY = (video.videoHeight - cropHeight) / 2;
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = video.videoWidth;
            cropCanvas.height = video.videoHeight;
            const cropContext = cropCanvas.getContext('2d');
            if (cropContext) {
              cropContext.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropCanvas.width, cropCanvas.height);
              const cropped = new Image();
              cropped.src = cropCanvas.toDataURL('image/jpeg', 0.95);
              await new Promise<void>((resolve, reject) => {
                cropped.onload = () => resolve();
                cropped.onerror = () => reject(new Error('Zoom crop failed'));
              });
              sourceImage = cropped;
            }
          }
        }
      }

      // If still no valid source image, do not throw or crash
      if (!sourceImage) {
        showToast('Camera is preparing feed. Please tap again in a moment.');
        setIsCapturing(false);
        if (!cameraActive) void startCamera();
        return;
      }

      // Trigger flash effect and sound
      setFlashEffect(true);
      setTimeout(() => setFlashEffect(false), 180);
      playShutterSound();

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([40, 30, 60]);
        } catch (e) {}
      }

      // Keep the unstamped source so saved photos can be restamped later.
      // Use the cropped source when digital zoom is active, not the uncropped camera frame.
      const sourceWidth = sourceImage instanceof HTMLVideoElement ? sourceImage.videoWidth : sourceImage.naturalWidth;
      const sourceHeight = sourceImage instanceof HTMLVideoElement ? sourceImage.videoHeight : sourceImage.naturalHeight;
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = sourceWidth;
      sourceCanvas.height = sourceHeight;
      const sourceContext = sourceCanvas.getContext('2d');
      if (!sourceContext || sourceWidth <= 0 || sourceHeight <= 0) {
        throw new Error('Could not prepare original photo for editing');
      }
      sourceContext.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);
      const originalDataUrl = sourceCanvas.toDataURL('image/jpeg', 0.95);

      const result = await renderStampedPhoto({
        baseImage: sourceImage,
        location,
        template,
      });

      const existingFileNumbers = capturedPhotos
        .map((photo) => /^([0-9]+)\.jpg$/i.exec(photo.fileName)?.[1])
        .filter((number): number is string => Boolean(number))
        .map(Number);
      const nextFileNumber = Math.max(0, ...existingFileNumbers) + 1;

      const newPhoto: CapturedPhoto = {
        id: `photo_${Date.now()}`,
        dataUrl: result.dataUrl,
        originalDataUrl,
        thumbnailUrl: result.dataUrl,
        timestamp: Date.now(),
        locationData: { ...location },
        templateType: template,
        fileName: `${nextFileNumber}.jpg`,
      };

      onPhotoCaptured(newPhoto);
      showToast(`Saved ${newPhoto.fileName}`);

      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: any) {
      console.warn('Capture issue:', err);
      showToast('Could not complete capture. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Upload photo to stamp (Right button)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setImportedImage(img);
          setCameraActive(false);
          setCameraError(null);
          setIsTopOptionsOpen(false);
          showToast('Photo loaded ready to stamp');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const cycleFlash = () => {
    const next: Record<FlashMode, FlashMode> = {
      off: 'on',
      on: 'auto',
      auto: 'torch',
      torch: 'off',
    };
    const nextMode = next[flashMode];
    setFlashMode(nextMode);
    applyFlashMode(nextMode);
    showToast(`Flash: ${nextMode.toUpperCase()}`);
    resetAutoHideTimer();
  };

  const cycleRatio = () => {
    const next: Record<AspectRatio, AspectRatio> = {
      '3:4': '1:1',
      '1:1': '16:9',
      '16:9': 'full',
      full: '3:4',
    };
    const nextRatio = next[aspectRatio];
    setAspectRatio(nextRatio);
    showToast(`Ratio: ${nextRatio.toUpperCase()}`);
    resetAutoHideTimer();
  };

  const cycleTimer = () => {
    const options = [0, 3, 5, 10];
    const nextIdx = (options.indexOf(timerSeconds) + 1) % options.length;
    const nextSec = options[nextIdx];
    setTimerSeconds(nextSec);
    showToast(nextSec === 0 ? 'Timer: Off' : `Timer: ${nextSec}s`);
    resetAutoHideTimer();
  };

  const cycleGrid = () => {
    if (gridMode === 'rule_of_thirds') {
      setGridMode('crosshair');
      showToast('Grid: Crosshair');
    } else if (gridMode === 'crosshair') {
      setGridMode('none');
      showToast('Grid: Off');
    } else {
      setGridMode('rule_of_thirds');
      showToast('Grid: 3×3');
    }
    resetAutoHideTimer();
  };

  const cycleMapType = () => {
    const types: MapType[] = ['roadmap', 'satellite', 'terrain', 'hybrid'];
    const curIdx = types.indexOf(location.mapType || 'roadmap');
    const nextType = types[(curIdx + 1) % types.length];
    if (onUpdateLocation) {
      onUpdateLocation({ mapType: nextType });
    }
    showToast(`Map: ${nextType.toUpperCase()}`);
    resetAutoHideTimer();
  };

  const toggleUnits = () => {
    const nextUnits: Units = location.units === 'imperial' ? 'metric' : 'imperial';
    if (onUpdateLocation) {
      onUpdateLocation({ units: nextUnits });
    }
    showToast(`Units: ${nextUnits === 'imperial' ? 'Imperial' : 'Metric'}`);
    resetAutoHideTimer();
  };

  const ratio = aspectRatio;
  const ratioStyles: Record<AspectRatio, string> = {
    '3:4': 'aspect-[3/4] max-h-full max-w-full',
    '1:1': 'aspect-square max-h-full max-w-full',
    '16:9': 'aspect-[16/9] max-h-full max-w-full',
    full: 'h-full w-full',
  };

  const lastPhoto = capturedPhotos[0];

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden select-none">
      {/* 1. TOP PRO-CAMERA TOOLBAR (FLOATING OVER CAMERA FEED) */}
      <div className="absolute top-0 inset-x-0 z-40 w-full px-3 sm:px-5 pt-1.5 pb-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
        {/* Left: Menu & PWA */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMenu}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-zinc-100 backdrop-blur-xl transition-all border border-white/10 shadow-lg cursor-pointer"
            title="Menu"
            aria-label="Navigation Menu"
          >
            <Menu className="w-4.5 h-4.5 text-zinc-200" />
          </button>
          <PWAInstallButton variant="compact" />
        </div>

        {/* Center: Sleek Quick-Toggles & Pro Options Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Master Options Pill */}
          <button
            type="button"
            onClick={() => setIsTopOptionsOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer backdrop-blur-xl shadow-lg active:scale-95 ${
              isTopOptionsOpen
                ? 'bg-amber-400 text-black border-amber-300 ring-2 ring-amber-400/40 shadow-amber-400/20 font-bold'
                : 'bg-black/60 hover:bg-black/80 text-zinc-200 border-white/20 hover:border-amber-400/50'
            }`}
            title="Toggle Extended Options"
            aria-expanded={isTopOptionsOpen}
          >
            <SlidersHorizontal
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isTopOptionsOpen ? 'text-black rotate-90' : 'text-amber-400'
              }`}
            />
            <span className="text-xs font-semibold">Options</span>
            {isTopOptionsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-black" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>
        </div>

        {/* Right: Quick Lens Switcher (Flip Front/Rear) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              restartCameraAfterFacingChangeRef.current = cameraActive && !importedImage;
              setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
              showToast(facingMode === 'environment' ? 'Front Lens' : 'Rear Lens');
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 cursor-pointer flex items-center justify-center text-cyan-400 backdrop-blur-xl transition-all border border-cyan-500/30 shadow-lg"
            title="Flip Camera"
            aria-label="Switch Camera Lens"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* 2. PRO OPTIONS DRAWER (COLOR-CODED ICON-FIRST GRID) */}
        {isTopOptionsOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
              onClick={() => setIsTopOptionsOpen(false)}
              aria-hidden="true"
            />

            <div
              className="absolute top-full inset-x-0 mx-auto w-full max-w-xl px-3 sm:px-4 pt-2 pb-3 bg-zinc-950/95 backdrop-blur-2xl border-b border-white/15 shadow-2xl z-50 text-white flex flex-col gap-2 rounded-b-2xl"
              onMouseMove={resetAutoHideTimer}
              onTouchStart={resetAutoHideTimer}
            >
              {/* Header with Auto-Hide pin */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Camera Controls
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoHideEnabled((v) => !v)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 cursor-pointer ${
                      autoHideEnabled
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                        : 'bg-white/10 text-zinc-400 border-white/10'
                    }`}
                  >
                    {autoHideEnabled ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                        <span>{autoHideSecondsRemaining}s</span>
                      </>
                    ) : (
                      <>
                        <Pin className="w-3 h-3 text-cyan-400" />
                        <span>Pinned</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTopOptionsOpen(false)}
                    className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 cursor-pointer transition active:scale-90"
                    title="Close"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Group 1: Optics & Shooting (Amber / Emerald) */}
              <div className="grid grid-cols-4 gap-2">
                {/* Flash - Amber */}
                <button
                  type="button"
                  onClick={cycleFlash}
                  className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                    flashMode !== 'off'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                      : 'bg-zinc-900/90 text-zinc-300 border-white/10 hover:border-amber-400/30'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${flashMode !== 'off' ? 'text-amber-400 fill-current' : 'text-zinc-400'}`} />
                  <span className="text-[10px] font-semibold uppercase">{flashMode}</span>
                </button>

                {/* Aspect Ratio - Titanium */}
                <button
                  type="button"
                  onClick={cycleRatio}
                  className="py-2 px-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-zinc-200 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Maximize2 className="w-4 h-4 text-zinc-300" />
                  <span className="text-[10px] font-semibold uppercase">{aspectRatio}</span>
                </button>

                {/* Grid - Emerald */}
                <button
                  type="button"
                  onClick={cycleGrid}
                  className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                    gridMode !== 'none'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                      : 'bg-zinc-900/90 text-zinc-300 border-white/10 hover:border-emerald-400/30'
                  }`}
                >
                  {gridMode === 'crosshair' ? (
                    <Crosshair className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Grid className={`w-4 h-4 ${gridMode !== 'none' ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  )}
                  <span className="text-[10px] font-semibold uppercase">
                    {gridMode === 'rule_of_thirds' ? '3×3' : gridMode === 'crosshair' ? 'Cross' : 'Off'}
                  </span>
                </button>

                {/* Timer - Amber */}
                <button
                  type="button"
                  onClick={cycleTimer}
                  className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                    timerSeconds > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 font-bold'
                      : 'bg-zinc-900/90 text-zinc-300 border-white/10 hover:border-amber-400/30'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${timerSeconds > 0 ? 'text-amber-400' : 'text-zinc-400'}`} />
                  <span className="text-[10px] font-semibold uppercase">{timerSeconds === 0 ? 'Off' : `${timerSeconds}s`}</span>
                </button>
              </div>

              {/* Zoom presets moved into Options to keep the live camera preview clear */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-zinc-200">Camera Zoom</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1.0, 2.0, 3.0].map((level) => {
                    const active = Math.abs(zoomLevel - level) < 0.2;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          applyDeviceZoom(level);
                          resetAutoHideTimer();
                        }}
                        className={`min-w-10 h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-black shadow-md'
                            : 'bg-black/40 text-zinc-300 hover:bg-white/10 hover:text-white'
                        }`}
                        aria-label={`Set camera zoom to ${level.toFixed(0)}x`}
                      >
                        {level.toFixed(0)}×
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: Geotag & Studio Features (Violet / Blue / Emerald / Purple) */}
              <div className="grid grid-cols-4 gap-2">
                {/* Templates - Violet */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTopOptionsOpen(false);
                    onOpenTemplateSheet();
                  }}
                  className="p-2 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Layers className="w-4 h-4 text-violet-400" />
                  <span className="text-[10px] font-semibold truncate max-w-full">Templates</span>
                </button>

                {/* Search Place - Blue */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTopOptionsOpen(false);
                    onOpenMapPicker();
                  }}
                  className="p-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-semibold truncate max-w-full">Search</span>
                </button>

                {/* Map Layer - Emerald */}
                <button
                  type="button"
                  onClick={cycleMapType}
                  className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-semibold uppercase truncate max-w-full">
                    {location.mapType || 'Sat'}
                  </span>
                </button>

                {/* Units - Purple */}
                <button
                  type="button"
                  onClick={toggleUnits}
                  className="p-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Gauge className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-semibold uppercase truncate max-w-full">
                    {location.units === 'imperial' ? 'ft / °F' : 'm / °C'}
                  </span>
                </button>
              </div>

              {/* Group 3: Customizer & Settings (Rose / Slate) */}
              <div className="grid grid-cols-2 gap-2">
                {/* Stamp Customizer - Rose */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTopOptionsOpen(false);
                    onOpenCustomize();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 flex items-center justify-between text-rose-200 transition-all cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-semibold">Customize Stamp</span>
                  </div>
                  <span className="text-[10px] text-rose-300/80">Style</span>
                </button>

                {/* Stamp Settings & Formats - Slate */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTopOptionsOpen(false);
                    onOpenSettings();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 flex items-center justify-between text-zinc-200 transition-all cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs font-semibold">Formats & GPS</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Settings</span>
                </button>
              </div>

              {/* Group 4: Overlay Toggles (Emerald / Cyan / Amber) */}
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2.5">
                {/* Stamp Overlay Toggle (Full -> Mini -> Off) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!showStampPreview) {
                      setShowStampPreview(true);
                      setIsStampMinimized(false);
                      showToast('Stamp: Full Preview');
                    } else if (!isStampMinimized) {
                      setIsStampMinimized(true);
                      showToast('Stamp: Minimized (Wide View)');
                    } else {
                      setShowStampPreview(false);
                      showToast('Stamp: Hidden in View');
                    }
                    resetAutoHideTimer();
                  }}
                  className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    showStampPreview
                      ? isStampMinimized
                        ? 'bg-amber-500/15 text-amber-200 border-amber-400/40'
                        : 'bg-amber-500/25 text-amber-300 border-amber-400/60 shadow-sm'
                      : 'bg-zinc-900/80 text-zinc-400 border-white/10'
                  }`}
                  title={
                    !showStampPreview
                      ? 'Stamp hidden in preview (still stamped on capture)'
                      : isStampMinimized
                      ? 'Stamp minimized (compact chip)'
                      : 'Stamp full card preview'
                  }
                >
                  {showStampPreview ? (
                    isStampMinimized ? <Eye className="w-3.5 h-3.5 text-amber-300" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[10px] font-semibold">
                    {!showStampPreview ? 'Off' : isStampMinimized ? 'Mini' : 'Stamp'}
                  </span>
                </button>

                {/* Horizon Level Line Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setShowLevelLine((v) => !v);
                    resetAutoHideTimer();
                  }}
                  className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    showLevelLine
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-zinc-900/80 text-zinc-400 border-white/10'
                  }`}
                >
                  <Compass className={`w-3.5 h-3.5 ${showLevelLine ? 'text-emerald-400' : ''}`} />
                  <span className="text-[10px] font-semibold">Horizon</span>
                </button>

                {/* GPS Telemetry HUD Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setShowHUD((v) => !v);
                    resetAutoHideTimer();
                  }}
                  className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    showHUD
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                      : 'bg-zinc-900/80 text-zinc-400 border-white/10'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${showHUD ? 'text-cyan-400' : ''}`} />
                  <span className="text-[10px] font-semibold">HUD</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="absolute top-16 inset-x-0 mx-auto w-fit max-w-[85vw] z-50 pointer-events-none transition-all animate-bounce">
          <div className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 text-white text-xs font-semibold backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 2. VIEWFINDER SECTION (FULL BLEED TO MAXIMIZE VISIBLE SCREEN) */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden bg-black">
        <div
          onClick={handleViewfinderClick}
          onTouchStart={handleCameraTouchStart}
          onTouchMove={handleCameraTouchMove}
          onTouchEnd={handleCameraTouchEnd}
          onTouchCancel={handleCameraTouchEnd}
          className={`relative w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl overflow-hidden flex items-center justify-center transition-all duration-300 ${ratioStyles[ratio]}`}
          style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
        >
          {/* Always-mounted Video Stream */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive && !importedImage ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
            }`}
            style={{ transform: digitalZoomActive ? `scale(${zoomLevel})` : 'none', transformOrigin: 'center center' }}
          />

          {/* Uploaded / Imported Image Viewfinder Mode */}
          {importedImage && (
            <div className="absolute inset-0 w-full h-full z-15 flex items-center justify-center bg-black">
              <img
                src={importedImage.src}
                alt="Imported photo for stamping"
                className="w-full h-full object-cover"
              />
              {/* Photo Uploaded Floating Quick Banner */}
              <div className="absolute top-14 sm:top-16 inset-x-3 sm:inset-x-6 z-30 flex items-center justify-between p-2.5 rounded-2xl bg-black/80 backdrop-blur-md border border-amber-400/40 text-white shadow-2xl animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-200">Imported Photo Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-xs font-medium transition cursor-pointer active:scale-95"
                  >
                    Camera
                  </button>
                  <button
                    type="button"
                    onClick={handleShutterClick}
                    disabled={isCapturing}
                    className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition shadow cursor-pointer active:scale-95"
                  >
                    {isCapturing ? 'Saving...' : 'Save Stamp'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Minimalist Pro Camera Viewfinder Placeholder (when stream is initializing or permission needed) */}
          {!cameraActive && !importedImage && (
            <div className="absolute inset-0 w-full h-full bg-radial from-zinc-900 to-black flex flex-col items-center justify-center text-center p-6 z-10">
              <div className="relative z-10 bg-zinc-950/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 max-w-xs shadow-2xl flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Viewfinder Standby</h3>
                <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
                  {cameraError || 'Camera stream is ready to start.'}
                </p>
                <div className="flex gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95 transition"
                  >
                    Start Camera
                  </button>
                  <label className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-medium text-xs cursor-pointer flex items-center justify-center gap-1.5 transition active:scale-95">
                    <Upload className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Import</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* HUD: GPS Satellites & Signal Lock (Top-Left) */}
          {showHUD && (
            <div className="absolute top-14 left-3 sm:top-16 sm:left-4 z-20 pointer-events-none flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/30 text-white text-[10px] sm:text-xs font-semibold shadow">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">
                  {location.shortAddress === 'Waiting for GPS location' ? 'SEARCHING GPS' : 'GPS LOCKED'}
                </span>
                {location.showAccuracy && location.accuracy > 0 && (
                  <>
                    <span className="text-white/40">|</span>
                    <span className="font-mono text-[10px] text-emerald-200">±{location.accuracy}m</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* HUD: Compass Heading Azimuth (Top-Right) */}
          {showHUD && (
            <div className="absolute top-14 right-3 sm:top-16 sm:right-4 z-20 pointer-events-none">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-cyan-500/30 text-white text-[10px] sm:text-xs font-mono shadow">
                <Navigation
                  className="w-3 h-3 text-cyan-400 transition-transform duration-200"
                  style={{ transform: `rotate(${location.compassHeading || 0}deg)` }}
                />
                <span>
                  {String(Number.isFinite(location.compassHeading) ? location.compassHeading : 0).padStart(3, '0')}°
                </span>
                <span className="text-cyan-400 font-bold">{location.compassDirection || '—'}</span>
              </div>
            </div>
          )}

          {/* HUD: Center Level Line / Horizon */}
          {showLevelLine && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-75">
              <div
                className={`flex items-center transition-transform duration-100 ${
                  isLevel ? 'text-emerald-400' : 'text-white/40'
                }`}
                style={{ transform: `rotate(${rollAngle}deg)` }}
              >
                <div
                  className={`w-10 sm:w-14 h-0.5 ${
                    isLevel ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-white/40'
                  }`}
                />
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 mx-1 ${
                    isLevel ? 'border-emerald-400 bg-emerald-400/20 shadow-[0_0_8px_#34d399]' : 'border-white/40'
                  }`}
                />
                <div
                  className={`w-10 sm:w-14 h-0.5 ${
                    isLevel ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-white/40'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Tap Focus Ring */}
          {focusPoint && (
            <div
              className="absolute w-14 h-14 rounded-full border-2 border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-ping z-30"
              style={{ left: focusPoint.x, top: focusPoint.y }}
            />
          )}

          {/* Grid Overlay */}
          {gridMode === 'rule_of_thirds' && (
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
              <div className="border-r border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div />
            </div>
          )}

          {gridMode === 'crosshair' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-full h-[1px] bg-white/20" />
              <div className="absolute h-full w-[1px] bg-white/20" />
              <div className="w-16 h-16 rounded-full border border-white/30" />
            </div>
          )}

          {/* Flash Effect on Capture */}
          {flashEffect && <div className="absolute inset-0 bg-white z-40 pointer-events-none animate-fade-out" />}

          {/* Countdown Indicator */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 backdrop-blur-xs pointer-events-none">
              <span className="text-7xl font-black text-amber-400 drop-shadow-2xl font-mono">
                {countdown}
              </span>
            </div>
          )}

          {/* Live Stamp Overlay: Collapsible to maximize visible screen */}
          {showStampPreview && (
            <div
              className={`absolute inset-x-0 z-20 pointer-events-none overflow-visible transition-all duration-200 ${
                aspectRatio === 'full' ? 'bottom-24 sm:bottom-28' : 'bottom-0'
              }`}
            >
              {isStampMinimized ? (
                /* Compact Frosted Pill (Maximizes visible camera footage) */
                <div className="flex justify-center pointer-events-auto px-4 pb-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsStampMinimized(false);
                      showToast('Stamp: Full Preview');
                    }}
                    className="group px-3 py-1 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-xl border border-amber-400/40 hover:border-amber-400 text-white shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                    title="Tap to expand full stamp preview"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[11px] font-medium text-zinc-200 max-w-[190px] sm:max-w-xs truncate">
                      {location.shortAddress === 'Waiting for GPS location' ? 'GPS Active' : location.shortAddress}
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold bg-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>Show Stamp</span>
                    </span>
                  </button>
                </div>
              ) : (
                /* Full Live Stamp Card with Quick Minimize Button */
                <div className="relative pointer-events-auto">
                  {/* Quick-Minimize Pill on top of stamp card */}
                  <div className="flex justify-end px-3 -mb-1 relative z-30">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsStampMinimized(true);
                        showToast('Stamp Minimized (More Room)');
                      }}
                      className="px-2 py-0.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 text-zinc-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 shadow-lg cursor-pointer active:scale-95 transition"
                      title="Minimize stamp preview for full-screen view"
                    >
                      <EyeOff className="w-3 h-3 text-amber-400" />
                      <span>Minimize</span>
                    </button>
                  </div>

                  <div
                    style={{
                      width: '122%',
                      marginLeft: '-11%',
                      transform: 'scale(0.82)',
                      transformOrigin: 'bottom center',
                    }}
                  >
                    <TemplateCard
                      location={location}
                      template={template}
                      className="rounded-none border-x-0 border-b-0"
                      onOpenMapPicker={onOpenMapPicker}
                      onOpenEditLocation={onOpenEditLocation}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM CONTROLS & ZOOM (FLOATING OVER CAMERA FEED TO MAXIMIZE VISIBLE SCREEN) */}
      <div className="absolute bottom-0 inset-x-0 z-30 pointer-events-none flex flex-col items-center">
        {/* 4. BOTTOM CONTROLS DOCK: LEFT = RECENT | CENTER = SHUTTER BUTTON | RIGHT = IMPORT */}
        <div className="pointer-events-auto w-full pb-2 sm:pb-3 pt-2 px-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between max-w-md sm:max-w-xl mx-auto">
          {/* LEFT: RECENT CLICKED IMAGE */}
          <div className="flex flex-col items-center gap-1 w-16">
            {lastPhoto ? (
              <button
                onClick={() => onOpenPhotoViewer(lastPhoto)}
                className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/60 hover:border-amber-400 shadow-xl active:scale-95 transition-all cursor-pointer group bg-zinc-900"
                title="Recent Captured Photo"
                aria-label="View Last Photo"
              >
                <img
                  src={lastPhoto.thumbnailUrl}
                  alt="Recent Photo"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-bold text-center py-0.5 text-zinc-200">
                  {capturedPhotos.length}
                </span>
              </button>
            ) : (
              <div
                className="w-14 h-14 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col items-center justify-center text-zinc-500 shadow-md"
                title="No Photos Yet"
              >
                <ImageIcon className="w-5 h-5 opacity-40" />
              </div>
            )}
          </div>

          {/* CENTER: THE TACTILE PRO SHUTTER BUTTON */}
          <button
            onClick={handleShutterClick}
            disabled={isCapturing}
            className="relative w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center focus:outline-none group active:scale-90 transition-transform cursor-pointer shadow-2xl"
            title={cameraActive || importedImage ? 'Capture Stamped Photo' : 'Activate Camera'}
            aria-label="Shutter Button"
          >
            {/* Outer titanium brushed ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white/90 group-hover:border-amber-400 group-hover:shadow-[0_0_20px_#f59e0b] transition-all bg-black/40 backdrop-blur-md" />
            
            {/* Inner tactile button with status animation */}
            <div
              className={`w-[3.25rem] h-[3.25rem] rounded-full flex items-center justify-center transition-all duration-150 shadow-inner ${
                isCapturing
                  ? 'scale-75 bg-red-500 animate-pulse'
                  : cameraActive || importedImage
                  ? 'bg-white group-hover:bg-amber-400'
                  : 'bg-zinc-800 border border-white/20'
              }`}
            >
              {!cameraActive && !importedImage && (
                <Camera className="w-6 h-6 text-cyan-400 animate-pulse" />
              )}
            </div>
          </button>

          {/* RIGHT: IMPORT PHOTO BUTTON */}
          <div className="flex flex-col items-center gap-1 w-16">
            <label
              className="w-14 h-14 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border-2 border-cyan-400/40 hover:border-cyan-400 flex flex-col items-center justify-center text-cyan-400 cursor-pointer active:scale-95 transition-all shadow-xl group"
              title="Import Photo to Stamp"
              aria-label="Import Photo"
            >
              <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
