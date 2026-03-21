/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
// Ensure we include userSession for better state management
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { uintCV, PostConditionMode, Pc } from "@stacks/transactions";

// 1. Setup session outside to keep it persistent
const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

function App() {
  const [userData, setUserData] = useState(null);
  const [status, setStatus] = useState("Disconnected");
  // ... other states (stxAmount, lockDays, txId)

  // 2. Use a callback to update state so we can call it from multiple places
  const checkUserSession = useCallback(() => {
    if (userSession.isUserSignedIn()) {
      const data = userSession.loadUserData();
      setUserData(data);
      setStatus("Wallet Connected");
    }
  }, []);

  // Check on initial load
  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const handleConnect = () => {
    showConnect({
      userSession,
      appDetails: {
        name: "STX Savings Vault",
        icon: window.location.origin + "/logo192.png",
      },
      onFinish: () => {
        // 3. THIS IS THE FIX: Explicitly trigger the state update here
        checkUserSession(); 
      },
      onCancel: () => setStatus("Cancelled"),
    });
  };

  const handleDisconnect = () => {
    userSession.signUserOut();
    setUserData(null);
    setStatus("Disconnected");
    window.location.reload(); // Optional: clean slate
  };

  // Helper to get address easily in the UI
  const userAddress = userData?.profile?.stxAddress?.mainnet;

  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>STX Savings Vault</h1>

      {/* 4. UI switches based on userData existing in state */}
      {!userData ? (
        <button 
          onClick={handleConnect}
          style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", backgroundColor: "#5546ff", color: "white", border: "none", borderRadius: "8px" }}
        >
          Connect Wallet
        </button>
      ) : (
        <div>
          <button onClick={handleDisconnect} style={{ float: "right" }}>Sign Out</button>
          <p><strong>Connected:</strong> {userAddress?.substring(0, 8)}...{userAddress?.substring(34)}</p>

          <div style={{ marginTop: "40px", border: "1px solid #ddd", padding: "20px", borderRadius: "8px", maxWidth: "400px", margin: "40px auto" }}>
            <h3>Deposit STX</h3>
            {/* ... rest of your deposit inputs ... */}
          </div>
        </div>
      )}
      
      {/* ... Status and TxId displays ... */}
    </div>
  );
}

export default App;
