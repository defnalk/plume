import { useState } from "react";

import { buildShareURL } from "../lib/url";

export interface SidePanelProps {
  T: number;
  onTChange: (T: number) => void;
  conversion: number;
  selectivity: number;
  reducedMotion: boolean;
  solving: boolean;
  onScreenshot: () => void;
}

const T_MIN = 380;
const T_MAX = 660;

export function SidePanel({
  T,
  onTChange,
  conversion,
  selectivity,
  reducedMotion,
  solving,
  onScreenshot,
}: SidePanelProps) {
  const [shareLabel, setShareLabel] = useState("Share state");

  const handleShare = async () => {
    const url = buildShareURL({ T });
    try {
      await navigator.clipboard.writeText(url);
      setShareLabel("Copied!");
    } catch {
      // Clipboard API may be unavailable on older Safari over http — fall back
      // to selecting the URL via prompt so the user can copy manually.
      window.prompt("Copy share URL:", url);
      setShareLabel("Share state");
      return;
    }
    setTimeout(() => setShareLabel("Share state"), 1500);
  };

  return (
    <aside className="side-panel" aria-label="Reactor controls">
      <header className="side-panel__header">
        <h1 className="side-panel__title">Plume</h1>
        <p className="side-panel__tagline">Watch a reactor breathe.</p>
      </header>

      <section className="side-panel__section">
        <label htmlFor="t-inlet" className="control-label">
          Inlet temperature
          <span className="control-value">{Math.round(T)} K</span>
        </label>
        <input
          id="t-inlet"
          type="range"
          min={T_MIN}
          max={T_MAX}
          step={1}
          value={T}
          onChange={(e) => onTChange(Number(e.target.value))}
          aria-valuemin={T_MIN}
          aria-valuemax={T_MAX}
          aria-valuenow={T}
        />
        <div className="control-scale" aria-hidden>
          <span>{T_MIN} K</span>
          <span>{T_MAX} K</span>
        </div>
      </section>

      <section className="side-panel__section side-panel__metrics">
        <div className="metric">
          <div className="metric__label">CH₃OH conversion</div>
          <div className="metric__value">
            {(conversion * 100).toFixed(1)}
            <span className="metric__unit">%</span>
          </div>
          <div className="metric__bar" aria-hidden>
            <div
              className="metric__bar-fill metric__bar-fill--conversion"
              style={{ width: `${Math.min(100, conversion * 100)}%` }}
            />
          </div>
        </div>
        <div className="metric">
          <div className="metric__label">HCHO selectivity</div>
          <div className="metric__value">
            {(selectivity * 100).toFixed(1)}
            <span className="metric__unit">%</span>
          </div>
          <div className="metric__bar" aria-hidden>
            <div
              className="metric__bar-fill metric__bar-fill--selectivity"
              style={{ width: `${Math.min(100, selectivity * 100)}%` }}
            />
          </div>
        </div>
      </section>

      <section className="side-panel__section side-panel__buttons">
        <button type="button" onClick={onScreenshot} className="btn">
          Screenshot
        </button>
        <button type="button" onClick={handleShare} className="btn btn--ghost">
          {shareLabel}
        </button>
      </section>

      <section className="side-panel__legend" aria-label="Species legend">
        <div className="legend__row">
          <span className="legend__swatch" style={{ background: "#7dd3fc" }} />
          CH₃OH (methanol)
        </div>
        <div className="legend__row">
          <span className="legend__swatch" style={{ background: "#9ef09e" }} />
          O₂
        </div>
        <div className="legend__row">
          <span className="legend__swatch" style={{ background: "#fbbf24" }} />
          HCHO (formaldehyde)
        </div>
        <div className="legend__row">
          <span className="legend__swatch" style={{ background: "#c4c4eb" }} />
          H₂O
        </div>
        <div className="legend__row">
          <span className="legend__swatch" style={{ background: "#f25c5c" }} />
          CO
        </div>
      </section>

      <footer className="side-panel__footer">
        <p>
          LHHW kinetics &middot; RK4 in worker &middot;{" "}
          <a href="https://github.com/defnalk/plume" target="_blank" rel="noreferrer">
            source
          </a>
        </p>
        <p className="side-panel__status">
          {solving ? "Solving…" : reducedMotion ? "Reduced motion: on" : "Live"}
        </p>
      </footer>
    </aside>
  );
}
