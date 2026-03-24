/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { StacksMainnet } from "@stacks/network";
import { 
  uintCV, 
  PostConditionMode, 
  FungibleConditionCode,
  makeStandardSTXPostCondition,
  callReadOnlyFunction, 
  cvToJSON 
} from "@stacks/transactions";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ArrowUpRight, Loader2, Coins, Clock, RefreshCw } from "lucide-react";

// --- THEME ---
const theme = {
  primary: "#5546FF",
  bg: "#0B0E14",
  card: "#161B22",
  cardBorder: "#30363D",
  textMain: "#FFFFFF",
  textMuted: "#8B949E",
};

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

const contractAddress = "SPYOURMAINNETADDRESSHERE"; 
const contractName = "stx-vault-v3"; 

function App() {
  const [userData, setUserData] = useState(null);
  const [vaultData, setVaultData] = useState({ amount: 0, unlock: 0 });
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchVaultStatus = useCallback(async (address) => {
    if (!address) return;
    setIsRefreshing(true);
    try {
      const result = await callReadOnlyFunction({
        network: new StacksMainnet(),
        contractAddress,
        contractName,
        functionName: "get-vault-status",
        functionArgs: [uintCV(address)],
        senderAddress: address,
      });
      const json = cvToJSON(result);
      if (json && json.value) {
        setVaultData({
          amount: Number(json.value.amount.value) / 1000000,
          unlock: Number(json.value["unlock-block"].value)
        });
      }
    } catch (e) { console.error(e); } finally { setIsRefreshing(false); }
  }, []);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const user = userSession.loadUserData();
      setUserData(user);
      fetchVaultStatus(user.profile.stxAddress.mainnet);
    }
  }, [fetchVaultStatus]);

  const handleConnect = () => {
    showConnect({
      userSession,
      appDetails: { name: "STX Vault", icon: window.location.origin + "/logo192.png" },
      onFinish: () => { window.location.reload(); },
    });
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", color: theme.textMain, fontFamily: "'Inter', sans-serif" }}>
      
      {/* --- HEADER --- */}
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* YOUR ACTUAL LOGO IMAGE */}
          <img src="/logo192.png" alt="STX Vault" style={{ width: "32px", height: "32px", borderRadius: "8px" }} />
          <span style={{ fontWeight: "800", fontSize: "20px", letterSpacing: "-0.5px" }}>STX VAULT</span>
        </div>
        {!userData ? (
          <button onClick={handleConnect} style={connectBtn}>Connect Wallet</button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={addressPill}>{userAddress?.substring(0, 6)}...</span>
            <button onClick={() => { userSession.signUserOut(); window.location.reload(); }} style={{ background: "none", border: "none", color: theme.textMuted, cursor: "pointer" }}><LogOut size={18} /></button>
          </div>
        )}
      </header>

      {/* --- MAIN CONTENT --- */}
      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 20px" }}>
        <AnimatePresence>
          {!userData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", maxWidth: "600px" }}>
              <div style={badge}>V8.1 PREMIUM PROTOCOL</div>
              <h1 style={heroTitle}>Protect Your <span style={{ color: theme.primary }}>STX.</span></h1>
              <p style={{ color: theme.textMuted, fontSize: "18px", marginBottom: "40px", lineHeight: "1.6" }}>
                The most secure, non-custodial savings vault for the Stacks ecosystem. 
                Bitcoin-grade security with Web3 flexibility.
              </p>
              <button onClick={handleConnect} style={heroBtn}>Launch dApp <ArrowUpRight size={22} /></button>
            </motion.div>
          ) : (
            <div style={{ width: "100%", maxWidth: "950px" }}>
               {/* Dashboard logic goes here (same as previous) */}
               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  <div style={cardStyle}>
                     <h3 style={{ marginBottom: "20px" }}>Vault Balance</h3>
                     <div style={statRow}><Coins color={theme.primary} /> <div><div style={statLabel}>Current</div><div style={statValue}>{vaultData.amount} STX</div></div></div>
                     <div style={statRow}><Clock color={theme.primary} /> <div><div style={statLabel}>Unlock Block</div><div style={statValue}>#{vaultData.unlock}</div></div></div>
                  </div>
                  {/* ... Actions Card ... */}
               </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- REFINED STYLES ---
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 60px", borderBottom: `1px solid ${theme.cardBorder}`, backgroundColor: "rgba(11, 14, 20, 0.8)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 };
const connectBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", transition: "0.2s" };
const addressPill = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "6px 14px", borderRadius: "10px", fontSize: "14px", color: theme.primary, fontWeight: "600" };
const badge = { color: theme.primary, fontSize: "12px", fontWeight: "900", letterSpacing: "2px", marginBottom: "20px", border: `1px solid ${theme.primary}`, padding: "4px 12px", borderRadius: "100px", display: "inline-block" };
const heroTitle = { fontSize: "72px", fontWeight: "900", marginBottom: "24px", lineHeight: "1.1", letterSpacing: "-2px" };
const heroBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "18px 48px", borderRadius: "14px", fontSize: "20px", fontWeight: "800", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "12px", boxShadow: "0 10px 30px rgba(85, 70, 255, 0.3)" };
const cardStyle = { backgroundColor: theme.card, padding: "32px", borderRadius: "24px", border: `1px solid ${theme.cardBorder}` };
const statRow = { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" };
const statLabel = { fontSize: "12px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1px" };
const statValue = { fontSize: "28px", fontWeight: "800" };

export default App;
