import "./init"; // Ensure this filename is exactly init.js in your src folder
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
// Removing StrictMode fixes the "double-initialization" that crashes some Stacks providers
root.render(
    <App />
);
