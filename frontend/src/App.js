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
  Lock, Scale, ShieldCheck, FileText, Share2, Trophy
} from "lucide-react";

// --- CONFIGURATION ---
const APP_VERSION = "9.4.1";
const IS_MAINTENANCE = false;
const contractAddress = "SPYOURMAINNETADDRESSHERE"; 
const contractName = "stx-vault-v3"; 

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

// --- SUB-COMPONENT: NETWORK STATUS ---
const NetworkStatus = () => {
  const [net, setNet] = useState({ online: false, height: 0 });
  const check = useCallback(async () => {
    try {
      const res = await fetch("https://api.mainnet.hiro.so/v2/info");
      const data = await res.json();
      setNet({ online: true, height: data.stacks_tip_height });
    } catch { setNet({ online: false, height: 0 }); }
  }, []);
  useEffect(() => { check(); const i = setInterval(check, 30000); return () => clearInterval(i); }, [check]);
  return (
    <div style={pillStyle}>
      <div style={{ ...statusDotSmall, backgroundColor: net.online ? theme.success : theme.danger }} />
      <span style={{ fontSize: "11px", fontWeight: "700", color: theme.textMuted }}>
        {net.online ? `BLOCK #${net.height}` : "OFFLINE"}
      </span>
    </div>
  );
};

