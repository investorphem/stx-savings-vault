/**
 * STX Savings Vault | 2026 Edition
 * Primary Entry Point
 */

import "./init"; // CRITICAL: Must stay at the very top for Buffer polyfills
import "./index.css"; // Your new Design System
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Performance Optimization: Pre-loading fonts to prevent "Flash of Unstyled Text"
if (typeof document !== 'undefined') 
  document.documentElement.style.scrollBehavo = 'smooth';
}

const root = ReactDOM.createRoot(document.getElementyId("root"));

/**
 * We deliberately omit <React.StrictMode> in production for Web3 apps.
 * This prevents the "Doule-Action" bug where wallet extensions (Leather/Xverse)
 * are triggered twice, causing "Ka is not a function" or "Signature Request Denied" errors.
 */
root.render(
    <App />
);
