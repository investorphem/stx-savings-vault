// frontend/src/App.js
import React, { useState } from "react";
import { showConnect, openContractCall } from "@stacks/connect";
import { AppConfig, UserSession } from "@stacks/auth";
import { StacksMainnet } from "@stacks/network";
import { 
  uintCV, 
  PostConditionMode, 
  FungibleConditionCode, 
  makeStandardSTXPostCondition 
} from "@stacks/transactions";

// --- CONFIGURATION ---
const contractAddress = "SPYOURMAINNETADDRESSHERE"; 
const contractName = "stx-vault";
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
    const blocks = Math.floor(Number(lockDays) * 144); // ~144 blocks per day

    if (amountInMicroSTX <= 0 || blocks <= 0) return alert("Enter valid amount and days");

    try {
      setStatus("Requesting signature...");
      
      const userAddress = userSession.loadUserData().profile.stxAddress.mainnet;

      // POST-CONDITION: Guarantee that NO MORE than 'amountInMicroSTX' leaves the wallet
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
        postConditionMode: PostConditionMode.Deny, // Deny any transfer not specified in post-conditions
        onFinish: (data) => {
          setTxId(data.txId);
          setStatus("Transaction broadcasted to Mainnet!");
        },
        onCancel: () => setStatus("Transaction cancelled"),
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
        // Withdrawals usually don't need post-conditions unless the contract 
        // requires the user to send a fee.
        onFinish: (data) => {
          setTxId(data.txId);
          setStatus("Withdrawal broadcasted!");
        },
        onCancel: () => setStatus("Withdrawal cancelled"),
      });
    } catch (error) {
      console.error(error);
      setStatus("Withdraw failed");
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <header>
        <h1>STX Savings Vault</h1>
        {userSession.isUserSignedIn() ? (
          <div>
            <p>Connected: {userSession.loadUserData().profile.stxAddress.mainnet}</p>
            <button onClick={disconnectWallet}>Disconnect</button>
          </div>
        ) : (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </header>

      {userSession.isUserSignedIn() && (
        <main style={{ marginTop: "20px" }}>
          <section style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "8px" }}>
            <h2>Deposit</h2>
            <input
              type="number"
              placeholder="Amount in STX"
              value={stxAmount}
              onChange={(e) => setStxAmount(e.target.value)}
            />
            <input
              type="number"
              placeholder="Days to lock"
              value={lockDays}
              onChange={(e) => setLockDays(e.target.value)}
            />
            <button onClick={handleDeposit}>Deposit STX</button>
          </section>

          <section style={{ marginTop: "20px" }}>
            <h2>Withdraw</h2>
            <button onClick={handleWithdraw}>Withdraw Available STX</button>
          </section>
        </main>
      )}

      <footer style={{ marginTop: "30px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
        <p><strong>Status:</strong> {status}</p>
        {txId && (
          <a 
            href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} 
            target="_blank" 
            rel="noreferrer"
          >
            View on Explorer ↗
          </a>
        )}
      </footer>
    </div>
  );
}

export default App;
