/* global BigInt */
import React, { useState, useEffect } from "react";
import { showConnect, openContractCall, AppConfig, UserSession } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { 
  uintCV, 
  PostConditionMode, 
  Pc 
} from "@stacks/transactions";

// --- CONFIGURATION ---
const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

// Replace with your actual deployed contract address
const contractAddress = "SPYOURMAINNETADDRESSHERE"; 
const contractName = "stx-vault-v3"; 

function App() {
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [txId, setTxId] = useState("");
  const [userData, setUserData] = useState(null);

  // Check for existing session on page load
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
      setStatus("Wallet Connected");
    }
  }, []);

  const connectWallet = () => {
    showConnect({
      userSession, // CRITICAL: This connects the button logic to the session
      appDetails: {
        name: "STX Savings Vault",
        icon: window.location.origin + "/logo192.png",
      },
      onFinish: () => {
        const data = userSession.loadUserData();
        setUserData(data);
        setStatus("Wallet Connected");
      },
      onCancel: () => {
        setStatus("Cancelled");
      }
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setUserData(null);
    setStatus("Disconnected");
  };

  const handleDeposit = async () => {
    if (!userData) return alert("Connect wallet first");

    const amountInMicroSTX = BigInt(Math.floor(Number(stxAmount) * 1000000));
    const blocks = uintCV(Math.floor(Number(lockDays) * 144)); 

    try {
      setStatus("Requesting signature...");
      const userAddress = userData.profile.stxAddress.mainnet;

      const postCondition = Pc.principal(userAddress).willSendEq(amountInMicroSTX).ustx();

      await openContractCall({
        network: STACKS_MAINNET,
        contractAddress,
        contractName,
        functionName: "deposit-stx",
        functionArgs: [uintCV(amountInMicroSTX), blocks],
        postConditions: [postCondition],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => {
          setTxId(data.txId);
          setStatus("Deposit broadcasted!");
        },
      });
    } catch (error) {
      console.error(error);
      setStatus("Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    if (!userData) return alert("Connect wallet first");
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
    } catch (error) {
      console.error(error);
      setStatus("Withdraw failed");
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>STX Savings Vault</h1>

      {!userData ? (
        <button 
          onClick={connectWallet}
          style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", backgroundColor: "#5546ff", color: "white", border: "none", borderRadius: "8px" }}
        >
          Connect Wallet
        </button>
      ) : (
        <div>
          <button onClick={disconnectWallet} style={{ float: "right" }}>Sign Out</button>
          <p><strong>Connected:</strong> {userData.profile.stxAddress.mainnet.substring(0, 8)}...{userData.profile.stxAddress.mainnet.substring(38)}</p>

          <div style={{ marginTop: "40px", border: "1px solid #ddd", padding: "20px", borderRadius: "8px", maxWidth: "400px", margin: "40px auto" }}>
            <h3>Deposit STX</h3>
            <div style={{ marginBottom: "10px" }}>
              <input 
                type="number" 
                placeholder="Amount (STX)" 
                value={stxAmount} 
                onChange={e => setStxAmount(e.target.value)} 
                style={{ padding: "10px", width: "80%" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <input 
                type="number" 
                placeholder="Lock for (Days)" 
                value={lockDays} 
                onChange={e => setLockDays(e.target.value)} 
                style={{ padding: "10px", width: "80%" }}
              />
            </div>
            <button onClick={handleDeposit} style={{ padding: "10px 20px", width: "85%", backgroundColor: "#000", color: "#fff", cursor: "pointer" }}>
              Lock My STX
            </button>
          </div>

          <div style={{ marginTop: "20px" }}>
            <button 
              onClick={handleWithdraw} 
              style={{ padding: "10px 20px", cursor: "pointer" }}
            >
              Withdraw All Available
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "30px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <p><strong>Status:</strong> {status}</p>
        {txId && (
          <p>
            <a 
              href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} 
              target="_blank" 
              rel="noreferrer"
              style={{ color: "#5546ff", textDecoration: "none", fontWeight: "bold" }}
            >
              View on Explorer ↗
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
