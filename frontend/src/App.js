/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { uintCV, PostConditionMode, Pc, readOnlyFunctionCall, cvToJSON } from "@stacks/transactions";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  Lock, 
  Unlock, 
  LogOut, 
  ShieldCheck, 
  ArrowUpRight, 
  Loader2, 
  Coins, 
  Clock,
  RefreshCw
} from "lucide-react";

// --- Theme Configuration ---
const theme = {
  primary: "#5546FF",
  primaryHover: "#4335E6",
  bg: "#F9FAFB",
  card: "#FFFFFF",
  textMain: "#111827",
  textMuted: "#6B7280",
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B"
};

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

// --- IMPORTANT: Replace with your deployed contract address ---
const contractAddress = "SPYOURMAINNETADDRESSHERE"; 
const contractName = "stx-vault-v3"; 

function App() {
  const [userData, setUserData] = useState(null);
  const [vaultData, setVaultData] = useState({ amount: 0, unlock: 0 });
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [isPending, setIsPending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [txId, setTxId] = useState("");

  // --- FETCH DATA FROM BLOCKCHAIN ---
  const fetchVaultStatus = useCallback(async (address) => {
    setIsRefreshing(true);
    try {
      const result = await readOnlyFunctionCall({
        network: STACKS_MAINNET,
        contractAddress,
        contractName,
        functionName: "get-vault-status",
        functionArgs: [uintCV(address)],
        senderAddress: address,
      });
      const json = cvToJSON(result);
      if (json.value) {
        setVaultData({
          amount: Number(json.value.amount.value) / 1000000,
          unlock: Number(json.value["unlock-block"].value)
        });
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // --- AUTO-REFRESH LOGIC (Every 30 Seconds) ---
  useEffect(() => {
    let interval;
    if (userSession.isUserSignedIn()) {
      const user = userSession.loadUserData();
      setUserData(user);
      setStatus("Connected");
      fetchVaultStatus(user.profile.stxAddress.mainnet);

      interval = setInterval(() => {
        fetchVaultStatus(user.profile.stxAddress.mainnet);
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [fetchVaultStatus]);

  const handleConnect = () => {
    showConnect({
      userSession,
      appDetails: { name: "STX Vault", icon: window.location.origin + "/logo192.png" },
      onFinish: () => window.location.reload(),
    });
  };

  const handleDisconnect = () => {
    userSession.signUserOut();
    window.location.reload();
  };

  const handleDeposit = async () => {
    if (!userData || !stxAmount) return;
    setIsPending(true);
    try {
      setStatus("Signing...");
      const userAddress = userData.profile.stxAddress.mainnet;
      const amountInMicroSTX = BigInt(Math.floor(Number(stxAmount) * 1000000));
      const postCondition = Pc.principal(userAddress).willSendEq(amountInMicroSTX).ustx();

      await openContractCall({
        network: STACKS_MAINNET,
        contractAddress,
        contractName,
        functionName: "deposit-stx",
        functionArgs: [uintCV(amountInMicroSTX), uintCV(Math.floor(Number(lockDays) * 144))],
        postConditions: [postCondition],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => {
          setTxId(data.txId);
          setStatus("Broadcasted!");
          setIsPending(false);
        },
      });
    } catch (err) {
      setStatus("Error");
      setIsPending(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userData) return;
    setIsPending(true);
    try {
      setStatus("Withdrawing...");
      await openContractCall({
        network: STACKS_MAINNET,
        contractAddress,
        contractName,
        functionName: "withdraw-stx",
        functionArgs: [],
        onFinish: (data) => {
          setTxId(data.txId);
          setStatus("Broadcasted!");
          setIsPending(false);
        },
      });
    } catch (err) {
      setStatus("Error");
      setIsPending(false);
    }
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* --- HEADER --- */}
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo192.png" alt="Logo" style={{ width: "36px", height: "36px", borderRadius: "8px" }} />
          <div>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: "700", color: theme.primary }}>STX</span>
            <span style={{ fontSize: "10px", color: theme.textMuted, textTransform: "uppercase", display: "block", marginTop: "-4px", letterSpacing: "1px" }}>Vault</span>
          </div>
        </div>
        {!userData ? (
          <button onClick={handleConnect} style={{ ...btnBase, backgroundColor: theme.primary }}><Wallet size={18} /> Connect</button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
             <span style={pillStyle}>{userAddress?.substring(0, 5)}...{userAddress?.substring(userAddress.length - 4)}</span>
             <button onClick={handleDisconnect} style={{ background: "none", border: "none", color: theme.danger, cursor: "pointer" }}><LogOut size={20} /></button>
          </div>
        )}
      </header>

      {/* --- MAIN CONTENT --- */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <AnimatePresence mode="wait">
          {!userData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", maxWidth: "550px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <ShieldCheck size={72} color={theme.primary} style={{ marginBottom: "20px" }} />
              <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "48px", marginBottom: "16px", lineHeight: "1.1", color: theme.textMain }}>Bitcoin-Grade Savings</h1>
              <p style={{ color: theme.textMuted, fontSize: "18px", marginBottom: "32px" }}>The most secure way to lock and grow your STX. Non-custodial and open-source.</p>
              <button onClick={handleConnect} style={{ ...btnBase, backgroundColor: theme.primary, padding: "16px 48px", fontSize: "18px", boxShadow: "0 10px 20px rgba(85, 70, 255, 0.2)" }}>
                Get Started
              </button>
            </motion.div>
          ) : (
            <div style={{ maxWidth: "1000px", width: "100%" }}>
              {/* REFRESH INDICATOR */}
              <div style={{ textAlign: "right", marginBottom: "12px" }}>
                 <button onClick={() => fetchVaultStatus(userAddress)} style={{ background: "none", border: "none", color: theme.textMuted, cursor: "pointer", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                    {isRefreshing ? "Syncing..." : "Live Data"}
                 </button>
              </div>

              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px" }}>
                
                {/* --- LEFT: STATS --- */}
                <div style={cardStyle}>
                  <h3 style={cardTitle}>Vault Analytics</h3>
                  <div style={statBox}>
                     <Coins size={24} color={theme.primary} />
                     <div>
                       <p style={statLabel}>Current Balance</p>
                       <p style={statValue}>{vaultData.amount.toLocaleString()} STX</p>
                     </div>
                  </div>
                  <div style={statBox}>
                     <Clock size={24} color={theme.primary} />
                     <div>
                       <p style={statLabel}>Unlock Height</p>
                       <p style={statValue}>#{vaultData.unlock || "---"}</p>
                     </div>
                  </div>
                  {txId && status === "Broadcasted!" && (
                    <div style={pendingBox}>
                      <Loader2 size={14} className="animate-spin" /> Confirming on-chain...
                    </div>
                  )}
                </div>

                {/* --- RIGHT: ACTIONS --- */}
                <div style={cardStyle}>
                  <h3 style={cardTitle}>Vault Management</h3>
                  <label style={labelStyle}>Amount to Save (STX)</label>
                  <input type="number" placeholder="0.00" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={inputStyle} />
                  
                  <label style={labelStyle}>Lock Duration (Days)</label>
                  <input type="number" placeholder="30" value={lockDays} onChange={e => setLockDays(e.target.value)} style={inputStyle} />
                  
                  <button onClick={handleDeposit} disabled={isPending} style={{ ...btnBase, width: "100%", backgroundColor: theme.primary, marginBottom: "12px" }}>
                     {isPending ? <Loader2 className="animate-spin" /> : <><Lock size={18} /> Secure Deposit</>}
                  </button>
                  <button onClick={handleWithdraw} style={secondaryBtn}><Unlock size={18} /> Release Assets</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* --- FOOTER --- */}
      <footer style={{ padding: "20px", textAlign: "center", borderTop: "1px solid #eee" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", backgroundColor: "#fff", borderRadius: "20px", border: "1px solid #eee" }}>
            <span style={{ fontSize: "12px", color: theme.textMuted }}>Network:</span>
            <span style={{ fontSize: "12px", fontWeight: "700", color: theme.primary }}>{status}</span>
          </div>
          {txId && (
            <div style={{ marginTop: "12px" }}>
              <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noreferrer" style={linkStyle}>
                Explorer Receipt <ArrowUpRight size={14} />
              </a>
            </div>
          )}
      </footer>
    </div>
  );
}

// --- Styles ---
const headerStyle = { position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 40px", backgroundColor: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)", borderBottom: "1px solid #eee" };
const pillStyle = { backgroundColor: "#EEF2FF", padding: "6px 14px", borderRadius: "10px", color: "#4338CA", fontSize: "14px", fontWeight: "600" };
const cardStyle = { backgroundColor: "#fff", padding: "32px", borderRadius: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.03)", border: "1px solid #f0f0f0" };
const cardTitle = { fontFamily: "'Outfit', sans-serif", marginTop: 0, marginBottom: "24px", fontSize: "20px", color: theme.textMain };
const statBox = { display: "flex", gap: "15px", alignItems: "center", marginBottom: "16px", padding: "16px", backgroundColor: "#F9FAFB", borderRadius: "16px" };
const statLabel = { margin: 0, fontSize: "11px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" };
const statValue = { margin: 0, fontSize: "24px", fontWeight: "700", color: theme.textMain };
const pendingBox = { marginTop: "16px", padding: "12px", backgroundColor: "#FFFBEB", borderRadius: "12px", border: "1px solid #FEF3C7", fontSize: "13px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px" };
const btnBase = { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "white", border: "none", borderRadius: "12px", fontWeight: "600", cursor: "pointer", padding: "12px 24px", transition: "all 0.2s" };
const secondaryBtn = { ...btnBase, width: "100%", backgroundColor: "transparent", border: "1.5px solid #eee", color: theme.textMain };
const labelStyle = { display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: theme.textMuted, textTransform: "uppercase" };
const inputStyle = { width: "100%", padding: "14px", borderRadius: "12px", border: "1.5px solid #eee", marginBottom: "20px", fontSize: "16px", outline: "none", boxSizing: "border-box", backgroundColor: "#F9FAFB" };
const linkStyle = { color: theme.primary, textDecoration: "none", fontWeight: "600", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "4px" };

export default App;
