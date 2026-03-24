/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { StacksMainnet } from "@stacks/network";
// v6.x specific names
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
  LogOut, ShieldCheck, ArrowUpRight, Loader2, Coins, Clock, RefreshCw, Zap 
} from "lucide-react";

const theme = {
  primary: "#5546FF",
  bg: "#0B0E14",
  card: "#161B22",
  cardBorder: "#30363D",
  textMain: "#FFFFFF",
  textMuted: "#8B949E",
  accent: "#79C0FF"
};

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

// --- REPLACE WITH YOUR CONTRACT ---
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
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsRefreshing(false);
    }
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
      appDetails: { 
        name: "STX Vault", 
        icon: window.location.origin + "/logo192.png" 
      },
      onFinish: () => { window.location.reload(); },
    });
  };

  const handleDeposit = async () => {
    if (!userData || !stxAmount) return;
    setIsPending(true);
    try {
      const userAddress = userData.profile.stxAddress.mainnet;
      const amountMicro = BigInt(Math.floor(Number(stxAmount) * 1000000));
      
      // v6 Post Condition Style
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
        onFinish: (data) => {
          setTxId(data.txId);
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
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={logoBox}><Zap size={20} fill="#fff" /></div>
          <span style={{ fontWeight: "800", fontSize: "18px", letterSpacing: "-0.5px" }}>STX VAULT</span>
        </div>
        {!userData ? (
          <button onClick={handleConnect} style={connectBtn}>Connect Wallet</button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={addressPill}>{userAddress?.substring(0, 6)}...</span>
            <button onClick={() => { userSession.signUserOut(); window.location.reload(); }} style={{ background: "none", border: "none", color: theme.textMuted, cursor: "pointer" }}><LogOut size={18} /></button>
          </div>
        )}
      </header>

      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 20px" }}>
        <AnimatePresence>
          {!userData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", maxWidth: "500px" }}>
              <div style={badge}>V8.1 PREMIUM PROTOCOL</div>
              <h1 style={{ fontSize: "56px", fontWeight: "900", marginBottom: "20px", lineHeight: 1 }}>Protect Your <span style={{ color: theme.primary }}>STX.</span></h1>
              <p style={{ color: theme.textMuted, fontSize: "18px", marginBottom: "40px" }}>Secure, non-custodial vault for the Stacks ecosystem.</p>
              <button onClick={handleConnect} style={heroBtn}>Launch dApp <ArrowUpRight size={20} /></button>
            </motion.div>
          ) : (
            <div style={{ width: "100%", maxWidth: "900px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={cardStyle}>
                  <h3 style={{ marginBottom: "20px" }}>Holdings</h3>
                  <div style={statRow}><Coins color={theme.primary} /> <div><div style={statLabel}>Current</div><div style={statValue}>{vaultData.amount} STX</div></div></div>
                  <div style={statRow}><Clock color={theme.accent} /> <div><div style={statLabel}>Unlock Block</div><div style={statValue}>#{vaultData.unlock}</div></div></div>
                </div>
                <div style={cardStyle}>
                  <h3 style={{ marginBottom: "20px" }}>Deposit</h3>
                  <input type="number" placeholder="Amount (STX)" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={inputStyle} />
                  <input type="number" placeholder="Lock Days" value={lockDays} onChange={e => setLockDays(e.target.value)} style={inputStyle} />
                  <button onClick={handleDeposit} disabled={isPending} style={actionBtn}>{isPending ? <Loader2 className="animate-spin" /> : "Secure Deposit"}</button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- STYLES ---
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: `1px solid ${theme.cardBorder}` };
const logoBox = { backgroundColor: theme.primary, padding: "8px", borderRadius: "8px" };
const connectBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" };
const addressPill = { backgroundColor: theme.card, padding: "6px 12px", borderRadius: "8px", fontSize: "13px", border: `1px solid ${theme.cardBorder}` };
const badge = { color: theme.primary, fontSize: "12px", fontWeight: "800", letterSpacing: "2px", marginBottom: "15px" };
const heroBtn = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "16px 36px", borderRadius: "12px", fontSize: "18px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "10px" };
const cardStyle = { backgroundColor: theme.card, padding: "30px", borderRadius: "20px", border: `1px solid ${theme.cardBorder}` };
const statRow = { display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" };
const statLabel = { fontSize: "11px", color: theme.textMuted, textTransform: "uppercase" };
const statValue = { fontSize: "22px", fontWeight: "700" };
const inputStyle = { width: "100%", backgroundColor: "#000", border: `1px solid ${theme.cardBorder}`, color: "#fff", padding: "12px", borderRadius: "10px", marginBottom: "12px", boxSizing: "border-box" };
const actionBtn = { width: "100%", backgroundColor: theme.primary, color: "#fff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", display: "flex", justifyContent: "center" };

export default App;