function App() {
  const [userData, setUserData] = useState(null);
  const [vaultData, setVaultData] = useState({ amount: 0, unlock: 0 });
  const [history, setHistory] = useState([]);
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [txId, setTxId] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  // --- JANITOR & AUTH ---
  useEffect(() => {
    const saved = localStorage.getItem("vault_version");
    if (saved !== APP_VERSION) {
      localStorage.removeItem("blockstack-session");
      localStorage.setItem("vault_version", APP_VERSION);
    }
    if (userSession.isUserSignedIn()) {
      const user = userSession.loadUserData();
      setUserData(user);
      fetchVaultStatus(user.profile.stxAddress.mainnet);
      fetchHistory(user.profile.stxAddress.mainnet);
    }
  }, []);

  const fetchVaultStatus = async (address) => {
    try {
      const result = await callReadOnlyFunction({
        network: new StacksMainnet(),
        contractAddress, contractName,
        functionName: "get-vault-status",
        functionArgs: [uintCV(address)],
        senderAddress: address,
      });
      const json = cvToJSON(result);
      if (json?.value) {
        setVaultData({
          amount: Number(json.value.amount.value) / 1000000,
          unlock: Number(json.value["unlock-block"].value)
        });
      }
    } catch (e) { console.error(e); }
  };

  const fetchHistory = async (address) => {
    try {
      const res = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/transactions?limit=10`);
      const data = await res.json();
      const filtered = data.results.filter(tx => JSON.stringify(tx).includes(contractName));
      setHistory(filtered);
    } catch (e) { console.error(e); }
  };

  const handleForceUpdate = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleDeposit = async () => {
    if (!stxAmount) return;
    setIsPending(true);
    try {
      const amountMicro = BigInt(Math.floor(Number(stxAmount) * 1000000));
      await openContractCall({
        network: new StacksMainnet(),
        contractAddress, contractName,
        functionName: "deposit-stx",
        functionArgs: [uintCV(amountMicro), uintCV(Math.floor(Number(lockDays) * 144))],
        postConditions: [makeStandardSTXPostCondition(userData.profile.stxAddress.mainnet, FungibleConditionCode.Equal, amountMicro)],
        onFinish: (data) => setTxId(data.txId),
      });
    } catch (e) { console.error(e); } finally { setIsPending(false); }
  };

  const executeWithdrawal = async (emergency) => {
    setShowConfirm(false); setIsPending(true);
    try {
      await openContractCall({
        network: new StacksMainnet(),
        contractAddress, contractName,
        functionName: emergency ? "emergency-withdraw" : "withdraw-stx",
        functionArgs: [],
        onFinish: (data) => setTxId(data.txId),
      });
    } catch (e) { console.error(e); } finally { setIsPending(false); }
  };

  const shareToX = () => {
    const text = `Locked ${vaultData.amount} $STX in the @STXVault! 💎🙌 Securing my future on @Stacks. #Bitcoin #DeFi`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", color: theme.textMain, fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }`}</style>

      {/* --- HEADER --- */}
      <header style={headerStyle}>
        <div onClick={() => window.scrollTo({top:0, behavior:'smooth'})} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
          <img src="/logo192.png" alt="L" style={{ width: "32px", borderRadius: "8px" }} />
          <span style={{ fontWeight: "900", fontSize: "20px" }}>STX VAULT</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <NetworkStatus />
          {!userData ? (
            <button onClick={() => showConnect({ userSession, appDetails: { name: "STX Vault" }, onFinish: () => window.location.reload() })} style={connectBtn}>Connect</button>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={addressPill}>{userAddress.substring(0,5)}...{userAddress.slice(-4)}</div>
              <button onClick={() => { userSession.signUserOut(); window.location.reload(); }} style={exitBtn}><LogOut size={16}/></button>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        {IS_MAINTENANCE ? (
          <div style={maintCard}><Loader2 className="animate-spin" size={40} color={theme.warning}/><h1 style={{marginTop:"20px"}}>Upgrading Protocol...</h1><p>Funds are safe on-chain.</p></div>
        ) : (
          <>
            {!userData ? (
              <div style={{ textAlign: "center", paddingTop: "80px", paddingBottom: "80px" }}>
                <div style={badge}>TRUST-FIRST DEFI</div>
                <h1 style={{ fontSize: "64px", fontWeight: "900", lineHeight: "1.1", marginBottom: "20px" }}>
                  Save STX with <br/><span style={{ color: theme.primary }}>Institutional Security.</span>
                </h1>
                <p style={{ color: theme.textMuted, marginBottom: "40px", fontSize: "18px", maxWidth: "600px", margin: "0 auto 40px", lineHeight: "1.6" }}>
                  Secure your wealth using time-locked smart contracts. Non-custodial, transparent, and built for Diamond Hands.
                </p>
                <button onClick={() => showConnect({ userSession, appDetails: { name: "STX Vault" }, onFinish: () => window.location.reload() })} style={heroBtn}>
                  Enter the Vault <ArrowUpRight size={22} style={{ marginLeft: "8px" }} />
                </button>
              </div>
            ) : (
              <div style={gridContainer}>
                {/* LEFT: STATUS & ACTION */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={cardStyle}>
                    <h3 style={cardHead}><ShieldCheck size={20} color={theme.success}/> Vault Status</h3>
                    <div style={statRow}><Coins color={theme.primary}/><div style={statValue}>{vaultData.amount} STX</div></div>
                    <div style={statRow}><Clock color={theme.primary}/><div style={statValue}>Block #{vaultData.unlock || "0"}</div></div>
                    {vaultData.amount > 0 && <button onClick={shareToX} style={shareBtn}><Share2 size={16}/> Brag on X</button>}
                  </div>

                  <div style={cardStyle}>
                    <h3 style={cardHead}>Manage Vault</h3>
                    <input type="number" placeholder="STX Amount" value={stxAmount} onChange={e=>setStxAmount(e.target.value)} style={inputStyle}/>
                    <input type="number" placeholder="Days to Lock" value={lockDays} onChange={e=>setLockDays(e.target.value)} style={inputStyle}/>
                    <button onClick={handleDeposit} disabled={isPending} style={actionBtn}>
                      {isPending ? <Loader2 className="animate-spin"/> : "Secure Deposit"}
                    </button>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                      <button onClick={()=>executeWithdrawal(false)} style={secondaryBtn}>Standard Exit</button>
                      <button onClick={()=>setShowConfirm(true)} style={dangerBtn}><ShieldAlert size={14}/> Early Exit</button>
                    </div>
                  </div>
                </div>

                {/* RIGHT: HISTORY & LEADERBOARD */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={cardStyle}>
                    <h3 style={cardHead}><RefreshCw size={20} color={theme.info}/> Recent Activity</h3>
                    {history.length === 0 ? (
                      <div style={{ color: theme.textMuted, fontSize: "13px" }}>No recent vault activity.</div>
                    ) : (
                      history.map((tx, index) => (
                        <a key={index} href={`https://explorer.hiro.so/txid/${tx.tx_id}`} target="_blank" rel="noreferrer" style={historyRow}>
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {tx.contract_call.function_name.includes("deposit") ? <ArrowUpRight size={14} color={theme.success}/> : <LogOut size={14} color={theme.warning}/>}
                            {tx.contract_call.function_name.replace("-stx","")}
                          </span>
                          <span style={{color:theme.success, fontSize: "11px", fontWeight: "bold" }}>CONFIRMED</span>
                        </a>
                      ))
                    )}
                  </div>
                  <div style={cardStyle}>
                    <h3 style={cardHead}><Trophy size={20} color={theme.warning}/> Top Savers</h3>
                    <div style={leaderRow}><span>1. SP2J...X7R4</span><strong>25,400 STX</strong></div>
                    <div style={leaderRow}><span>2. SP3M...9QW2</span><strong>18,250 STX</strong></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* --- FOOTER --- */}
      <footer style={footerStyle}>
        <div style={{ display: "flex", gap: "30px", color: theme.textMuted, fontSize: "13px", alignItems: "center" }}>
          <span onClick={()=>setShowLegal(true)} style={{cursor:"pointer", display: "flex", alignItems: "center", gap: "6px"}}><Scale size={14}/> Terms & Privacy</span>
          <span>© 2026 STX Vault</span>
          <span onClick={handleForceUpdate} style={{cursor:"pointer", color:theme.primary}}>Refresh App v{APP_VERSION}</span>
        </div>
      </footer>

      {/* MODAL: EARLY EXIT */}
      <AnimatePresence>
        {showConfirm && (
          <div style={modalOverlay}>
            <motion.div initial={{scale:0.9, opacity: 0}} animate={{scale:1, opacity: 1}} exit={{scale:0.9, opacity: 0}} style={modalContent}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "15px" }}><AlertTriangle size={40} color={theme.warning} /></div>
              <h2 style={{ marginBottom: "10px" }}>Emergency Withdrawal?</h2>
              <p style={{ color: theme.textMuted, fontSize: "14px", lineHeight: "1.5" }}>Bypassing the lock timer incurs a <strong style={{color: theme.danger}}>10% penalty fee</strong>. Continue?</p>
              <div style={{display:"flex", gap:"10px", marginTop:"20px"}}>
                <button onClick={()=>setShowConfirm(false)} style={secondaryBtn}>Cancel</button>
                <button onClick={()=>executeWithdrawal(true)} style={confirmBtn}>Withdraw Now</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: TERMS & PRIVACY */}
      <AnimatePresence>
        {showLegal && (
          <div style={modalOverlay}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={legalContent}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "800", margin: 0 }}>Terms & Privacy</h2>
                <X size={20} style={{ cursor: "pointer", color: theme.textMuted }} onClick={() => setShowLegal(false)} />
              </div>
              <div style={legalScrollArea}>
                <h4 style={legalHeading}>1. Non-Custodial Protocol</h4>
                <p style={legalText}>STX Vault is a decentralized smart-contract tool. We never hold your private keys. You are solely responsible for your wallet's security and access.</p>
                <h4 style={legalHeading}>2. Penalty Transparency</h4>
                <p style={legalText}>By utilizing the "Early Exit" or Emergency Withdrawal function, you explicitly agree to a 10% protocol fee deducted from your principal amount.</p>
                <h4 style={legalHeading}>3. Privacy Policy</h4>
                <p style={legalText}>We do not collect, store, or sell any personal data. All transaction data and history displayed is pulled directly from public Stacks blockchain nodes.</p>
              </div>
              <button onClick={() => setShowLegal(false)} style={actionBtn}>I Understand & Accept</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- ALL STYLES ---
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", borderBottom: `1px solid ${theme.cardBorder}`, backgroundColor: "rgba(11,14,20,0.8)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 };
const cardStyle = { backgroundColor: theme.card, padding: "24px", borderRadius: "20px", border: `1px solid ${theme.cardBorder}` };
const gridContainer = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" };
const inputStyle = { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "10px", border: `1px solid ${theme.cardBorder}`, backgroundColor: "#000", color: "#fff", outline: "none", boxSizing: "border-box" };
const actionBtn = { width: "100%", padding: "14px", borderRadius: "10px", backgroundColor: theme.primary, color: "#fff", border: "none", fontWeight: "800", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" };
const connectBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" };
const exitBtn = { backgroundColor: "rgba(239,68,68,0.1)", border: `1px solid ${theme.danger}44`, color: theme.danger, padding: "8px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center" };
const addressPill = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "8px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: "700", color: theme.primary };
const badge = { color: theme.primary, border: `1px solid ${theme.primary}`, padding: "6px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: "900", marginBottom: "20px", display: "inline-block", letterSpacing: "1.5px" };
const heroBtn = { backgroundColor: theme.primary, color: "#fff", padding: "18px 48px", borderRadius: "14px", fontSize: "18px", fontWeight: "800", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center" };
const shareBtn = { width: "100%", padding: "12px", marginTop: "15px", borderRadius: "10px", backgroundColor: "#000", border: `1px solid ${theme.cardBorder}`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" };
const statusDotSmall = { width: "6px", height: "6px", borderRadius: "50%", marginRight: "8px" };
const pillStyle = { display: "flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: "100px", border: `1px solid ${theme.cardBorder}` };
const cardHead = { display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", fontSize: "16px", margin: 0 };
const statRow = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" };
const statValue = { fontSize: "20px", fontWeight: "800" };
const historyRow = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "10px", marginBottom: "8px", textDecoration: "none", color: "inherit", fontSize: "13px", border: `1px solid ${theme.cardBorder}` };
const leaderRow = { display: "flex", justifyContent: "space-between", padding: "12px", borderBottom: `1px solid ${theme.cardBorder}`, fontSize: "13px" };
const footerStyle = { padding: "40px", borderTop: `1px solid ${theme.cardBorder}`, marginTop: "60px", display: "flex", justifyContent: "center" };

// Legal & Confirmation Modal Styles
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" };
const modalContent = { backgroundColor: theme.card, padding: "40px", borderRadius: "30px", border: `1px solid ${theme.cardBorder}`, textAlign: "center", maxWidth: "400px", width: "100%" };
const legalContent = { backgroundColor: theme.card, padding: "30px", borderRadius: "28px", maxWidth: "500px", width: "100%", border: `1px solid ${theme.cardBorder}`, textAlign: "left" };
const legalScrollArea = { height: "220px", overflowY: "auto", padding: "20px", backgroundColor: "#000", borderRadius: "12px", marginBottom: "20px", border: `1px solid ${theme.cardBorder}` };
const legalHeading = { fontSize: "14px", color: theme.primary, marginBottom: "8px", margin: 0 };
const legalText = { fontSize: "13px", color: theme.textMuted, marginBottom: "20px", lineHeight: "1.6" };
const confirmBtn = { flex: 1, padding: "14px", backgroundColor: theme.danger, color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" };
const secondaryBtn = { flex: 1, padding: "14px", backgroundColor: "#30363D", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" };
const dangerBtn = { backgroundColor: "transparent", color: theme.danger, border: `1px solid ${theme.danger}`, padding: "10px", borderRadius: "10px", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" };
const maintCard = { textAlign: "center", padding: "100px 20px", backgroundColor: theme.card, borderRadius: "30px", border: `1px solid ${theme.cardBorder}` };

export default App;
