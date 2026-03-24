/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
// v7.3.1 specific imports - ensuring callReadOnlyFunction is used
import { 
  uintCV, 
  PostConditionMode, 
  Pc, 
  callReadOnlyFunction, 
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
    if (!address || address === "") return;
    setIsRefreshing(true);
    try {
      // v7.3.1 callReadOnlyFunction implementation
      const result = await callReadOnlyFunction({
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

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldCheck size={28} color={theme.primary} />
          <span style={{ fontWeight: "700", fontSize: "18px" }}>STX Vault</span>
        </div>
        {!userData ? (
          <button onClick={handleConnect} style={btnBase}>Connect Wallet</button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={pillStyle}>{userAddress?.substring(0, 5)}...{userAddress?.substring(userAddress.length - 4)}</span>
            <button onClick={handleDisconnect} style={{ background: "none", border: "none", color: theme.danger, cursor: "pointer" }}><LogOut size={18} /></button>
          </div>
        )}
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <AnimatePresence mode="wait">
          {!userData ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: "40px", marginBottom: "10px" }}>Secure Your STX</h1>
              <p style={{ color: theme.textMuted, marginBottom: "30px" }}>Non-custodial savings vault on the Stacks blockchain.</p>
              <button onClick={handleConnect} style={{ ...btnBase, padding: "15px 40px" }}>Get Started</button>
            </motion.div>
          ) : (
            <div style={{ maxWidth: "800px", width: "100%" }}>
              <div style={{ textAlign: "right", marginBottom: "10px" }}>
                <button onClick={() => fetchVaultStatus(userAddress)} style={{ background: "none", border: "none", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> Syncing
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={cardStyle}>
                  <h3 style={{ marginTop: 0 }}>Holdings</h3>
                  <div style={statBox}><Coins size={20} /> {vaultData.amount} STX</div>
                  <div style={statBox}><Clock size={20} /> Block #{vaultData.unlock || "---"}</div>
                </div>
                <div style={cardStyle}>
                  <h3 style={{ marginTop: 0 }}>Actions</h3>
                  <input type="number" placeholder="STX Amount" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={inputStyle} />
                  <input type="number" placeholder="Lock Days" value={lockDays} onChange={e => setLockDays(e.target.value)} style={inputStyle} />
                  <button onClick={handleDeposit} disabled={isPending} style={{ ...btnBase, width: "100%", marginBottom: "10px" }}>
                    {isPending ? "Processing..." : "Deposit"}
                  </button>
                  <button onClick={handleWithdraw} style={{ ...btnBase, width: "100%", backgroundColor: "#eee", color: "#333" }}>Withdraw</button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

const headerStyle = { display: "flex", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid #eee", backgroundColor: "#fff" };
const btnBase = { backgroundColor: "#5546FF", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" };
const cardStyle = { backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };
const statBox = { display: "flex", alignItems: "center", gap: "10px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "8px", marginBottom: "10px" };
const inputStyle = { width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #eee" };
const pillStyle = { backgroundColor: "#f0f0ff", padding: "5px 12px", borderRadius: "20px", fontSize: "14px", color: "#5546FF" };

export default App;
