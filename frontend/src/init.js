/**
 * STX Savings Vault | 2026 Environment Patch
 * This MUST be imported before React or Stacks.js
 */
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  // Polyfill Buffer for Web3 Transactions
  window.Buffer = window.Buffer || Buffer;
  
  // Polyfill Global for legacy Stacks libraries
  window.global = window.global || window;

  // Polyfill Process for Environment detection
  window.process = window.process || { 
    env: { 
      NODE_ENV: "production", // Default to production for security
      DEBUG: undefined 
    },
    version: "",
    nextTick: (callback) => setTimeout(callback, 0), // Fixes async race conditions
    browser: true
  };
}
