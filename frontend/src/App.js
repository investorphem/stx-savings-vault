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
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  // --- FEATURE: RESET NAVIGATION ---
  const resetToHome = () => {
    setTxId(""); 
    setStxAmount(""); 
    setLockDays("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    userSession.signUserOut();
    window.location.reload();
  };

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
      });
    } catch (e) { console.error(e); } finally { setIsPending(false); }
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", color: theme.textMain, fontFamily: "'Inter', sans-serif" }}>
      
      {/* --- LIVE PULSE ANIMATION --- */}
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {showConfirm && (
          <div style={modalOverlay}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={modalContent}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={iconBox(theme.warning)}><AlertTriangle size={32} color={theme.warning} /></div>
                <h2 style={{ fontSize: "24px", fontWeight: "800" }}>Early Exit?</h2>
                <p style={{ color: theme.textMuted, fontSize: "14px", marginTop: "10px" }}>
                  Bypassing the lock timer incurs a <strong style={{color: theme.danger}}>10% penalty fee</strong>.
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setShowConfirm(false)} style={cancelModalBtn}>Keep Locked</button>
                <button onClick={() => executeWithdrawal(true)} style={confirmModalBtn}>Confirm & Pay</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLegal && (
          <div style={modalOverlay}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={legalContent}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "800" }}>Terms of Service</h2>
                <X style={{ cursor: "pointer" }} onClick={() => setShowLegal(false)} />
              </div>
              <div style={legalScrollArea}>
                <h4 style={legalHeading}>1. Non-Custodial Protocol</h4>
                <p style={legalText}>STX Vault is a smart-contract tool. We never hold your keys.</p>
                <h4 style={legalHeading}>2. Penalty Transparency</h4>
                <p style={legalText}>Emergency Exits incur a 10% protocol fee.</p>
              </div>
              <button onClick={() => setShowLegal(false)} style={actionBtn}>I Accept</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- HEADER --- */}
      <header style={headerStyle}>
        <div 
          onClick={resetToHome} 
          style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
        >
          <img src="/logo192.png" alt="Logo" style={{ width: "32px", height: "32px", borderRadius: "8px" }} />
          <span style={{ fontWeight: "800", fontSize: "20px", letterSpacing: "-0.5px" }}>STX VAULT</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {!userData ? (
            <button onClick={handleConnect} style={connectBtn}>Connect Wallet</button>
          ) : (
            <>
              <div style={addressPill}>
                <div style={statusDot}></div>
                <span style={{ fontSize: "13px", fontWeight: "700" }}>
                  {userAddress?.substring(0, 5)}...{userAddress?.substring(userAddress.length - 4)}
                </span>
              </div>
              <button onClick={handleLogout} style={exitBtn} title="Sign Out">
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px" }}>
        <AnimatePresence>
          {!userData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginTop: "60px" }}>
              <div style={badge}>V9.2 TRUST-FIRST DEFI</div>
              <h1 style={heroTitle}>Save STX with <br/><span style={{ color: theme.primary }}>Institutional Security.</span></h1>
              <p style={{ color: theme.textMuted, fontSize: "18px", marginBottom: "40px", maxWidth: "600px", margin: "0 auto 40px" }}>
                Secure your wealth using time-locked smart contracts. Non-custodial, transparent, and built for Diamond Hands.
              </p>
              <button onClick={handleConnect} style={heroBtn}>Enter the Vault <ArrowUpRight size={22} /></button>
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
               <div style={infoBanner}>
                 <Info size={18} color={theme.info} />
                 <span style={{ fontSize: "14px" }}>
                   <strong>Pro Tip:</strong> Locking STX reduces circulating supply, promoting ecosystem stability.
                 </span>
               </div>

               <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
                  <div style={cardStyle}>
                     <h3 style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}><ShieldCheck size={20} color={theme.success} /> Status</h3>
                     <div style={statRow}><Coins color={theme.primary} /> <div><div style={statLabel}>Vault Balance</div><div style={statValue}>{vaultData.amount} STX</div></div></div>
                     <div style={statRow}><Clock color={theme.primary} /> <div><div style={statLabel}>Unlock Height</div><div style={statValue}>#{vaultData.unlock || "---"}</div></div></div>
                  </div>

                  <div style={cardStyle}>
                     <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}><BookOpen size={20} color={theme.info} /> Benefits</h3>
                     <div style={benefitItem}><Lock size={14} /> Prevent Emotional Selling</div>
                     <div style={benefitItem}><ShieldCheck size={14} /> Bitcoin-Grade Security</div>
                     <div style={benefitItem}><FileText size={14} /> Fully On-Chain Proof</div>
                  </div>

                  <div style={cardStyle}>
                     <h3 style={{ marginBottom: "20px" }}>Vault Control</h3>
                     <input type="number" placeholder="STX Amount" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={inputStyle} />
                     <input type="number" placeholder="Days to Lock" value={lockDays} onChange={e => setLockDays(e.target.value)} style={inputStyle} />

                     <button onClick={handleDeposit} disabled={isPending} style={actionBtn}>
                        {isPending ? <Loader2 className="animate-spin" /> : "Secure Deposit"}
                     </button>

                     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                        <button onClick={() => executeWithdrawal(false)} disabled={isPending} style={secondaryBtn}>Standard Exit</button>
                        <button onClick={() => setShowConfirm(true)} disabled={isPending} style={dangerBtn}><ShieldAlert size={14} /> Early Exit</button>
                     </div>
                     {txId && <div style={txNotice}><CheckCircle size={14} /> Tx Broadcast! <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noreferrer" style={{ color: theme.primary }}>Track</a></div>}
                  </div>
               </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer style={footerStyle}>
        <div style={{ display: "flex", justifyContent: "center", gap: "30px", fontSize: "13px", color: theme.textMuted }}>
          <span style={footerLink} onClick={() => setShowLegal(true)}><Scale size={16} /> Terms & Privacy</span>
          <span>STX Vault Protocol © 2026</span>
        </div>
      </footer>
    </div>
  );
}

