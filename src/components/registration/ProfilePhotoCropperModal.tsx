import React, { useEffect, useRef, useState } from "react";
import GradientContainer from "../common/GradientContainer";

interface ProfilePhotoCropperModalProps {
  file: File | null;
  isOpen: boolean;
  onCancel: () => void;
  onSave: (croppedFile: File) => void;
}

// Very lightweight square cropper: fixed aspect ratio with zoom and position sliders.
const ProfilePhotoCropperModal: React.FC<ProfilePhotoCropperModalProps> = ({ file, isOpen, onCancel, onSave }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    
    // Reset scale and offsets when new file is loaded
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!isOpen || !file || !imageUrl) return null;

  const clampOffset = (value: number) => Math.max(-50, Math.min(50, value));

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    lastPointRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !lastPointRef.current) return;
    e.preventDefault();
    const dx = e.clientX - lastPointRef.current.x;
    const dy = e.clientY - lastPointRef.current.y;
    // Adjust sensitivity so small mouse moves give nice control
    const factor = 0.3;
    setOffsetX((prev) => clampOffset(prev + dx * factor));
    setOffsetY((prev) => clampOffset(prev + dy * factor));
    lastPointRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    lastPointRef.current = null;
  };

  const handleSave = async () => {
    const img = imgRef.current;
    if (!img) return;

    const size = 400; // square crop size in px
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Clear canvas and fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Create a temporary canvas to render the exact same as the CSS
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Calculate display dimensions (CSS: height: 100%, width: auto)
    const displayHeight = size;
    const aspectRatio = naturalWidth / naturalHeight;
    const displayWidth = displayHeight * aspectRatio;

    // Apply the exact same transforms as CSS
    tempCtx.save();
    tempCtx.translate(size / 2, size / 2);
    tempCtx.translate((offsetX / 100) * displayWidth, (offsetY / 100) * displayHeight);
    tempCtx.scale(scale, scale);
    tempCtx.drawImage(img, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
    tempCtx.restore();

    // Draw the result to the main canvas
    ctx.drawImage(tempCanvas, 0, 0);

    // Create circular mask
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = size;
    maskCanvas.height = size;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    // Draw circular mask
    maskCtx.fillStyle = '#ffffff';
    maskCtx.beginPath();
    maskCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    maskCtx.fill();

    // Apply the mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], file.name, { type: file.type || "image/jpeg" });
      onSave(croppedFile);
    }, file.type || "image/jpeg", 0.95);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <GradientContainer>
        <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] rounded-xl p-4 md:p-6 w-full max-w-lg shadow-xl border border-gray-700 text-white">
        <h2 className="text-lg font-semibold text-white mb-3">Crop profile photo</h2>
        <p className="text-xs text-gray-400 mb-4">Adjust zoom and position so your face fits nicely in the circle preview.</p>

        <div className="flex flex-col items-center gap-4">
          {/* Crop area - circular like WhatsApp */}
          <div className="flex items-center justify-center">
            <div
              className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-black/70 border-2 border-orange-500 overflow-hidden relative flex items-center justify-center cursor-move"
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                className="select-none pointer-events-none"
                style={{
                  width: "auto",
                  height: "100%",
                  transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale})`,
                  transformOrigin: "center center",
                }}
              />
              <div className="absolute inset-0 rounded-full ring-2 ring-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Simple zoom controls */}
          <div className="flex items-center gap-4 mt-1">
            <button
              type="button"
              onClick={() => setScale((prev) => Math.max(1, +(prev - 0.2).toFixed(2)))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white text-lg"
            >
              -
            </button>
            <span className="text-xs text-gray-300">Zoom</span>
            <button
              type="button"
              onClick={() => setScale((prev) => Math.min(3, +(prev + 0.2).toFixed(2)))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white text-lg"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-sm text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-[#D85D27] hover:bg-orange-700 text-sm text-white"
          >
            Save crop
          </button>
        </div>
        </div>
      </GradientContainer>
    </div>
  );
};

export default ProfilePhotoCropperModal;
