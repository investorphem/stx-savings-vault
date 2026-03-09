// frontend/src/App.js

import React, { useState } from "react";
import { showConnect, openContractCall } from "@stacks/connect";
import { AppConfig, UserSession } from "@stacks/auth";
import { StacksMainnet } rom"tacks/network";
import { uintCV } from "@stacks/transacions";
const contractAddress = SPYOURMAINNETADSEE; // Replace with deployedminet addre
const contractName = "stx-vault";

const functionNameDeposit = "deposit-stx";
const functionNameWithdraw = "withdraw-stx";

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

function App() {
  const [stxAmount, setStxAmount] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [status, setStatus] = useState("Disconnected");

  // MAINNET NETWORK
  const network = new StacksMainnet();

  const appDetails = {
    name: "STX Savings Vault",
    icon: window.location.origin + "/preview.png",
  };

  const connectWallet = () => {
    showConnect({
      appDetails,
      userSession,
      onFinish: () => {
        setStatus("Wallet Connected");
        window.location.reload();
      },
      onCancel: () => {
        setStatus("Wallet connection cancelled");
      },
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut(window.location.origin);
  };

  const handleDeposit = async () => {
    if (!userSession.isUserSignedIn()) {
      alert("Please connect your wallet");
      return;
    }

    try {
      setStatus("Depositing...");

      // Convert days → blocks (approx)
      const blocks = Number(lockDays) * 6 * 24;

      const functionArgs = [
        uintCV(Number(stxAmount) * 1000000), // STX → microSTX
        uintCV(blocks),
      ];

      await openContractCall({
        contractAddress,
        contractName,
        functionName: functionNameDeposit,
        functionArgs,
        network,
        appDetails,
        onFinish: (data) => {
          console.log("Transaction:", data.txId);
          setStatus("Deposit successful!");
        },
        onCancel: () => {
          setStatus("Deposit cancelled");
        },
      });

    } catch (error) {
      console.error(error);
      setStatus("Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    if (!userSession.isUserSignedIn()) {
      alert("Please connect your wallet");
      return;
    }

    try {
      setStatus("Withdrawing...");

      await openContractCall({
        contractAddress,
        contractName,
        functionName: functionNameWithdraw,
        functionArgs: [],
        network,
        appDetails,
        onFinish: (data) => {
          console.log("Transaction:", data.txId);
          setStatus("Withdrawal successful!");
        },
        onCancel: () => {
          setStatus("Withdrawal cancelled");
        },
      });

    } catch (error) {
      console.error(error);
      setStatus("Withdraw failed");
    }
  };

  return (
    <div className="App">
      <header>
        <h1>STX Savings Vault</h1>

        {userSession.isUserSignedIn() ? (
          <button onClick={disconnectWallet}>Disconnect Wallet</button>
        ) : (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </header>

      <main>
        {userSession.isUserSignedIn() && (
          <div>
            <h2>Deposit STX</h2>

            <input
              type="number"
              placeholder="STX Amount"
              value={stxAmount}
              onChange={(e) => setStxAmount(e.target.value)}
            />

            <input
              type="number"
              placeholder="Lock Days"
              value={lockDays}
              onChange={(e) => setLockDays(e.target.value)}
            />

            <button onClick={handleDeposit}>Deposit</button>

            <hr />

            <h2>Withdraw STX</h2>

            <button onClick={handleWithdraw}>Withdraw</button>
          </div>
        )}
      </main>

      <footer>
        <p>Status: {status}</p>
      </footer>
    </div>
  );
}

export default App;