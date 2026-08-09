'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

/**
 * Webcam capture path.
 *
 * The stream is torn down as soon as a frame is grabbed or the user backs out -
 * leaving a camera light on after the user is done is the kind of detail that
 * destroys trust in a face app.
 */
export function WebcamCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (canvas: HTMLCanvasElement) => void;
  onCancel: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      })
      .catch(() => setError('Could not access the camera. Check browser permissions.'));

    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, []);

  const shoot = () => {
    const v = video.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d')!;
    // Un-mirror: the preview is flipped for comfort, the capture must not be.
    ctx.drawImage(v, 0, 0);
    stream.current?.getTracks().forEach((t) => t.stop());
    onCapture(canvas);
  };

  if (error) {
    return (
      <div className="brut bg-coral p-8 text-white">
        <p className="font-display text-2xl font-900">Camera unavailable</p>
        <p className="mt-2">{error}</p>
        <button onClick={onCancel} className="brut-sm brut-press mt-5 bg-white px-5 py-2.5 font-display font-800 text-ink">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="brut overflow-hidden">
      <video
        ref={video}
        playsInline
        muted
        className="aspect-video w-full scale-x-[-1] bg-black object-cover"
      />
      <div className="flex flex-wrap gap-3 border-t-[3px] p-4">
        <button onClick={shoot} className="brut-sm brut-press inline-flex items-center gap-2 bg-volt px-6 py-3 font-display font-800 text-white">
          <Camera size={18} aria-hidden /> Capture
        </button>
        <button onClick={onCancel} className="brut-sm brut-press inline-flex items-center gap-2 px-6 py-3 font-display font-800">
          <X size={18} aria-hidden /> Cancel
        </button>
        <p className="label ml-auto self-center opacity-60">Frames never leave this tab</p>
      </div>
    </div>
  );
}
