/* global BigInt */
import React, { useState, useEffect, useCallback } from "react";
import { AppConfig, UserSession, showConnect, openContractCall } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { uintCV, PostConditionMode, Pc } from "@stacks/transactions";

// Initializing outside the component prevents re-declaration errors
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
        // Force a small delay to let the wallet popup close before state update
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
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>STX Savings Vault</h1>
      {!userData ? (
        <button onClick={handleConnect} style={{ padding: "12px 24px", cursor: "pointer" }}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <button onClick={handleDisconnect} style={{ float: "right" }}>Sign Out</button>
          <p>Connected: {userAddress?.substring(0, 8)}...</p>
          <div style={{ margin: "20px auto", maxWidth: "300px", border: "1px solid #ddd", padding: "20px" }}>
            <input type="number" placeholder="STX" value={stxAmount} onChange={e => setStxAmount(e.target.value)} style={{ width: "100%", marginBottom: "10px" }} />
            <input type="number" placeholder="Days" value={lockDays} onChange={e => setLockDays(e.target.value)} style={{ width: "100%", marginBottom: "10px" }} />
            <button onClick={handleDeposit} style={{ width: "100%" }}>Deposit</button>
          </div>
          <button onClick={handleWithdraw}>Withdraw Available</button>
        </div>
      )}
      <p>Status: {status}</p>
      {txId && <p><a href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`} target="_blank" rel="noreferrer">View Tx ↗</a></p>}
    </div>
  );
}

export default App;
