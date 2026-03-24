/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
import * as StacksConnect from "@stacks/connect";
import * as StacksNetwork from "@stacks/network";
import * as StacksTransactions from "@stacks/transactions";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, Lock, Unlock, LogOut, ShieldCheck, 
  ArrowUpRight, Loader2, Coins, Clock, RefreshCw, Zap 
} from "lucide-react";

// --- PREMIUM DARK THEME ---
const theme = {
  primary: "#5546FF",
  primaryHover: "#4335E6",
  bg: "#0B0E14", // Deep Dark
  card: "#161B22", // Slate Gray
  cardBorder: "#30363D",
  textMain: "#FFFFFF",
  textMuted: "#8B949E",
  accent: "#79C0FF",
  success: "#3FB950"
};

const appConfig = new StacksConnect.AppConfig(["store_write", "publish_data"]);
const userSession = new StacksConnect.UserSession({ appConfig });

// --- REPLACE WITH YOUR ADDRESS ---
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

  // Helper to handle the "Not Exported" Vercel headache
  const callReadOnly = StacksTransactions.fetchCallReadOnlyFunction || 
                       StacksTransactions.readOnlyFunctionCall || 
                       StacksTransactions.callReadOnlyFunction;

  const fetchVaultStatus = useCallback(async (address) => {
    if (!address) return;
    setIsRefreshing(true);
    try {
      const result = await callReadOnly({
        network: new StacksNetwork.StacksMainnet(),
        contractAddress,
        contractName,
        functionName: "get-vault-status",
        functionArgs: [StacksTransactions.uintCV(address)],
        senderAddress: address,
      });
      
      const json = StacksTransactions.cvToJSON(result);
      if (json && json.value) {
        setVaultData({
          amount: Number(json.value.amount.value) / 1000000,
          unlock: Number(json.value["unlock-block"].value)
        });
      }
    } catch (e) {
      console.error("Vault fetch error:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [callReadOnly]);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const user = userSession.loadUserData();
      setUserData(user);
      setStatus("Connected");
      fetchVaultStatus(user.profile.stxAddress.mainnet);
    }
  }, [fetchVaultStatus]);

  const handleConnect = () => {
    console.log("Connect triggered");
    StacksConnect.showConnect({
      userSession,
      appDetails: { 
        name: "STX Vault", 
        icon: window.location.origin + "/logo192.png" 
      },
      onFinish: () => {
        window.location.reload();
      },
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
      const userAddress = userData.profile.stxAddress.mainnet;
      const amountInMicroSTX = BigInt(Math.floor(Number(stxAmount) * 1000000));
      
      await StacksConnect.openContractCall({
        network: new StacksNetwork.StacksMainnet(),
        contractAddress,
        contractName,
        functionName: "deposit-stx",
        functionArgs: [
            StacksTransactions.uintCV(amountInMicroSTX), 
            StacksTransactions.uintCV(Math.floor(Number(lockDays) * 144))
        ],
        postConditions: [
            StacksTransactions.Pc.principal(userAddress).willSendEq(amountInMicroSTX).ustx()
        ],
        postConditionMode: StacksTransactions.PostConditionMode.Deny,
        onFinish: (data) => {
          setTxId(data.txId);
          setStatus("Broadcasted!");
          setIsPending(false);
        },
      });
    } catch (err) {
      setIsPending(false);
    }
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", color: theme.textMain, fontFamily: "'Inter', sans-serif" }}>
      
      {/* --- HEADER --- */}
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={logoContainer}><Zap size={20} color="#fff" fill="#fff" /></div>
          <span style={{ fontWeight: "800", fontSize: "20px", letterSpacing: "-0.5px" }}>STX VAULT</span>
        </div>
        {!userData ? (
          <button onClick={handleConnect} style={connectBtn}>Connect Wallet</button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <span style={addressPill}>{userAddress?.substring(0, 6)}...{userAddress?.substring(userAddress.length - 4)}</span>
            <button onClick={handleDisconnect} style={{ color: theme.textMuted, background: "none", border: "none", cursor: "pointer" }}><LogOut size={18} /></button>
          </div>
        )}
      </header>

      {/* --- CONTENT --- */}
      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 20px" }}>
        <AnimatePresence mode="wait">
          {!userData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", maxWidth: "600px" }}>
              <div style={badge}>v8.1 Secure Protocol</div>
              <h1 style={heroTitle}>The Institution-Grade <span style={{ color: theme.primary }}>STX Vault.</span></h1>
              <p style={{ color: theme.textMuted, fontSize: "18px", marginBottom: "40px", lineHeight: "1.6" }}>
                Secure your digital future on the most robust smart contract layer. Non-custodial, open-source, and Bitcoin-settled.
              </p>
              <button onClick={handleConnect} style={heroBtn}>Launch dApp <ArrowUpRight size={20} /></button>
            </motion.div>
          ) : (
            <div style={{ width: "100%", maxWidth: "1000px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
                
                {/* STATUS CARD */}
                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                    <h3 style={{ margin: 0 }}>Portfolio</h3>
                    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} color={theme.textMuted} />
                  </div>
                  <div style={statRow}>
                    <Coins size={24} color={theme.primary} />
                    <div>
                      <div style={statLabel}>Locked Balance</div>
                      <div style={statValue}>{vaultData.amount.toLocaleString()} STX</div>
                    </div>
                  </div>
                  <div style={statRow}>
                    <Clock size={24} color={theme.accent} />
                    <div>
                      <div style={statLabel}>Unlock Height</div>
                      <div style={statValue}>#{vaultData.unlock || "0"}</div>
                    </div>
                  </div>
                </div>

                {/* ACTION CARD */}
                <div style={cardStyle}>
                  <h3 style={{ marginBottom: "24px" }}>Vault Control</h3>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={inputLabel}>Amount (STX)</label>
                    <input type="number" placeholder="0.00" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: "25px" }}>
                    <label style={inputLabel}>Lock Duration (Days)</label>
                    <input type="number" placeholder="30" value={lockDays} onChange={e => setLockDays(e.target.value)} style={inputStyle} />
                  </div>
                  <button onClick={handleDeposit} disabled={isPending} style={actionBtn}>
                    {isPending ? <Loader2 className="animate-spin" /> : <><Lock size={18} /> Secure Deposit</>}
                  </button>
                </div>

              </div>
              {txId && (
                <div style={txNotice}>
                   Broadcasted! <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noreferrer" style={{ color: theme.primary }}>View Explorer</a>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- PREMIUM STYLES ---
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 60px", borderBottom: `1px solid ${theme.cardBorder}`, backgroundColor: "rgba(11, 14, 20, 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 };
const logoContainer = { backgroundColor: theme.primary, padding: "8px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" };
const connectBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" };
const addressPill = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "6px 14px", borderRadius: "10px", fontSize: "14px", color: theme.accent };
const heroTitle = { fontSize: "64px", fontWeight: "900", lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-2px" };
const heroBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "18px 42px", borderRadius: "14px", fontSize: "18px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "10px", boxShadow: `0 10px 30px rgba(85, 70, 255, 0.3)` };
const badge = { backgroundColor: "rgba(85, 70, 255, 0.15)", color: theme.primary, padding: "6px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: "700", display: "inline-block", marginBottom: "20px", border: `1px solid ${theme.primary}` };
const cardStyle = { backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, padding: "32px", borderRadius: "24px" };
const statRow = { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", padding: "16px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "16px" };
const statLabel = { fontSize: "12px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1px" };
const statValue = { fontSize: "24px", fontWeight: "700" };
const inputLabel = { display: "block", fontSize: "12px", color: theme.textMuted, marginBottom: "8px", fontWeight: "600" };
const inputStyle = { width: "100%", backgroundColor: theme.bg, border: `1px solid ${theme.cardBorder}`, color: "#fff", padding: "14px", borderRadius: "12px", outline: "none", boxSizing: "border-box" };
const actionBtn = { width: "100%", backgroundColor: theme.primary, color: "#fff", border: "none", padding: "16px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" };
const txNotice = { marginTop: "30px", textAlign: "center", padding: "15px", backgroundColor: theme.card, borderRadius: "12px", border: `1px solid ${theme.cardBorder}`, fontSize: "14px" };

export default App;
