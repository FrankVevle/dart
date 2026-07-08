'use client';

import { useRef, useState } from 'react';
import type { DartThrow } from '@/lib/DartsMatchEngine';
import { pixelToThrow, calibrationRadiusPx, type BoardCalibration } from '@/lib/dartboardGeometry';
import { detectChangedBlobs } from '@/lib/dartDetection';

const WORKING_SIZE = 480;

type Marker = { id: number; x: number; y: number; throwResult: DartThrow | null };
type CalibrationStage = 'none' | 'awaiting-center' | 'awaiting-top';
type ScoringMode = 'auto' | 'manual';

function formatThrow(t: DartThrow | null): string {
  if (!t) return 'Utenfor';
  if (t.segment === 25) return t.multiplier === 2 ? 'BULLSEYE' : 'BULL';
  const prefix = t.multiplier === 3 ? 'T' : t.multiplier === 2 ? 'D' : 'S';
  return `${prefix}${t.segment}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Kunne ikke laste bildet'));
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Draws an image onto a WORKING_SIZE x WORKING_SIZE canvas using "contain" (letterboxed) fit,
// so two photos taken from the same fixed camera position land in the same pixel space.
function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, WORKING_SIZE, WORKING_SIZE);
  const scale = Math.min(WORKING_SIZE / img.width, WORKING_SIZE / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (WORKING_SIZE - w) / 2, (WORKING_SIZE - h) / 2, w, h);
}

export function CameraScoring({ onConfirmThrows }: { onConfirmThrows: (throws: DartThrow[]) => void }) {
  const calibrationCanvasRef = useRef<HTMLCanvasElement>(null);
  const reviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const referenceImageDataRef = useRef<ImageData | null>(null);
  const nextMarkerId = useRef(0);

  const [calibration, setCalibration] = useState<BoardCalibration | null>(null);
  const [calibrationStage, setCalibrationStage] = useState<CalibrationStage>('none');
  const [mode, setMode] = useState<ScoringMode>('auto');
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleReferenceFile(input: HTMLInputElement, file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const img = await loadImage(dataUrl);
      const canvas = calibrationCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      drawContain(ctx, img);
      referenceImageDataRef.current = ctx.getImageData(0, 0, WORKING_SIZE, WORKING_SIZE);
      setCalibration(null);
      setReviewPhoto(null);
      setMarkers([]);
      setCalibrationStage('awaiting-center');
    } catch {
      setError('Kunne ikke lese bildet. Prøv igjen.');
    } finally {
      input.value = '';
      setBusy(false);
    }
  }

  function handleCalibrationClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (calibrationStage === 'none') return;
    const canvas = calibrationCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WORKING_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * WORKING_SIZE;

    if (calibrationStage === 'awaiting-center') {
      setCalibration({ centerX: x, centerY: y, topX: x, topY: y - 1 });
      setCalibrationStage('awaiting-top');
    } else {
      setCalibration(prev => (prev ? { ...prev, topX: x, topY: y } : prev));
      setCalibrationStage('none');
    }
  }

  function resetCalibration() {
    setCalibration(null);
    setCalibrationStage('none');
    setReviewPhoto(null);
    setMarkers([]);
    referenceImageDataRef.current = null;
  }

  async function handleThrowPhotoFile(input: HTMLInputElement, file: File | undefined) {
    if (!file || !calibration) return;
    if (mode === 'auto' && !referenceImageDataRef.current) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const img = await loadImage(dataUrl);
      const canvas = reviewCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      drawContain(ctx, img);

      if (mode === 'auto' && referenceImageDataRef.current) {
        const photoData = ctx.getImageData(0, 0, WORKING_SIZE, WORKING_SIZE);
        const blobs = detectChangedBlobs(referenceImageDataRef.current, photoData, {
          x: calibration.centerX,
          y: calibration.centerY
        });
        setMarkers(
          blobs.map(b => ({
            id: nextMarkerId.current++,
            x: b.x,
            y: b.y,
            throwResult: pixelToThrow(b.x, b.y, calibration)
          }))
        );
      } else {
        // Manual mode: no detection, just start from a blank slate and let the user tap each dart.
        setMarkers([]);
      }
      setReviewPhoto(dataUrl);
    } catch {
      setError('Kunne ikke lese bildet. Prøv igjen.');
    } finally {
      input.value = '';
      setBusy(false);
    }
  }

  function handleReviewClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!calibration || markers.length >= 3) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WORKING_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * WORKING_SIZE;
    setMarkers(prev => [...prev, { id: nextMarkerId.current++, x, y, throwResult: pixelToThrow(x, y, calibration) }]);
  }

  function removeMarker(id: number) {
    setMarkers(prev => prev.filter(m => m.id !== id));
  }

  function confirmThrows() {
    const throwsToApply = markers.map(m => m.throwResult).filter((t): t is DartThrow => t !== null);
    onConfirmThrows(throwsToApply);
    setReviewPhoto(null);
    setMarkers([]);
  }

  function discardPhoto() {
    setReviewPhoto(null);
    setMarkers([]);
  }

  const isCalibrated = calibration !== null && calibrationStage === 'none';

  return (
    <div className="camera-scoring">
      {error && <div className="status-banner bust">{error}</div>}

      {/* Kept mounted (but hidden) so getContext/getImageData always have a live canvas to use. */}
      <canvas ref={reviewCanvasRef} width={WORKING_SIZE} height={WORKING_SIZE} style={{ display: 'none' }} />

      {!isCalibrated && (
        <>
          <p className="camera-hint">
            {calibrationStage === 'none'
              ? 'Ta ett bilde av skiva for å kalibrere. Skal du bruke automatisk gjenkjenning senere, må dette bildet vise en TOM skive fra samme faste posisjon du kommer til å fotografere fra resten av kampen — kameraet må ikke flytte seg mellom bilder. Skal du bare registrere manuelt, holder det med et vanlig bilde av skiva.'
              : calibrationStage === 'awaiting-center'
                ? 'Trykk midt i blinken (bullseye) på bildet under.'
                : 'Trykk øverst på skiva, rett over midten (ytterkanten av dobbeltringen ved 20-feltet).'}
          </p>
          {calibrationStage === 'none' && (
            <label className="btn camera-upload-btn">
              📷 Ta bilde av tom skive
              <input
                type="file"
                accept="image/*"
                className="avatar-input"
                onChange={e => handleReferenceFile(e.target, e.target.files?.[0])}
              />
            </label>
          )}
          <canvas
            ref={calibrationCanvasRef}
            width={WORKING_SIZE}
            height={WORKING_SIZE}
            className="camera-canvas"
            style={{ display: calibrationStage === 'none' ? 'none' : 'block' }}
            onClick={handleCalibrationClick}
          />
        </>
      )}

      {isCalibrated && calibration && (
        <>
          <div className="camera-status">
            <span>✅ Kalibrert ({Math.round(calibrationRadiusPx(calibration))}px radius)</span>
            <button className="btn" onClick={resetCalibration}>
              Kalibrer på nytt
            </button>
          </div>

          {!reviewPhoto && (
            <div className="toggle-group camera-mode-toggle">
              <button className={mode === 'auto' ? 'active' : ''} onClick={() => setMode('auto')}>
                Automatisk gjenkjenning
              </button>
              <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>
                Manuell registrering
              </button>
            </div>
          )}

          {!reviewPhoto && (
            <label className="btn primary camera-upload-btn">
              📷 Ta bilde etter kast
              <input
                type="file"
                accept="image/*"
                className="avatar-input"
                onChange={e => handleThrowPhotoFile(e.target, e.target.files?.[0])}
              />
            </label>
          )}

          {reviewPhoto && (
            <>
              <p className="camera-hint">
                {mode === 'auto'
                  ? 'Trykk på et feilaktig kast for å fjerne det, eller trykk et sted i bildet for å legge til et kast som ikke ble oppdaget automatisk.'
                  : 'Trykk der hver pil traff skiva for å registrere kastet. Trykk på et kast for å fjerne det igjen.'}
              </p>
              <div className="camera-review-wrapper" onClick={handleReviewClick}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reviewPhoto} alt="Bilde av kast" className="camera-review-image" />
                {markers.map(m => (
                  <button
                    key={m.id}
                    className={`camera-marker ${m.throwResult ? '' : 'camera-marker-miss'}`}
                    style={{ left: `${(m.x / WORKING_SIZE) * 100}%`, top: `${(m.y / WORKING_SIZE) * 100}%` }}
                    onClick={e => {
                      e.stopPropagation();
                      removeMarker(m.id);
                    }}
                  >
                    {formatThrow(m.throwResult)}
                  </button>
                ))}
              </div>

              <div className="utility-row">
                <button className="btn" onClick={discardPhoto}>
                  Forkast bildet
                </button>
                <button className="btn primary" onClick={confirmThrows} disabled={markers.length === 0}>
                  Legg til {markers.length} kast i kampen
                </button>
              </div>
            </>
          )}
        </>
      )}

      {busy && <p className="camera-hint">Behandler bilde…</p>}
    </div>
  );
}
