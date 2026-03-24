/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { uintCV, PostConditionMode, Pc } from "@stacks/transactions";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  Lock, 
  Unlock, 
  ExternalLink, 
  LogOut, 
  ShieldCheck, 
  ArrowUpRight,
  Loader2
} from "lucide-react";

// --- Advanced Styling Configuration ---
const theme = {
  primary: "#5546FF",
  primaryHover: "#4335E6",
  bg: "#F9FAFB",
  card: "#FFFFFF",
  textMain: "#111827",
  textMuted: "#6B7280",
  danger: "#EF4444",
  success: "#10B981"
};

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

const contractAddress = "SPYOURMAINNETADDRESSHERE"; 
const contractName = "stx-vault-v3"; 

function App() {
  const [userData, setUserData] = useState(null);
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [isPending, setIsPending] = useState(false);
  const [txId, setTxId] = useState("");

  const checkUserSession = useCallback(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
      setStatus("Connected");
    }
  }, []);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const handleConnect = () => {
    showConnect({
      userSession,
      appDetails: {
        name: "STX Vault",
        icon: window.location.origin + "/logo192.png",
      },
      onFinish: () => {
        window.location.reload();
      }
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
          setStatus("Deposit broadcasted!");
          setIsPending(false);
        },
      });
    } catch (err) {
      console.error(err);
      setStatus("Error");
      setIsPending(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userData) return;
    setIsPending(true);
    try {
      setStatus("Requesting withdrawal...");
      await openContractCall({
        network: STACKS_MAINNET,
        contractAddress,
        contractName,
        functionName: "withdraw-stx",
        functionArgs: [],
        onFinish: (data) => {
          setTxId(data.txId);
          setStatus("Withdrawal broadcasted!");
          setIsPending(false);
        },
      });
    } catch (err) {
      console.error(err);
      setStatus("Error");
      setIsPending(false);
    }
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* --- GLASSMORPHISM HEADER --- */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 40px",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <motion.img 
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            src="/logo192.png" 
            style={{ width: "38px", height: "38px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(85, 70, 255, 0.2)" }} 
          />
          <div>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "22px", fontWeight: "700", color: theme.primary, letterSpacing: "-0.5px" }}>STX</span>
            <span style={{ fontSize: "11px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginTop: "-4px" }}>Vault</span>
          </div>
        </div>

        <div>
          {!userData ? (
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConnect} 
              style={{ ...btnBase, backgroundColor: theme.primary }}
            >
              <Wallet size={18} style={{ marginRight: "8px" }} /> Connect Wallet
            </motion.button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ backgroundColor: "#EEF2FF", padding: "6px 14px", borderRadius: "12px", border: "1px solid #E0E7FF", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.success }}></div>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#4338CA" }}>
                  {userAddress?.substring(0, 5)}...{userAddress?.substring(userAddress.length - 4)}
                </span>
              </div>
              <motion.button 
                whileHover={{ backgroundColor: "#FEE2E2" }}
                onClick={handleDisconnect} 
                style={{ background: "none", border: "none", color: theme.danger, cursor: "pointer", padding: "8px", borderRadius: "8px" }}
              >
                <LogOut size={20} />
              </motion.button>
            </div>
          )}
        </div>
      </header>

      {/* --- MAIN DASHBOARD --- */}
      <main style={{ padding: "60px 20px" }}>
        <AnimatePresence mode="wait">
          {!userData ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center" }}
            >
              <ShieldCheck size={64} color={theme.primary} style={{ marginBottom: "20px" }} />
              <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "48px", marginBottom: "16px", color: theme.textMain }}>Bitcoin-Grade Security</h1>
              <p style={{ fontSize: "18px", color: theme.textMuted, lineHeight: "1.6", marginBottom: "32px" }}>
                The safest way to manage your STX savings. Non-custodial, open-source, and secured by the Stacks blockchain.
              </p>
              <button onClick={handleConnect} style={{ ...btnBase, backgroundColor: theme.primary, padding: "16px 40px", fontSize: "18px" }}>
                Get Started
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ maxWidth: "480px", margin: "0 auto", backgroundColor: theme.card, padding: "32px", borderRadius: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", margin: 0, fontSize: "24px" }}>Vault Control</h2>
                <div style={{ padding: "8px", backgroundColor: "#F3F4F6", borderRadius: "10px" }}><Lock size={20} color={theme.primary} /></div>
              </div>

              <div style={{ textAlign: "left" }}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={labelStyle}>Amount to Deposit (STX)</label>
                  <div style={{ position: "relative" }}>
                    <input type="number" placeholder="0.00" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={inputStyle} />
                    <span style={{ position: "absolute", right: "12px", top: "12px", fontWeight: "700", color: "#9CA3AF" }}>STX</span>
                  </div>
                </div>

                <div style={{ marginBottom: "32px" }}>
                  <label style={labelStyle}>Lock Duration (Days)</label>
                  <input type="number" placeholder="30" value={lockDays} onChange={e => setLockDays(e.target.value)} style={inputStyle} />
                  <p style={{ fontSize: "12px", color: theme.textMuted, marginTop: "6px" }}>1 day ≈ 144 Stacks blocks</p>
                </div>

                <motion.button 
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  disabled={isPending}
                  onClick={handleDeposit} 
                  style={{ ...btnBase, width: "100%", backgroundColor: theme.primary, padding: "16px", fontSize: "16px", marginBottom: "16px", opacity: isPending ? 0.7 : 1 }}
                >
                  {isPending ? <Loader2 className="animate-spin" size={20} /> : <><Lock size={18} style={{ marginRight: "8px" }} /> Lock My Assets</>}
                </motion.button>

                <button onClick={handleWithdraw} style={{ width: "100%", padding: "14px", background: "none", border: "1px solid #E5E7EB", borderRadius: "12px", color: theme.textMain, fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <Unlock size={18} /> Withdraw Available
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- STATUS FOOTER --- */}
        <motion.div layout style={{ marginTop: "40px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", backgroundColor: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5E7EB" }}>
            <span style={{ fontSize: "13px", color: theme.textMuted }}>Network Status:</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: theme.primary }}>{status}</span>
          </div>
          
          {txId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: "16px" }}>
              <a 
                href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: theme.primary, textDecoration: "none", fontSize: "14px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                View on Explorer <ArrowUpRight size={14} />
              </a>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

// --- Reusable Modern Styles ---
const btnBase = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  border: "none",
  borderRadius: "12px",
  fontWeight: "600",
  cursor: "pointer",
  padding: "10px 20px",
  fontFamily: "'Inter', sans-serif"
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: theme.textMain,
  marginBottom: "8px",
  textTransform: "uppercase",
  letterSpacing: "0.5px"
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #E5E7EB",
  fontSize: "16px",
  backgroundColor: "#F9FAFB",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s"
};

export default App;
