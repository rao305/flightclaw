import type { BodyMeasurements } from "@sqairinch/shared";
import { getZoneScales } from "./measurementMapping.js";

export interface AvatarSvgProps {
  measurements: BodyMeasurements;
  debug?: boolean;
  className?: string;
}

const SVG_WIDTH = 100;
const SVG_HEIGHT = 200;
const CENTER_X = SVG_WIDTH / 2;

// Base half-widths at each vertical band, tuned for a stylised torso.
const BASE_SHOULDER_HALF = 26;
const BASE_BUST_HALF = 24;
const BASE_WAIST_HALF = 18;
const BASE_HIP_HALF = 25;

// Y positions of the control bands.
const Y_NECK = 18;
const Y_SHOULDERS = 28;
const Y_BUST = 52;
const Y_WAIST = 90;
const Y_HIPS = 122;
const Y_BOTTOM = 170;

export function AvatarSvg({ measurements, debug = false, className }: AvatarSvgProps) {
  const scales = getZoneScales(measurements);

  const shoulderHalf = BASE_SHOULDER_HALF * scales.shoulders;
  const bustHalf = BASE_BUST_HALF * scales.bust;
  const waistHalf = BASE_WAIST_HALF * scales.waist;
  const hipHalf = BASE_HIP_HALF * scales.hips;

  const leftShoulder = CENTER_X - shoulderHalf;
  const rightShoulder = CENTER_X + shoulderHalf;
  const leftBust = CENTER_X - bustHalf;
  const rightBust = CENTER_X + bustHalf;
  const leftWaist = CENTER_X - waistHalf;
  const rightWaist = CENTER_X + waistHalf;
  const leftHip = CENTER_X - hipHalf;
  const rightHip = CENTER_X + hipHalf;

  const bodyPath = [
    // Start at neck center top, move to right shoulder curve.
    `M ${CENTER_X} ${Y_NECK}`,
    `Q ${CENTER_X + shoulderHalf * 0.6} ${Y_NECK + 4}, ${rightShoulder} ${Y_SHOULDERS}`,
    // Right shoulder to right bust.
    `Q ${rightShoulder + 4} ${(Y_SHOULDERS + Y_BUST) / 2}, ${rightBust} ${Y_BUST}`,
    // Right bust to right waist.
    `Q ${rightBust + 2} ${(Y_BUST + Y_WAIST) / 2}, ${rightWaist} ${Y_WAIST}`,
    // Right waist to right hip.
    `Q ${rightWaist + 3} ${(Y_WAIST + Y_HIPS) / 2}, ${rightHip} ${Y_HIPS}`,
    // Right hip down to bottom center.
    `Q ${rightHip} ${(Y_HIPS + Y_BOTTOM) / 2}, ${CENTER_X} ${Y_BOTTOM}`,
    // Mirror: bottom center to left hip.
    `Q ${leftHip} ${(Y_HIPS + Y_BOTTOM) / 2}, ${leftHip} ${Y_HIPS}`,
    // Left hip to left waist.
    `Q ${leftWaist - 3} ${(Y_WAIST + Y_HIPS) / 2}, ${leftWaist} ${Y_WAIST}`,
    // Left waist to left bust.
    `Q ${leftBust - 2} ${(Y_BUST + Y_WAIST) / 2}, ${leftBust} ${Y_BUST}`,
    // Left bust to left shoulder.
    `Q ${leftShoulder - 4} ${(Y_SHOULDERS + Y_BUST) / 2}, ${leftShoulder} ${Y_SHOULDERS}`,
    // Left shoulder back to neck.
    `Q ${CENTER_X - shoulderHalf * 0.6} ${Y_NECK + 4}, ${CENTER_X} ${Y_NECK}`,
    "Z",
  ].join(" ");

  const debugLabels = [
    {
      label: `Shoulders: ${measurements.shoulders?.toFixed(1) ?? "—"} cm`,
      x: CENTER_X,
      y: Y_SHOULDERS - 10,
    },
    {
      label: `Bust: ${measurements.bust_chest?.toFixed(1) ?? "—"} cm`,
      x: CENTER_X,
      y: Y_BUST - 6,
    },
    {
      label: `Waist: ${measurements.waist?.toFixed(1) ?? "—"} cm`,
      x: CENTER_X,
      y: Y_WAIST - 4,
    },
    {
      label: `Hips: ${measurements.hips?.toFixed(1) ?? "—"} cm`,
      x: CENTER_X,
      y: Y_HIPS - 2,
    },
  ];

  return (
    <svg
      className={className}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Body avatar"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="avatar-body-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f2f4f8" />
          <stop offset="100%" stopColor="#d7dde8" />
        </linearGradient>
      </defs>

      {/* Torso silhouette */}
      <g
        style={{
          transition: "all 200ms ease-out",
        }}
      >
        <path d={bodyPath} fill="url(#avatar-body-fill)" stroke="#7b8794" strokeWidth={1.2} />
      </g>

      {/* Simple head circle for stylistic context */}
      <circle
        cx={CENTER_X}
        cy={Y_NECK - 16}
        r={10}
        fill="#f6f7fb"
        stroke="#7b8794"
        strokeWidth={1}
      />

      {debug && (
        <g fontSize={6} fill="#111827" textAnchor="middle" style={{ pointerEvents: "none" }}>
          {debugLabels.map((d) => (
            <text key={d.label} x={d.x} y={d.y}>
              {d.label}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
