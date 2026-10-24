const svg=path=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
export const MAP_ICONS={
 search:svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>'),
 home:svg('<path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7"/>'),
 layers:svg('<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>'),
 info:svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>')
};
