import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, RotateCcw, Crop } from 'lucide-react';

/**
 * ImageCropper — A lightweight, zero-dependency image cropper modal.
 *
 * Props:
 *   imageSrc   {string}   – Data URL of the raw image to crop
 *   onCrop     {Function} – Called with (croppedFile, croppedDataUrl) after user confirms
 *   onCancel   {Function} – Called when user dismisses without cropping
 *   accentColor {string}  – Tailwind color class prefix used by the parent page (default 'emerald')
 */
const ImageCropper = ({ imageSrc, onCrop, onCancel, accentColor = 'emerald' }) => {
    const canvasRef = useRef(null);
    const imgRef = useRef(new Image());
    const dragStart = useRef(null);

    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    const CANVAS_SIZE = 320; // The visible square canvas
    const CROP_SIZE = 280;   // The actual crop region (centered)

    // Load image
    useEffect(() => {
        const img = imgRef.current;
        img.onload = () => {
            setImgLoaded(true);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
        };
        img.src = imageSrc;
    }, [imageSrc]);

    // Draw onto canvas whenever zoom/offset changes
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imgLoaded) return;
        const ctx = canvas.getContext('2d');
        const img = imgRef.current;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Scaled image dimensions
        const scale = zoom;
        const iw = img.naturalWidth * scale;
        const ih = img.naturalHeight * scale;

        // Draw image centered + offset
        const x = (CANVAS_SIZE - iw) / 2 + offset.x;
        const y = (CANVAS_SIZE - ih) / 2 + offset.y;

        ctx.drawImage(img, x, y, iw, ih);

        // Draw overlay (dark mask outside crop circle)
        const cx = CANVAS_SIZE / 2;
        const cy = CANVAS_SIZE / 2;
        const r = CROP_SIZE / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw circle border
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }, [zoom, offset, imgLoaded]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Drag handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    };
    const handleMouseMove = (e) => {
        if (!isDragging || !dragStart.current) return;
        setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const handleMouseUp = () => { setIsDragging(false); dragStart.current = null; };

    // Touch handlers
    const handleTouchStart = (e) => {
        const t = e.touches[0];
        setIsDragging(true);
        dragStart.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
    };
    const handleTouchMove = (e) => {
        if (!isDragging || !dragStart.current) return;
        const t = e.touches[0];
        setOffset({ x: t.clientX - dragStart.current.x, y: t.clientY - dragStart.current.y });
    };

    // Confirm crop — render the crop region to a new canvas
    const handleConfirm = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;

        const cropCanvas = document.createElement('canvas');
        const outputSize = 400; // output resolution
        cropCanvas.width = outputSize;
        cropCanvas.height = outputSize;
        const ctx = cropCanvas.getContext('2d');

        const scale = zoom;
        const iw = img.naturalWidth * scale;
        const ih = img.naturalHeight * scale;
        const imgX = (CANVAS_SIZE - iw) / 2 + offset.x;
        const imgY = (CANVAS_SIZE - ih) / 2 + offset.y;

        // The crop circle starts at (CANVAS_SIZE - CROP_SIZE) / 2 on each axis
        const cropLeft = (CANVAS_SIZE - CROP_SIZE) / 2;
        const cropTop = (CANVAS_SIZE - CROP_SIZE) / 2;

        // Source region within the scaled image
        const srcX = (cropLeft - imgX) / scale;
        const srcY = (cropTop - imgY) / scale;
        const srcW = CROP_SIZE / scale;
        const srcH = CROP_SIZE / scale;

        // Draw cropped circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize);
        ctx.restore();

        cropCanvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], 'profile_photo.jpg', { type: 'image/jpeg' });
            const dataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);
            onCrop(file, dataUrl);
        }, 'image/jpeg', 0.92);
    };

    const handleReset = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <Crop className="w-5 h-5 text-gray-600" />
                        <h2 className="font-bold text-gray-900 text-lg">Crop Your Photo</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Canvas area */}
                <div className="flex flex-col items-center px-6 py-5 gap-4 bg-gray-900">
                    <p className="text-gray-400 text-xs">Drag to reposition · Use slider to zoom</p>
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        className="rounded-2xl cursor-grab active:cursor-grabbing"
                        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleMouseUp}
                    />
                </div>

                {/* Zoom slider */}
                <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
                    <ZoomOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.01"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-emerald-600 h-1.5 cursor-pointer"
                    />
                    <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500 w-10 text-right">{Math.round(zoom * 100)}%</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 py-4">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Check className="w-4 h-4" />
                        Use Photo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
