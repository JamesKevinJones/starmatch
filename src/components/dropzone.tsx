'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, ImageUp, Upload } from 'lucide-react';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * File intake (Kokonut-style dropzone), with a webcam path alongside it.
 *
 * Deliberately never reads the file into anything but an object URL - the
 * matcher decodes it in-page and nothing is transmitted.
 */
export function Dropzone({
  onFile,
  onWebcam,
  disabled,
}: {
  onFile: (file: File) => void;
  onWebcam: () => void;
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!ACCEPT.split(',').includes(file.type)) {
        setError('That file type is not supported. Use JPEG, PNG or WebP.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError('That image is over 20MB. Try a smaller one.');
        return;
      }
      setError(null);
      onFile(file);
    },
    [onFile],
  );

  return (
    <div>
      <motion.div
        animate={{
          backgroundColor: over ? 'var(--color-acid)' : 'var(--panel)',
          rotate: over ? -0.6 : 0,
        }}
        transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) accept(e.dataTransfer.files?.[0]);
        }}
        className="brut relative px-6 py-14 text-center"
      >
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => accept(e.target.files?.[0] ?? undefined)}
        />

        <ImageUp size={44} className="mx-auto" aria-hidden />
        <p className="mt-5 font-display text-2xl font-800">Drop a photo here</p>
        <p className="mt-2 text-sm opacity-75">
          Front-facing, one clear face. JPEG, PNG or WebP, up to 20MB.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            className="brut-sm brut-press inline-flex items-center gap-2 bg-volt px-5 py-3 font-display font-800 text-white disabled:opacity-50"
          >
            <Upload size={17} aria-hidden /> Choose file
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onWebcam}
            className="brut-sm brut-press inline-flex items-center gap-2 px-5 py-3 font-display font-800 disabled:opacity-50"
          >
            <Camera size={17} aria-hidden /> Use webcam
          </button>
        </div>

        <p className="label mt-7 opacity-60">Your photo stays on this device</p>
      </motion.div>

      {error && (
        <p role="alert" className="brut-sm mt-4 bg-coral px-4 py-3 text-sm text-white">
          {error}
        </p>
      )}
    </div>
  );
}
