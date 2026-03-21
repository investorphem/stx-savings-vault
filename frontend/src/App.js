/* global BigInt */
import React, { useState, useEffect } from "react";
// Import the modern methods
import { connect, disconnect, isConnected, getLocalStorage, request } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { uintCV, PostConditionMode, Pc } from "@stacks/transactions";

// --- CONFIGURATION ---
const contractAddress = "SPYOURMAINNETADDRESSHERE"; 
const contractName = "stx-vault-v3"; 

function App() {
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [txId, setTxId] = useState("");
  const [userAddress, setUserAddress] = useState(null);

  // Check connection on mount using the new isConnected() helper
  useEffect(() => {
    if (isConnected()) {
      const data = getLocalStorage();
      if (data?.addresses?.stx?.[0]?.address) {
        setUserAddress(data.addresses.stx[0].address);
        setStatus("Wallet Connected");
      }
    }
  }, []);

  const handleConnect = async () => {
    try {
      setStatus("Connecting...");
      // The modern, async way to trigger the wallet popup
      const response = await connect(); 
      if (response?.addresses?.stx?.[0]?.address) {
        setUserAddress(response.addresses.stx[0].address);
        setStatus("Wallet Connected");
      }
    } catch (error) {
      console.error(error);
      setStatus("Connection failed");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setUserAddress(null);
    setStatus("Disconnected");
  };

  const handleDeposit = async () => {
    if (!userAddress) return alert("Connect wallet first");

    const amountInMicroSTX = BigInt(Math.floor(Number(stxAmount) * 1000000));
    const blocks = Math.floor(Number(lockDays) * 144); 

    try {
      setStatus("Requesting signature...");
      const postCondition = Pc.principal(userAddress).willSendEq(amountInMicroSTX).ustx();

      // Using the modern 'request' API for contract calls
      const response = await request("stx_callContract", {
        network: STACKS_MAINNET,
        contractAddress,
        contractName,
        functionName: "deposit-stx",
        functionArgs: [uintCV(amountInMicroSTX), uintCV(blocks)],
        postConditions: [postCondition],
        postConditionMode: PostConditionMode.Deny,
      });

      if (response?.txid) {
        setTxId(response.txid);
        setStatus("Deposit broadcasted!");
      }
    } catch (error) {
      console.error(error);
      setStatus("Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    if (!userAddress) return alert("Connect wallet first");
    try {
      setStatus("Requesting withdrawal...");
      const response = await request("stx_callContract", {
        network: STACKS_MAINNET,
        contractAddress,
        contractName,
        functionName: "withdraw-stx",
        functionArgs: [],
      });

      if (response?.txid) {
        setTxId(response.txid);
        setStatus("Withdrawal broadcasted!");
      }
    } catch (error) {
      console.error(error);
      setStatus("Withdraw failed");
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>STX Savings Vault</h1>

      {!userAddress ? (
        <button 
          onClick={handleConnect}
          style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", backgroundColor: "#5546ff", color: "white", border: "none", borderRadius: "8px" }}
        >
          Connect Wallet
        </button>
      ) : (
        <div>
          <button onClick={handleDisconnect} style={{ float: "right" }}>Sign Out</button>
          <p><strong>Connected:</strong> {userAddress.substring(0, 8)}...{userAddress.substring(34)}</p>

          <div style={{ marginTop: "40px", border: "1px solid #ddd", padding: "20px", borderRadius: "8px", maxWidth: "400px", margin: "40px auto" }}>
            <h3>Deposit STX</h3>
            <input 
              type="number" placeholder="Amount (STX)" value={stxAmount} 
              onChange={e => setStxAmount(e.target.value)} style={{ padding: "10px", width: "80%", marginBottom: "10px" }}
            />
            <input 
              type="number" placeholder="Lock (Days)" value={lockDays} 
              onChange={e => setLockDays(e.target.value)} style={{ padding: "10px", width: "80%", marginBottom: "10px" }}
            />
            <button onClick={handleDeposit} style={{ padding: "10px 20px", width: "85%", backgroundColor: "#000", color: "#fff", cursor: "pointer" }}>
              Lock My STX
            </button>
          </div>

          <button onClick={handleWithdraw} style={{ padding: "10px 20px", cursor: "pointer" }}>
            Withdraw Available
          </button>
        </div>
      )}

      <div style={{ marginTop: "30px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <p><strong>Status:</strong> {status}</p>
        {txId && (
          <p><a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noreferrer">View on Explorer ↗</a></p>
        )}
      </div>
    </div>
  );
}

export default App;
