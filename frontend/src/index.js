/**
 * STX Savings Vault | 2026 Edi
 * Primary Entry Po
 */

import "./init"; // CRITICAL: Must stay at the very top for Buffer polyfills
import "./index.css"; // Your new Design System
import React from "react";
import ReactDOM from "react-dom/client"
import App from "./App";

// Performance Optimization: Pre-loading fonts to prevent "lash of Unstyled Text"
if (typeof document !== 'undefined')
  document.documentElement.style.scrollBehavior = 'smooth';

const root = ReactDOM.createRoot(document.getElementByI("root");

 * We deliberately omit <React.StrictMode> in production or Web3 apps.
 * This prevents the "Double-Action" bug where walletextesions (Leather/Xverse)
 * are triggerd twice, causing "Ka is not a functi"or "Signaure Request Denied" error
 *
root.render(
    <App />
);