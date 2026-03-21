import React, { useState } from "react";
import { showConnect, openContractCall } from "@stacks/connect";
// UPDATE: Import STACKS_MAINNET constant instead of the Class
import { STACKS_MAINNET } from "@stacks/network";
import { 
  uintCV, 
  PostConditionMode, 
  FungibleConditionCode, 
  makeStandardSTXPostCondition 
} from "@stacks/transactions";

// --- CONFIGURATION ---
const contractAddress = "SPYOURMAINNETADDRESSHERE"; // UPDATE THIS
const contractName = "stx-vault-v3"; 

function App() {
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [txId, setTxId] = useState("");
  const [userData, setUserData] = useState(null);

  const appDetails = {
    name: "STX Savings Vault",
    icon: window.location.origin + "/logo192.png",
  };

  const connectWallet = () => {
    showConnect({
      appDetails,
      onFinish: (payload) => {
        setUserData(payload.userSession.loadUserData());
        setStatus("Wallet Connected");
      },
      onCancel: () => setStatus("Cancelled"),
    });
  };

  const handleDeposit = async () => {
    if (!userData) return alert("Connect wallet first");
    
    const amountInMicroSTX = Math.floor(Number(stxAmount) * 1000000);
    const blocks = Math.floor(Number(lockDays) * 144); 

    try {
      setStatus("Requesting signature...");
      const userAddress = userData.profile.stxAddress.mainnet;

      const postCondition = makeStandardSTXPostCondition(
        userAddress,
        FungibleConditionCode.Equal,
        amountInMicroSTX
      );

      await openContractCall({
        // UPDATE: Use the constant directly
        network: STACKS_MAINNET,
        contractAddress,
        contractName,
        functionName: "deposit-stx",
        functionArgs: [uintCV(amountInMicroSTX), uintCV(blocks)],
        postConditions: [postCondition],
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => {
          setTxId(data.txId);
          setStatus("Deposit broadcasted!");
        },
        onCancel: () => setStatus("Cancelled"),
      });
    } catch (error) {
      console.error(error);
      setStatus("Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    if (!userData) return alert("Connect wallet first");
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
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Logged in as: {userData.profile.stxAddress.mainnet.substring(0, 10)}...</p>
          <div style={{ marginTop: "20px" }}>
            <input 
              type="number" 
              placeholder="STX Amount" 
              value={stxAmount} 
              onChange={e => setStxAmount(e.target.value)} 
            />
            <input 
              type="number" 
              placeholder="Lock Days" 
              value={lockDays} 
              onChange={e => setLockDays(e.target.value)} 
            />
            <button onClick={handleDeposit}>Deposit</button>
            <hr />
            <button onClick={handleWithdraw}>Withdraw</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <p><strong>Status:</strong> {status}</p>
        {txId && (
          <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noreferrer">
            View on Explorer ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default App;
