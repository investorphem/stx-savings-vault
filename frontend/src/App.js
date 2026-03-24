/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
// v7.3.1 Naming: fetchCallReadOnlyFunction
import { 
  uintCV, 
  PostConditionMode, 
  Pc, 
  fetchCallReadOnlyFunction, 
  cvToJSON 
} from "@stacks/transactions";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, Lock, Unlock, LogOut, ShieldCheck, 
  ArrowUpRight, Loader2, Coins, Clock, RefreshCw 
} from "lucide-react";

const theme = {
  primary: "#5546FF",
  bg: "#F9FAFB",
  textMain: "#111827",
  textMuted: "#6B7280",
  danger: "#EF4444"
};

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

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

  const fetchVaultStatus = useCallback(async (address) => {
    if (!address) return;
    setIsRefreshing(true);
    try {
      // In Stacks v7, callReadOnlyFunction became fetchCallReadOnlyFunction
      const result = await fetchCallReadOnlyFunction({
        network: STACKS_MAINNET,
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
      console.error("Vault fetch error:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const user = userSession.loadUserData();
      setUserData(user);
      setStatus("Connected");
      fetchVaultStatus(user.profile.stxAddress.mainnet);

      const interval = setInterval(() => {
        fetchVaultStatus(user.profile.stxAddress.mainnet);
      }, 30000);
      return () => clearInterval(interval);
    }
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
      
      await openContractCall({
        network: STACKS_MAINNET,
        contractAddress,
        contractName,
        functionName: "deposit-stx",
        functionArgs: [uintCV(amountInMicroSTX), uintCV(Math.floor(Number(lockDays) * 144))],
        postConditions: [Pc.principal(userAddress).willSendEq(amountInMicroSTX).ustx()],
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

  // --- Styles remain consistent for UI quality ---
  const headerStyle = { display: "flex", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid #eee", backgroundColor: "#fff" };
  const btnBase = { backgroundColor: theme.primary, color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", fontWeight: "600", cursor: "pointer" };
  const cardStyle = { backgroundColor: "#fff", padding: "24px", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" };
  const statBox = { display: "flex", alignItems: "center", gap: "10px", padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "12px", marginBottom: "12px" };
  const inputStyle = { width: "100%", padding: "12px", marginBottom: "12px", borderRadius: "10px", border: "1.5px solid #eee", fontSize: "16px", outline: "none" };

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldCheck size={32} color={theme.primary} />
          <span style={{ fontWeight: "800", fontSize: "20px" }}>STX Vault</span>
        </div>
        {!userData ? (
          <button onClick={handleConnect} style={btnBase}>Connect Wallet</button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: theme.primary }}>{userAddress?.substring(0, 6)}...</span>
            <button onClick={handleDisconnect} style={{ color: theme.danger, background: "none", border: "none", cursor: "pointer" }}><LogOut size={20} /></button>
          </div>
        )}
      </header>

      <main style={{ padding: "40px", display: "flex", justifyContent: "center" }}>
        <AnimatePresence>
          {!userData ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", maxWidth: "400px" }}>
              <h1 style={{ fontSize: "3rem", marginBottom: "10px" }}>Save Smart.</h1>
              <p style={{ color: theme.textMuted, marginBottom: "30px" }}>The non-custodial savings vault built on Bitcoin via Stacks.</p>
              <button onClick={handleConnect} style={{ ...btnBase, padding: "18px 48px", fontSize: "18px" }}>Launch dApp</button>
            </motion.div>
          ) : (
            <div style={{ width: "100%", maxWidth: "900px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0 }}>Dashboard</h2>
                <div style={{ fontSize: "12px", color: theme.textMuted, display: "flex", alignItems: "center", gap: "5px" }}>
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> Live
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={cardStyle}>
                  <h4 style={{ color: theme.textMuted, marginBottom: "16px", textTransform: "uppercase", fontSize: "12px" }}>Current Holdings</h4>
                  <div style={statBox}><Coins color={theme.primary} /> <span style={{ fontSize: "24px", fontWeight: "700" }}>{vaultData.amount} STX</span></div>
                  <div style={statBox}><Clock color={theme.primary} /> <span style={{ fontWeight: "600" }}>Unlock at Block #{vaultData.unlock || "---"}</span></div>
                  {txId && status === "Broadcasted!" && <div style={{ color: theme.primary, fontSize: "12px", marginTop: "10px" }}>Processing transaction...</div>}
                </div>

                <div style={cardStyle}>
                  <h4 style={{ color: theme.textMuted, marginBottom: "16px", textTransform: "uppercase", fontSize: "12px" }}>Manage Funds</h4>
                  <input type="number" placeholder="Amount (STX)" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={inputStyle} />
                  <input type="number" placeholder="Lock Time (Days)" value={lockDays} onChange={e => setLockDays(e.target.value)} style={inputStyle} />
                  <button onClick={handleDeposit} disabled={isPending} style={{ ...btnBase, width: "100%", marginBottom: "12px" }}>
                    {isPending ? "Confirming..." : "Deposit STX"}
                  </button>
                  <button onClick={handleWithdraw} style={{ ...btnBase, width: "100%", backgroundColor: "#eee", color: "#333" }}>Release Assets</button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
