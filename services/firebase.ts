
// Mock Firebase Service to prevent Import Errors with CDN UMD builds
// This ensures the app loads correctly in the browser-only demo environment.

export const app = null;
export const auth = null;
export const db = null;

// Flag to indicate we are running in a mode that doesn't rely on real Firebase
export const isFirebaseConfigured = false;

export default app;
