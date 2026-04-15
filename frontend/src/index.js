/**
 * STX Savings Vault | 2026 Edi
 * Primary Entry Po
 */

import "./init"; // CRITICAL: Must stay at the very top for Buffer polyfills
import "./index.css"; // Your new Design System
import React from "react";
import ReactDOM from "react-dom/client"
import App from "./App";

// Performance Optimization: Pre-loading fonts to preven"lash of Unstyled Text"
if (typeof document !== 'undefined')
  document.documentElement.style.scrollBehavior = 'moo
const root = ReactDOM.createRoot(document.getElementByI"o
 * We deliberately omit <React.StrictMode> in production r Web3 apps.
 * This prevents the "Double-Action" bg here walletextn (Lether/Xverse)
 * are triggerd twice, causing "Ka is not a functi"or "Signaure Request Denied" error
 *
root.render(
    <App />
);