import React from 'react';
import { CapturedPhoto } from '../types/gps';
import { Camera, Image as ImageIcon, Trash2, Download, ExternalLink, ArrowLeft } from 'lucide-react';
import { formatDate, formatTime } from '../utils/geo';

interface GalleryViewProps {
  photos: CapturedPhoto[];
  onSelectPhoto: (photo: CapturedPhoto) => void;
  onDeletePhoto: (id: string) => void;
  onBackToCamera: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  photos,
  onSelectPhoto,
  onDeletePhoto,
  onBackToCamera,
}) => {
  return (
    <div className="w-full h-full flex flex-col bg-neutral-950 text-white select-none">
      {/* Top Header */}
      <div className="p-3.5 sm:p-5 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <button
            onClick={onBackToCamera}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer border border-white/10"
            title="Back to Camera"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">My Geotagged Gallery</h2>
            <p className="text-[11px] sm:text-xs text-neutral-400">{photos.length} Stamped Photos</p>
          </div>
        </div>

        <button
          onClick={onBackToCamera}
          className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/25 cursor-pointer"
        >
          <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span>Camera</span>
        </button>
      </div>

      {/* Grid or Empty State */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {photos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 mb-3 sm:mb-4">
              <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-1">No Photos Captured Yet</h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xs mb-4 sm:mb-5">
              Take photos with live GPS stamps or import existing pictures to geotag them!
            </p>
            <button
              onClick={onBackToCamera}
              className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-sky-500/25 flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Open GPS Camera</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 max-w-7xl mx-auto">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo)}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-sky-500 cursor-pointer shadow-md transition-all hover:scale-[1.02]"
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.fileName}
                  className="w-full h-full object-cover"
                />

                {/* Dark gradient overlay at bottom with location & date */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col justify-end text-left">
                  <span className="text-[11px] font-bold text-white truncate drop-shadow">
                    {index + 1}
                  </span>
                  <div className="flex items-center justify-between text-[9px] text-neutral-300 mt-0.5">
                    <span>
                      {formatDate(photo.locationData.dateTime, photo.locationData.dateFormat)}
                    </span>
                    <span className="capitalize px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-300 font-semibold text-[8px]">
                      {photo.templateType.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Hover Delete Action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this photo?')) {
                      onDeletePhoto(photo.id);
                    }
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white/80 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
