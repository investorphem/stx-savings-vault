/* global BigInt */
import React, { useState } from "react";
import { showConnect, openContractCall } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { 
  uintCV, 
  PostConditionMode, 
  Pc 
} from "@stacks/transactions";

// --- CONFIGURATION ---
// Replace with your actual deployed contract address from the explorer
const contractAddress = "SPYOURMAINNETADDRESSHERE"; 
const contractName = "stx-vault-v3"; 

function App() {
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [txId, setTxId] = useState("");
  const [userData, setUserData] = useState(null);

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: "STX Savings Vault",
        icon: window.location.origin + "/logo192.png",
      },
      onFinish: (payload) => {
        setUserData(payload.userSession.loadUserData());
        setStatus("Wallet Connected");
      },
      onCancel: () => {
        setStatus("Cancelled");
      }
    });
  };

  const handleDeposit = async () => {
    if (!userData) return alert("Connect wallet first");

    // Converts STX to microSTX (1 STX = 1,000,000 uSTX) using BigInt
    const amountInMicroSTX = BigInt(Math.floor(Number(stxAmount) * 1000000));
    // Converts days to blocks (assuming ~144 blocks per day)
    const blocks = uintCV(Math.floor(Number(lockDays) * 144)); 

    try {
      setStatus("Requesting signature...");
      const userAddress = userData.profile.stxAddress.mainnet;

      // Pc builder is the standard for @stacks/transactions v7
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
          style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
        >
          Connect Wallet
        </button>
      ) : (
        <div>
          <p><strong>Connected:</strong> {userData.profile.stxAddress.mainnet.substring(0, 8)}...{userData.profile.stxAddress.mainnet.substring(38)}</p>
          
          <div style={{ marginTop: "20px", border: "1px solid #ddd", padding: "20px", borderRadius: "8px" }}>
            <h3>Deposit STX</h3>
            <input 
              type="number" 
              placeholder="Amount in STX" 
              value={stxAmount} 
              onChange={e => setStxAmount(e.target.value)} 
              style={{ padding: "8px", marginRight: "10px" }}
            />
            <input 
              type="number" 
              placeholder="Days to Lock" 
              value={lockDays} 
              onChange={e => setLockDays(e.target.value)} 
              style={{ padding: "8px", marginRight: "10px" }}
            />
            <button onClick={handleDeposit} style={{ padding: "8px 16px" }}>Lock STX</button>
          </div>

          <div style={{ marginTop: "20px" }}>
            <button 
              onClick={handleWithdraw} 
              style={{ padding: "10px 20px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", cursor: "pointer" }}
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
