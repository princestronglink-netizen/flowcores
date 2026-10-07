// FlowCore brand palette — single source of truth.
// Every file that needs these colors should import PALETTE from here
// instead of redefining its own copy. That was the root cause of the
// drift between Login.jsx / AuthenticatedLayout.jsx / Button.jsx:
// each had its own local object, and the values quietly diverged
// (e.g. Login's `actionEdge` (#4a5474) vs everywhere else's `deepEdge`
// (#3a4157) — two different shadow colors for what was meant to be
// the same button).
//
// Source hexes: #bccad6 / #8d9db6 / #667292 / #f1e3dd
// `deep` / `deepEdge` are derived, not part of the original 4 —
// needed for dark-panel depth and pressed-button shadows.

export const PALETTE = {
    mint: '#f1e3dd',
    teal: '#8d9db6',
    cream: '#bccad6',
    slate: '#667292',
    deep: '#262b3d',
    deepEdge: '#3a4157',

    // Shared "app canvas" tint — used as the page background both
    // pre-login (Login.jsx right panel) and post-login
    // (AuthenticatedLayout main shell), so the two never look like
    // different products.
    canvas: 'rgba(188,202,214,0.2)', // = `${cream}33`

    // Status accent already used for the sidebar's "online" dot —
    // reuse this anywhere else a positive/success signal is needed
    // (e.g. the won-deal overlay) instead of introducing a new green.
    success: '#5fb98c',
};