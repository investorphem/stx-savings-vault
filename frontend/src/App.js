/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { uintCV, PostConditionMode, Pc } from "@stacks/transactions";

// Styles defined outside the component for better performance
const buttonStyle = {
  backgroundColor: "#5546FF",
  color: "white",
  padding: "10px 20px",
  borderRadius: "10px",
  border: "none",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.2s ease"
};

const signOutStyle = {
  backgroundColor: "#fee2e2",
  color: "#dc2626",
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid #fecaca",
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer"
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "16px",
  boxSizing: "border-box"
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
  const [txId, setTxId] = useState("");

  const checkUserSession = useCallback(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
      setStatus("Wallet Connected");
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
        setTimeout(() => {
          window.location.reload();
        }, 100);
      },
      onCancel: () => setStatus("Cancelled")
    });
  };

  const handleDisconnect = () => {
    userSession.signUserOut();
    window.location.reload();
  };

  const handleDeposit = async () => {
    if (!userData) return;
    try {
      setStatus("Requesting signature...");
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
        },
      });
    } catch (err) {
      console.error(err);
      setStatus("Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    if (!userData) return;
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
        },
      });
    } catch (err) {
      console.error(err);
      setStatus("Withdraw failed");
    }
  };

  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ backgroundColor: "#f9f9fb", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* PROFESSIONAL HEADER SECTION */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "15px 40px",
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        borderBottom: "1px solid #eaecef"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img 
            src="/logo192.png" 
            alt="Shield" 
            style={{ width: "40px", height: "40px", borderRadius: "8px" }} 
            onError={(e) => e.target.style.display = 'none'} // Hides if image missing
          />
          <div style={{ textAlign: "left" }}>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#5546FF", display: "block", lineHeight: "1" }}>
              STX
            </span>
            <span style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px" }}>
              Savings Vault
            </span>
          </div>
        </div>

        <div>
          {!userData ? (
            <button onClick={handleConnect} style={buttonStyle}>
              Connect Wallet
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <span style={{ fontSize: "14px", color: "#374151", fontWeight: "500", backgroundColor: "#f3f4f6", padding: "6px 12px", borderRadius: "20px" }}>
                {userAddress?.substring(0, 5)}...{userAddress?.substring(userAddress.length - 4)}
              </span>
              <button onClick={handleDisconnect} style={signOutStyle}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main style={{ padding: "60px 20px", textAlign: "center" }}>
        {!userData ? (
          <div style={{ marginTop: "100px" }}>
            <h2>Secure your STX in the Vault</h2>
            <p style={{ color: "#6b7280" }}>Please connect your wallet to manage your savings.</p>
          </div>
        ) : (
          <div style={{ maxWidth: "450px", margin: "0 auto", backgroundColor: "#fff", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h3 style={{ marginTop: "0", color: "#111827" }}>Vault Management</h3>
            
            <div style={{ textAlign: "left", marginBottom: "25px" }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Amount to Lock (STX)</label>
              <input type="number" placeholder="0.00" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={inputStyle} />
              
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Lock Duration (Days)</label>
              <input type="number" placeholder="e.g. 30" value={lockDays} onChange={e => setLockDays(e.target.value)} style={inputStyle} />
              
              <button onClick={handleDeposit} style={{ ...buttonStyle, width: "100%", padding: "14px" }}>
                Confirm Deposit
              </button>
            </div>

            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "25px" }}>
              <button onClick={handleWithdraw} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #5546FF", color: "#5546FF", backgroundColor: "transparent", fontWeight: "600", cursor: "pointer" }}>
                Withdraw Available STX
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: "30px" }}>
          <p style={{ fontSize: "14px", color: "#9ca3af" }}>Status: <strong>{status}</strong></p>
          {txId && (
            <p style={{ fontSize: "14px" }}>
              <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noreferrer" style={{ color: "#5546FF", textDecoration: "none", fontWeight: "500" }}>
                View Transaction ↗
              </a>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