// --- STYLES ---
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", borderBottom: `1px solid ${theme.cardBorder}`, backgroundColor: "rgba(11, 14, 20, 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 };
const addressPill = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "8px 14px", borderRadius: "12px", color: theme.primary, display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" };
const statusDot = { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.success, animation: "pulse-green 2s infinite" };
const exitBtn = { background: "rgba(239, 68, 68, 0.1)", border: `1px solid ${theme.danger}44`, color: theme.danger, padding: "8px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center" };
const infoBanner = { backgroundColor: "rgba(14, 165, 233, 0.1)", border: `1px solid ${theme.info}33`, padding: "16px", borderRadius: "16px", display: "flex", alignItems: "center", gap: "15px" };
const iconBox = (color) => ({ width: "64px", height: "64px", borderRadius: "20px", backgroundColor: `${color}1A`, display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 15px" });
const benefitItem = { display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: theme.textMuted, marginBottom: "10px" };
const footerStyle = { padding: "60px 20px", borderTop: `1px solid ${theme.cardBorder}`, marginTop: "40px" };
const footerLink = { cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" };
const legalContent = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "30px", borderRadius: "28px", maxWidth: "500px", width: "100%" };
const legalScrollArea = { height: "200px", overflowY: "auto", padding: "15px", backgroundColor: "#000", borderRadius: "12px", marginBottom: "20px" };
const legalHeading = { fontSize: "14px", color: theme.primary, marginBottom: "5px" };
const legalText = { fontSize: "13px", color: theme.textMuted, marginBottom: "15px" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "40px", borderRadius: "28px", maxWidth: "400px", width: "100%" };
const cancelModalBtn = { flex: 1, padding: "14px", borderRadius: "12px", border: `1px solid ${theme.cardBorder}`, backgroundColor: "transparent", color: "#fff", fontWeight: "700", cursor: "pointer" };
const confirmModalBtn = { flex: 1, padding: "14px", borderRadius: "12px", border: "none", backgroundColor: theme.danger, color: "#fff", fontWeight: "700", cursor: "pointer" };
const connectBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" };
const badge = { color: theme.primary, fontSize: "12px", fontWeight: "900", letterSpacing: "2px", marginBottom: "20px", border: `1px solid ${theme.primary}`, padding: "4px 12px", borderRadius: "100px", display: "inline-block" };
const heroTitle = { fontSize: "64px", fontWeight: "900", marginBottom: "24px", lineHeight: "1.1", letterSpacing: "-2px" };
const heroBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "16px 40px", borderRadius: "14px", fontSize: "18px", fontWeight: "800", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "10px" };
const cardStyle = { backgroundColor: theme.card, padding: "32px", borderRadius: "24px", border: `1px solid ${theme.cardBorder}` };
const statRow = { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" };
const statLabel = { fontSize: "12px", color: theme.textMuted, textTransform: "uppercase" };
const statValue = { fontSize: "28px", fontWeight: "800" };
const inputStyle = { width: "100%", backgroundColor: "#000", border: `1px solid ${theme.cardBorder}`, color: "#fff", padding: "12px", borderRadius: "10px", marginBottom: "12px", boxSizing: "border-box", outline: "none" };
const actionBtn = { width: "100%", backgroundColor: theme.primary, color: "#fff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", display: "flex", justifyContent: "center" };
const secondaryBtn = { backgroundColor: "#30363D", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" };
const dangerBtn = { backgroundColor: "transparent", color: theme.danger, border: `1px solid ${theme.danger}`, padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" };
const txNotice = { marginTop: "15px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", color: theme.success };

export default App;
