/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
// ... (keep previous imports)
import { 
  LogOut, ArrowUpRight, Loader2, Coins, Clock, RefreshCw, 
  ShieldAlert, X, AlertTriangle, CheckCircle, Info, BookOpen, 
  Lock, Scale, ShieldCheck, FileText 
} from "lucide-react";

// --- ENHANCED THEME ---
const theme = {
  primary: "#5546FF",
  bg: "#0B0E14",
  card: "#161B22",
  cardBorder: "#30363D",
  textMain: "#FFFFFF",
  textMuted: "#8B949E",
  danger: "#EF4444",
  warning: "#F59E0B",
  info: "#0EA5E9",
  success: "#10B981"
};

// ... (keep appConfig, userSession, and contract constants)

function App() {
  const [userData, setUserData] = useState(null);
  const [vaultData, setVaultData] = useState({ amount: 0, unlock: 0 });
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [txId, setTxId] = useState("");
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  // --- NEW: Reset Navigation Function ---
  const resetToHome = () => {
    setTxId(""); // Clears the transaction notification
    setStxAmount(""); // Resets inputs
    setLockDays("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    userSession.signUserOut();
    window.location.reload();
  };

  // ... (keep fetchVaultStatus, handleConnect, handleDeposit, executeWithdrawal)

  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", color: theme.textMain, fontFamily: "'Inter', sans-serif" }}>
      
      {/* --- ADD GLOBAL CSS FOR PULSE DOT --- */}
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {/* --- MODALS (keep Emergency & Legal) --- */}

      {/* --- REFINED HEADER --- */}
      <header style={headerStyle}>
        {/* LOGO (Click to Reset) */}
        <div onClick={resetToHome} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
          <img src="/logo192.png" alt="Logo" style={{ width: "32px", height: "32px", borderRadius: "8px" }} />
          <span style={{ fontWeight: "800", fontSize: "20px", letterSpacing: "-0.5px" }}>STX VAULT</span>
        </div>

        {/* WALLET STATUS / ACTIONS */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {!userData ? (
            <button onClick={handleConnect} style={connectBtn}>Connect Wallet</button>
          ) : (
            <>
              {/* Premium Address Pill */}
              <div style={addressPill}>
                <div style={statusDot}></div>
                <span style={{ fontSize: "13px", fontWeight: "700" }}>
                  {userAddress?.substring(0, 5)}...{userAddress?.substring(userAddress.length - 4)}
                </span>
              </div>
              
              {/* Exit Button */}
              <button onClick={handleLogout} style={exitBtn} title="Sign Out">
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT (keep existing logic) --- */}
      {/* ... */}
    </div>
  );
}

// --- UPDATED STYLES ---
const headerStyle = { 
  display: "flex", 
  justifyContent: "space-between", 
  alignItems: "center", 
  padding: "16px 40px", 
  borderBottom: `1px solid ${theme.cardBorder}`,
  backgroundColor: "rgba(11, 14, 20, 0.8)",
  backdropFilter: "blur(12px)",
  position: "sticky",
  top: 0,
  zIndex: 100
};

const addressPill = { 
  backgroundColor: theme.card, 
  border: `1px solid ${theme.cardBorder}`, 
  padding: "8px 14px", 
  borderRadius: "12px", 
  color: theme.primary, 
  display: "flex", 
  alignItems: "center", 
  gap: "10px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
};

const statusDot = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: theme.success,
  animation: "pulse-green 2s infinite"
};

const exitBtn = { 
  background: "rgba(239, 68, 68, 0.1)", 
  border: `1px solid ${theme.danger}44`, 
  color: theme.danger, 
  padding: "8px", 
  borderRadius: "10px", 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  transition: "0.2s"
};

const connectBtn = { 
  backgroundColor: theme.primary, 
  color: "#fff", 
  border: "none", 
  padding: "10px 20px", 
  borderRadius: "10px", 
  fontWeight: "700", 
  cursor: "pointer",
  transition: "0.2s"
};

// ... (keep the rest of your card, input, and modal styles)
