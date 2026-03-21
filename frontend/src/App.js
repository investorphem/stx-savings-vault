import React, { useState } from "react";
import { showConnect, openContractCall } from "@stacks/connect";
import { StacksMainnet } from "@stacks/network";
import { 
  uintCV, 
  PostConditionMode, 
  FungibleConditionCode, 
  makeStandardSTXPostCondition 
} from "@stacks/transactions";
import { AppConfig, UserSession } from "@stacks/connect"; // Updated import source

// --- CONFIGURATION ---
const contractAddress = "SPYOURMAINNETADDRESSHERE"; // UPDATE THIS
const contractName = "stx-vault-v3"; // Match your latest deployment

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

function App() {
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [txId, setTxId] = useState("");

  const network = new StacksMainnet();

  const appDetails = {
    name: "STX Savings Vault",
    icon: window.location.origin + "/logo192.png",
  };

  const connectWallet = () => {
    showConnect({
      appDetails,
      userSession,
      onFinish: () => {
        window.location.reload();
      },
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut(window.location.origin);
  };

  const handleDeposit = async () => {
    if (!userSession.isUserSignedIn()) return alert("Connect wallet first");
    
    const amountInMicroSTX = Math.floor(Number(stxAmount) * 1000000);
    const blocks = Math.floor(Number(lockDays) * 144); 

    if (amountInMicroSTX <= 0 || blocks <= 0) return alert("Enter valid values");

    try {
      setStatus("Requesting signature...");
      const userAddress = userSession.loadUserData().profile.stxAddress.mainnet;

      const postCondition = makeStandardSTXPostCondition(
        userAddress,
        FungibleConditionCode.Equal,
        amountInMicroSTX
      );

      await openContractCall({
        network,
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
    if (!userSession.isUserSignedIn()) return alert("Connect wallet first");
    try {
      setStatus("Requesting withdrawal...");
      await openContractCall({
        network,
        contractAddress,
        contractName,
        functionName: "withdraw-stx",
        functionArgs: [],
        onFinish: (data) => {
          setTxId(data.txId);
          setStatus("Withdrawal broadcasted!");
        },
        onCancel: () => setStatus("Cancelled"),
      });
    } catch (error) {
      console.error(error);
      setStatus("Withdraw failed");
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>STX Savings Vault</h1>
      
      {!userSession.isUserSignedIn() ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <button onClick={disconnectWallet}>Disconnect</button>
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
        <p>Status: {status}</p>
        {txId && (
          <a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noreferrer">
            View Transaction ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default App;
