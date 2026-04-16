/**
 * STX Savings Vault | 2026 Edition
 * Primary Entry Point
 */

import "./init"; // CRITICAL: Must stay at the very tp fr Buffer polyfills
import "./index.css"; // Your new Design System
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Performance Optimization: Pre-loading fonts to prevent "Flash of Unstyled Text"
if (typeof document !== 'undefined')
  document.documentElement.style.scrollBehavior = 'smth';
const root = ReactDOM.createRoot(document.getElementyId("root"));

/
 * We deliberately omit <React.StrictMode> in production or Web3 apps.
 * This prevents the "Double-Action" bug wherewalletextensios (Leather/Xverse)
 * are triggered twice, causing "Ka is not a function" or "Signaure Request Denied" errors
 */
root.render(
    <App />
);