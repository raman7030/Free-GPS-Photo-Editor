import React, { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Media } from '@capacitor-community/media';
import { CapturedPhoto } from '../types/gps';
import {
  X,
  Download,
  Share2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  SlidersHorizontal,
} from 'lucide-react';
import { formatCoordinates } from '../utils/geo';

interface ViewPhotoModalProps {
  photo: CapturedPhoto | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  photosList?: CapturedPhoto[];
  onSelectPhotoIndex?: (index: number) => void;
  currentIndex?: number;
  onEditStamp?: (photo: CapturedPhoto) => void;
}

export const ViewPhotoModal: React.FC<ViewPhotoModalProps> = ({
  photo,
  onClose,
  onDelete,
  photosList = [],
  onSelectPhotoIndex,
  currentIndex = 0,
  onEditStamp,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchOrigin = useRef<{ distance: number; zoom: number } | null>(null);

  const clampZoom = (value: number) => Math.max(1, Math.min(5, value));
  const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    pointers.current.clear();
    dragOrigin.current = null;
    pinchOrigin.current = null;
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture may be unavailable on some browsers */ }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      dragOrigin.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      pinchOrigin.current = null;
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      pinchOrigin.current = { distance: distanceBetween(pts[0], pts[1]), zoom };
      dragOrigin.current = null;
    }
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      const pts = Array.from(pointers.current.values());
      const distance = distanceBetween(pts[0], pts[1]);
      if (pinchOrigin.current && pinchOrigin.current.distance > 0) {
        setZoom(clampZoom(pinchOrigin.current.zoom * distance / pinchOrigin.current.distance));
      }
      return;
    }
    if (dragOrigin.current && zoom > 1) {
      setPan({
        x: dragOrigin.current.panX + event.clientX - dragOrigin.current.x,
        y: dragOrigin.current.panY + event.clientY - dragOrigin.current.y,
      });
    }
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchOrigin.current = null;
    if (pointers.current.size === 1) {
      const remaining = Array.from(pointers.current.values())[0];
      dragOrigin.current = { x: remaining.x, y: remaining.y, panX: pan.x, panY: pan.y };
    } else {
      dragOrigin.current = null;
    }
  };
  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((value) => clampZoom(value + (event.deltaY < 0 ? 0.2 : -0.2)));
  };
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!photo) return null;

  const getPhotoBlob = async (): Promise<Blob> => {
    const source = photo.dataUrl;
    if (source.startsWith('data:')) {
      const response = await fetch(source);
      return response.blob();
    }
    if (source.startsWith('blob:') || /^https?:\/\//i.test(source)) {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Could not read photo (HTTP ${response.status})`);
      return response.blob();
    }
    // App-bundled relative paths and file URLs are handled by fetch in WebView.
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Could not read photo (HTTP ${response.status})`);
    return response.blob();
  };

  const getBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not prepare image file'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Invalid image data'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });

  const getGalleryAlbumIdentifier = async (): Promise<string> => {
    const albumName = 'GPS Map Camera';
    const existing = await Media.getAlbums();
    const album = existing.albums.find((item) => item.name === albumName);
    if (album?.identifier) return album.identifier;
    await Media.createAlbum({ name: albumName });
    const refreshed = await Media.getAlbums();
    const created = refreshed.albums.find((item) => item.name === albumName);
    if (!created?.identifier) throw new Error('Could not create the GPS Map Camera gallery album');
    return created.identifier;
  };

  const handleDownload = async () => {
    const fileName = (photo.fileName || `GPS_Map_Camera_${Date.now()}.jpg`).replace(/\\.[^.]+$/, '');
    try {
      if (Capacitor.isNativePlatform()) {
        // MediaStore-backed save makes the photo visible in the device Gallery/Photos app.
        const albumIdentifier = await getGalleryAlbumIdentifier();
        await Media.savePhoto({
          path: photo.dataUrl,
          fileName,
          albumIdentifier,
        });
        window.alert('Photo saved to Gallery in the GPS Map Camera album.');
        return;
      }

      const blob = await getPhotoBlob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = photo.fileName || `GPS_Map_Camera_${Date.now()}.jpg`;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      console.error('Photo download/gallery save failed:', error);
      if (Capacitor.isNativePlatform()) {
        window.alert('Could not save the photo to Gallery. Please try again.');
        return;
      }
      // Browser fallback for data URLs and older WebViews.
      const fallbackLink = document.createElement('a');
      fallbackLink.href = photo.dataUrl;
      fallbackLink.download = photo.fileName || `GPS_Map_Camera_${Date.now()}.jpg`;
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      fallbackLink.remove();
    }
  };

  const handleShare = async () => {
    const filename = photo.fileName || `GPS_Map_Camera_${Date.now()}.jpg`;
    try {
      const blob = await getPhotoBlob();
      const mimeType = blob.type || 'image/jpeg';

      if (Capacitor.isNativePlatform()) {
        // Android WebView does not consistently expose navigator.share. Share a real cache file
        // through the native Sharesheet so messaging and social apps receive the actual image.
        const base64 = await getBase64(blob);
        const saved = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });
        await Share.share({
          title: `GPS Geotagged Photo - ${photo.locationData.shortAddress}`,
          text: `Captured at ${photo.locationData.fullAddress} (${formatCoordinates(photo.locationData.latitude, photo.locationData.longitude)})`,
          files: [saved.uri],
          dialogTitle: 'Share photo',
        });
        return;
      }

      const file = new File([blob], filename, { type: mimeType });
      const shareData: ShareData = {
        title: `GPS Geotagged Photo - ${photo.locationData.shortAddress}`,
        text: `Captured at ${photo.locationData.fullAddress} (${formatCoordinates(photo.locationData.latitude, photo.locationData.longitude)})`,
        files: [file],
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share(shareData);
        return;
      }
      await handleDownload();
    } catch (error) {
      // A cancelled native sharesheet is not a failure and should not trigger a download.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Photo share failed:', error);
      if (!Capacitor.isNativePlatform()) await handleDownload();
      else window.alert('Could not open the share sheet. Please try again.');
    }
  };

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${photo.locationData.latitude},${photo.locationData.longitude}`;
    window.open(url, '_blank');
  };

  const handlePrev = () => {
    if (onSelectPhotoIndex && currentIndex > 0) {
      onSelectPhotoIndex(currentIndex - 1);
      resetView();
    }
  };

  const handleNext = () => {
    if (onSelectPhotoIndex && currentIndex < photosList.length - 1) {
      onSelectPhotoIndex(currentIndex + 1);
      setZoom(1);
      setRotation(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white animate-fade-in select-none">
      {/* Top Controls Bar */}
      <div className="p-3 sm:p-4 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs sm:text-sm font-bold text-white block truncate max-w-[180px] xs:max-w-[240px] sm:max-w-md">
              {currentIndex + 1}
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onEditStamp && photo?.originalDataUrl && (
            <button
              onClick={() => onEditStamp(photo)}
              className="h-8 sm:h-9 px-2 rounded-full bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 flex items-center gap-1.5 border border-sky-400/30"
              title="Edit stamp and apply changes to this saved photo"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Edit stamp</span>
            </button>
          )}
          <button
            onClick={() => setZoom((z) => clampZoom(z + 0.5))}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-300 transition-all cursor-pointer border border-white/10"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <button
            onClick={() => setZoom((z) => clampZoom(z - 0.5))}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-300 transition-all cursor-pointer border border-white/10"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <button
            onClick={() => { setRotation((r) => (r + 90) % 360); setPan({ x: 0, y: 0 }); }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-300 transition-all cursor-pointer border border-white/10"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <button
            onClick={handleShare}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-sky-400 transition-all cursor-pointer border border-white/10"
            title="Share"
          >
            <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <button
            onClick={handleDownload}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-sky-500 hover:bg-sky-400 active:scale-90 flex items-center justify-center text-white shadow-md shadow-sky-500/30 transition-all cursor-pointer"
            title="Download Full Resolution"
          >
            <Download className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-red-950/80 active:scale-90 text-neutral-400 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title="Delete Photo"
          >
            <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* Only the photo is transformed; toolbar and action buttons remain fixed. */}
      <div
        className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden p-2 bg-neutral-950"
        onPointerDown={(event) => { event.stopPropagation(); handlePointerDown(event); }}
        onPointerMove={(event) => { event.stopPropagation(); handlePointerMove(event); }}
        onPointerUp={(event) => { event.stopPropagation(); handlePointerUp(event); }}
        onPointerCancel={(event) => { event.stopPropagation(); handlePointerUp(event); }}
        onWheel={(event) => { event.stopPropagation(); handleWheel(event); }}
        style={{ touchAction: 'none', cursor: zoom > 1 ? 'grab' : 'default', overscrollBehavior: 'contain' }}
      >
        <img
          src={photo.dataUrl}
          alt={photo.fileName}
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          className="block rounded-lg shadow-2xl"
          style={{
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            willChange: 'transform',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />

        {/* Carousel Prev/Next Buttons */}
        {photosList.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center shadow-lg transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {currentIndex < photosList.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center shadow-lg transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Delete Stamped Photo?</h3>
            <p className="text-xs text-neutral-400 mb-4">
              This will permanently remove this photo from your app gallery.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(photo.id);
                  setShowDeleteConfirm(false);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
