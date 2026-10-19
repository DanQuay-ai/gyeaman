// Inline SVG icons (stroke = currentColor). Weapon shapes follow the real Akan afena, akuma and spear.
const s = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICON = {
  afena: s('<path d="M5 19l3-3"/><circle cx="4" cy="20" r="1.3"/><circle cx="8.6" cy="15.4" r="1.3"/><path d="M9.5 14.5C13 11 17 7 20 3c-.5 4-3 8-8 12.5"/><path d="M14 9.5l1.6 1.6M16.4 7l1.4 1.4"/>'),
  akuma: s('<path d="M6 21L15 8"/><path d="M13 5c3-1.5 6.5-.5 7.5 1.5-1.8.3-3.3 1.6-4 3.6-2-.5-3.4-2.3-3.5-5.1z" fill="currentColor" fill-opacity=".25"/>'),
  pea: s('<path d="M4 20L16.5 7.5"/><path d="M15 6c1.8-2 4.4-2.8 5.6-2.6.2 1.2-.6 3.8-2.6 5.6-.9.2-2.2-.2-2.8-.8S14.8 6.9 15 6z" fill="currentColor" fill-opacity=".3"/><path d="M7 15.5l1.5 1.5"/>'),
  ogya: s('<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.3 2.6-5.4 3.6-8.5 1.6 1.2 2.2 3 2.2 4.4 1.2-.8 2-2.7 1.9-4.9 3.4 2 5.3 5.6 5.3 9 0 3.4-2.5 6-6.5 6z"/><path d="M12 21c-1.7 0-2.8-1.1-2.8-2.6 0-1.6 1.4-2.6 2-4 1.6 1 3.6 2.4 3.6 4 0 1.5-1.1 2.6-2.8 2.6z"/>'),
  nsuo: s('<path d="M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>'),
  awow: s('<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>'),
  aprannaa: s('<path d="M13 2L5 13.5h6L10 22l9-12.5h-6.2z" fill="currentColor" fill-opacity=".25"/>'),
  nkyinkyim: s('<path d="M4 4l16 16M20 4L4 20"/><path d="M12 12c1.5-1.5 3.5-1 3.5 1s-2.5 3.5-4.5 3-3.5-3-3-5.5 3-4.5 5.5-4"/>'),
  asase: s('<path d="M2 20l5.5-10 3.5 6 3-5 8 9z" fill="currentColor" fill-opacity=".2"/><path d="M7.5 10L9 6.5M14 11l1-3"/>'),
  tonic: s('<path d="M9.5 3h5M10 3v5.2L5.4 17A2.6 2.6 0 0 0 7.8 21h8.4a2.6 2.6 0 0 0 2.4-4L14 8.2V3"/><path d="M7 14h10"/>'),
  map: s('<path d="M9 4L3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  hunter: s('<circle cx="12" cy="6.5" r="3.3"/><path d="M5 21c.5-4.6 3.2-7.4 7-7.4s6.5 2.8 7 7.4"/><path d="M15.5 13.5l4-4"/>'),
  gear: s('<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M12 7.5v9M8.5 11h7"/>'),
  shrine: s('<circle cx="12" cy="9" r="3.2"/><path d="M12 2.5v1.6M12 14v1.2M5.5 9H4M20 9h-1.5M7.4 4.4l1.1 1.1M16.6 4.4l-1.1 1.1"/><path d="M4 21h16M6 21v-3h12v3"/>'),
  help: s('<path d="M9.2 9a3 3 0 1 1 4.2 2.7c-.9.4-1.4 1.1-1.4 2v.6"/><circle cx="12" cy="18" r=".6" fill="currentColor"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: s('<path d="M15 5l-7 7 7 7"/>'),
  dice: s('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>'),
};
