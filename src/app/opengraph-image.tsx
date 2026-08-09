import { ImageResponse } from 'next/og';

export const alt = 'StarMatch — in-browser celebrity look-alike matching';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Brutalist OG card, generated at build time so social previews stay on-brand. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f4f1ea',
          color: '#0b0b0b',
          padding: 64,
          border: '16px solid #0b0b0b',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#ddf247', border: '6px solid #0b0b0b', padding: '6px 18px', fontSize: 40, fontWeight: 900 }}>
            STAR
          </div>
          <div style={{ fontSize: 40, fontWeight: 900 }}>MATCH</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 104, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>
            WHICH FACE
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: '#0b0b0b', color: '#f4f1ea', fontSize: 104, fontWeight: 900, lineHeight: 1.1, letterSpacing: -3, padding: '0 18px' }}>
              IS YOURS
            </div>
            <div style={{ color: '#ff5c4d', fontSize: 104, fontWeight: 900 }}>?</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: 24 }}>
          {['366 public figures', '128 dimensions', '0 photos uploaded'].map((t) => (
            <div key={t} style={{ border: '5px solid #0b0b0b', padding: '10px 20px', background: '#fff' }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
