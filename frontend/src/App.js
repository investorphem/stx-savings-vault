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
import { LogOut, ArrowUpRight, Loader2, Coins, Clock, RefreshCw, ShieldAlert, X, AlertTriangle, CheckCircle } from "lucide-react";

// --- THEME ---
const theme = {
  primary: "#5546FF",
  bg: "#0B0E14",
  card: "#161B22",
  cardBorder: "#30363D",
  textMain: "#FFFFFF",
  textMuted: "#8B949E",
  danger: "#EF4444",
  warning: "#F59E0B"
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
  const [txId, setTxId] = useState("");
  
  // NEW: State for Custom Modal
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleDeposit = async () => {
    if (!userData || !stxAmount) return;
    setIsPending(true);
    try {
      const userAddress = userData.profile.stxAddress.mainnet;
      const amountMicro = BigInt(Math.floor(Number(stxAmount) * 1000000));
      const postCondition = makeStandardSTXPostCondition(
        userAddress,
        FungibleConditionCode.Equal,
        amountMicro
      );

      await openContractCall({
        network: new StacksMainnet(),
        contractAddress,
        contractName,
        functionName: "deposit-stx",
        functionArgs: [uintCV(amountMicro), uintCV(Math.floor(Number(lockDays) * 144))],
        postConditions: [postCondition],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => setTxId(data.txId),
        onCancel: () => console.log("Cancelled")
      });
    } catch (e) { console.error(e); } finally { setIsPending(false); }
  };

  const executeWithdrawal = async (isEmergency) => {
    setShowConfirm(false);
    setIsPending(true);
    try {
      await openContractCall({
        network: new StacksMainnet(),
        contractAddress,
        contractName,
        functionName: isEmergency ? "emergency-withdraw" : "withdraw-stx",
        functionArgs: [],
        onFinish: (data) => setTxId(data.txId),
        onCancel: () => console.log("Cancelled")
      });
    } catch (e) { console.error(e); } finally { setIsPending(false); }
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", color: theme.textMain, fontFamily: "'Inter', sans-serif" }}>

      {/* --- CUSTOM EMERGENCY MODAL --- */}
      <AnimatePresence>
        {showConfirm && (
          <div style={modalOverlay}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={modalContent}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={warningIconBox}><AlertTriangle size={32} color={theme.warning} /></div>
                <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "10px" }}>Emergency Exit?</h2>
                <p style={{ color: theme.textMuted, fontSize: "14px", lineHeight: "1.5" }}>
                  This action bypasses your lock timer but will incur a <strong style={{color: theme.danger}}>10% protocol penalty fee</strong>.
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setShowConfirm(false)} style={cancelModalBtn}>Keep Locked</button>
                <button onClick={() => executeWithdrawal(true)} style={confirmModalBtn}>Confirm & Pay Fee</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo192.png" alt="Logo" style={{ width: "32px", height: "32px", borderRadius: "8px" }} />
          <span style={{ fontWeight: "800", fontSize: "20px" }}>STX VAULT</span>
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

      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 20px" }}>
        <AnimatePresence>
          {!userData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", maxWidth: "600px" }}>
              <div style={badge}>V9.1 SECURE PROTOCOL</div>
              <h1 style={heroTitle}>Protect Your <span style={{ color: theme.primary }}>STX.</span></h1>
              <p style={{ color: theme.textMuted, fontSize: "18px", marginBottom: "40px" }}>Non-custodial savings with institutional safety and emergency exit liquidity.</p>
              <button onClick={handleConnect} style={heroBtn}>Launch dApp <ArrowUpRight size={22} /></button>
            </motion.div>
          ) : (
            <div style={{ width: "100%", maxWidth: "950px" }}>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
                  
                  <div style={cardStyle}>
                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                        <h3 style={{ margin: 0 }}>Vault Status</h3>
                        <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} color={theme.textMuted} onClick={() => fetchVaultStatus(userAddress)} style={{ cursor: "pointer" }} />
                     </div>
                     <div style={statRow}><Coins color={theme.primary} /> <div><div style={statLabel}>Current Balance</div><div style={statValue}>{vaultData.amount} STX</div></div></div>
                     <div style={statRow}><Clock color={theme.primary} /> <div><div style={statLabel}>Unlock Block</div><div style={statValue}>#{vaultData.unlock || "---"}</div></div></div>
                  </div>

                  <div style={cardStyle}>
                     <h3 style={{ marginBottom: "20px" }}>Manage Funds</h3>
                     <input type="number" placeholder="Amount (STX)" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={inputStyle} />
                     <input type="number" placeholder="Lock Days" value={lockDays} onChange={e => setLockDays(e.target.value)} style={inputStyle} />
                     
                     <button onClick={handleDeposit} disabled={isPending} style={actionBtn}>
                        {isPending ? <Loader2 className="animate-spin" /> : "Secure Deposit"}
                     </button>
                     
                     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                        <button onClick={() => executeWithdrawal(false)} disabled={isPending} style={secondaryBtn}>Standard Release</button>
                        <button onClick={() => setShowConfirm(true)} disabled={isPending} style={dangerBtn}><ShieldAlert size={14} /> Emergency Exit</button>
                     </div>
                     {txId && <div style={txNotice}><CheckCircle size={14} color="#10B981" /> Tx Broadast! <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noreferrer" style={{ color: theme.primary, marginLeft: "5px" }}>Track</a></div>}
                  </div>
               </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- NEW MODAL STYLES ---
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" };
const modalContent = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "40px", borderRadius: "28px", maxWidth: "400px", width: "100%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" };
const warningIconBox = { width: "64px", height: "64px", borderRadius: "20px", backgroundColor: "rgba(245, 158, 11, 0.1)", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 20px" };
const cancelModalBtn = { flex: 1, padding: "14px", borderRadius: "12px", border: `1px solid ${theme.cardBorder}`, backgroundColor: "transparent", color: "#fff", fontWeight: "700", cursor: "pointer" };
const confirmModalBtn = { flex: 1, padding: "14px", borderRadius: "12px", border: "none", backgroundColor: theme.danger, color: "#fff", fontWeight: "700", cursor: "pointer" };

// --- EXISTING STYLES ---
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 60px", borderBottom: `1px solid ${theme.cardBorder}` };
const connectBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" };
const addressPill = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "6px 14px", borderRadius: "10px", fontSize: "14px", color: theme.primary, fontWeight: "600" };
const badge = { color: theme.primary, fontSize: "12px", fontWeight: "900", letterSpacing: "2px", marginBottom: "20px", border: `1px solid ${theme.primary}`, padding: "4px 12px", borderRadius: "100px", display: "inline-block" };
const heroTitle = { fontSize: "72px", fontWeight: "900", marginBottom: "24px", lineHeight: "1.1", letterSpacing: "-2px" };
const heroBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "16px 40px", borderRadius: "14px", fontSize: "18px", fontWeight: "800", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "10px" };
const cardStyle = { backgroundColor: theme.card, padding: "32px", borderRadius: "24px", border: `1px solid ${theme.cardBorder}` };
const statRow = { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" };
const statLabel = { fontSize: "12px", color: theme.textMuted, textTransform: "uppercase" };
const statValue = { fontSize: "28px", fontWeight: "800" };
const inputStyle = { width: "100%", backgroundColor: "#000", border: `1px solid ${theme.cardBorder}`, color: "#fff", padding: "12px", borderRadius: "10px", marginBottom: "12px", boxSizing: "border-box" };
const actionBtn = { width: "100%", backgroundColor: theme.primary, color: "#fff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", display: "flex", justifyContent: "center" };
const secondaryBtn = { backgroundColor: "#30363D", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" };
const dangerBtn = { backgroundColor: "transparent", color: theme.danger, border: `1px solid ${theme.danger}`, padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" };
const txNotice = { marginTop: "15px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", color: "#10B981" };

export default App;
