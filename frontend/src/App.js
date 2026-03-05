// frontend/src/App.js

import React, { useState } from "react";
import { showConnect } from "@stacks/connect";
import { AppConfig, UserSession } from "@stacks/auth";
import { StacksTestnet } from "@stacks/network";
import { makeContractCall, uintCV } from "@stacks/transactions";

const contractAddress = "STYOURCONTRACTADDRESSHERE";
const contractName = "stx-vault";
const functionNameDeposit = "deposit-stx";
const functionNameWithdraw = "withdraw-stx";

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

function App() {
  const [stxAmount, setStxAmount] = useState(0);
  const [lockDays, setLockDays] = useState(0);
  const [status, setStatus] = useState("Disconnected");

  const network = new StacksTestnet();

  const appDetails = {
    name: "STX Savings Vault",
    icon: window.location.origin + "/preview.png",
  };

  const connectWallet = () => {
    showConnect({
      appDetails,
      userSession,
      onFinish: () => {
        window.location.reload();
      },
      onCancel: () => alert("Wallet connection cancelled"),
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

    setStatus("Depositing...");

    const blocks = lockDays * 6 * 24;

    const functionArgs = [
      uintCV(Number(stxAmount)),
      uintCV(Number(blocks))
    ];

    const options = {
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
      onCancel: () => setStatus("Deposit cancelled"),
    };

    await makeContractCall(options);
  };

  const handleWithdraw = async () => {
    if (!userSession.isUserSignedIn()) {
      alert("Please connect your wallet");
      return;
    }

    setStatus("Withdrawing...");

    const options = {
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
      onCancel: () => setStatus("Withdrawal cancelled"),
    };

    await makeContractCall(options);
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
              onChange={(e) => setStxAmount(e.target.value)}
            />

            <input
              type="number"
              placeholder="Lock Days"
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