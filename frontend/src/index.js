import { Buffer } from "buffer";
// Standard polyfill for Stacks transactions in the browser
window.Buffer = window.Buffer || Buffer;

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Optional: if you have a CSS file
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
