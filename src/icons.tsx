import React from "react";
const shapes: Record<string, React.ReactNode> = {
  search: <>
    <circle cx="10.5" cy="10.5" r="6.8" />
    <path d="m16 16 4.8 4.8" />
  </>,
  code: <><path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16" /></>,
  pen: <>
    <path d="m3 21 3-10 9-7 5 5-7 9-10 3Zm0 0 7-7m5-10 2-2 5 5-2 2" />
    <circle cx="11" cy="13" r="1.5" />
  </>,
  box: <><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5m-9 5v10M7.5 4.5l9 5" /></>,
  terminal: <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m6 9 3 3-3 3m6 0h5" />
  </>,
  web: <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 9h20M5.5 6.5h.1m3 0h.1" />
  </>,
  film: <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 4v16m10-16v16M2 9h5m-5 6h5m10-6h5m-5 6h5" />
  </>,
  globe: <>
    <circle cx="12" cy="12" r="9" />
    <ellipse cx="12" cy="12" rx="4" ry="9" />
    <path d="M3 12h18" />
  </>,
  chevron: <path d="m9 5 7 7-7 7" />,
  down: <path d="m6 9 6 6 6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  layers: <><path d="m12 3 10 6-10 6L2 9zM3 13l9 5 9-5m-18 4 9 5 9-5" /></>,
  expand: <path d="M4 10V4h6m10 6V4h-6M4 14v6h6m10-6v6h-6" />,
  mail: <>
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="m3 6 9 7 9-7" />
  </>,
  share: <>
    <circle cx="18" cy="4" r="2.5" />
    <circle cx="5" cy="12" r="2.5" />
    <circle cx="18" cy="20" r="2.5" />
    <path d="m7 11 9-6m-9 8 9 6" />
  </>,
  calendar: <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M7 2v6m10-6v6M3 11h18" />
  </>,
  sliders: <>
    <path d="M3 7h10m4 0h4M3 17h3m4 0h11" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </>,
  folder: <path d="M2 6h7l3 3h10v11H2z" />,
  clock: <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6v6l4 2" />
  </>
};
export function Icon({
  name,
  size = 20
}: {
  name: string;
  size?: number;
}) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>;
}
