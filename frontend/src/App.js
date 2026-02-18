// frontend/src/App.js - Enhanced with Transaction History

import React, { useState, useEffect } from 'react';
import { connect, authenticate, userSession } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { 
  callReadOnlyFunction, 
  makeContractCall, 
  uintCV,
  cvToValue 
} from '@stacks/transactions';

const contractAddress = 'STYOURCONTRACTADDRESSHERE';  
const contractName = 'stx-vault';

function App() {
  const [stxAmount, setStxAmount] = useState(0);
  const [lockDays, setLockDays] = useState(0);
  const [status, setStatus] = useState('Disconnected');
  const [userData, setUserData] = useState(null);
  const [txHistory, setTxHistory] = useState([]); // New state for transaction history
  const network = new StacksTestnet();

  const appDetails = {
    appName: "STX Savings Vault",
    appIcon: window.location.origin + "/logo.png",
  };

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
      setStatus('Connected');
      
      // Load transaction history from localStorage
      const savedHistory = localStorage.getItem('stxVaultHistory');
      if (savedHistory) {
        setTxHistory(JSON.parse(savedHistory));
      }
    }
  }, []);

  const connectWallet = () => {
    authenticate({
      appDetails,
      onFinish: () => {
        window.location.reload();
      },
      onCancel: () => alert('Wallet connection cancelled'),
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setUserData(null);
    setTxHistory([]);
    localStorage.removeItem('stxVaultHistory');
    setStatus('Disconnected');
  };

  // Save transaction to history
  const saveTransaction = (type, amount, lockDays, txId) => {
    const newTx = {
      id: txId,
      type: type,
      amount: amount,
      lockDays: lockDays,
      timestamp: new Date().toISOString(),
      status: 'confirmed'
    };
    
    const updatedHistory = [newTx, ...txHistory].slice(0, 10); // Keep last 10 transactions
    setTxHistory(updatedHistory);
    localStorage.setItem('stxVaultHistory', JSON.stringify(updatedHistory));
  };

  const handleDeposit = async () => {
    if (!userSession.isUserSignedIn()) return alert('Please connect your wallet');
    setStatus('Depositing...');

    const blocks = lockDays * 6 * 24; 

    const functionArgs = [
      uintCV(stxAmount),
      uintCV(blocks),
    ];

    const options = {
      contractAddress,
      contractName,
      functionName: 'deposit-stx',
      functionArgs,
      appDetails,
      onFinish: (data) => {
        console.log('Transaction finished:', data.txId);
        setStatus('Deposit successful!');
        saveTransaction('deposit', stxAmount, lockDays, data.txId);
        setStxAmount(0);
        setLockDays(0);
      },
      onCancel: () => setStatus('Deposit cancelled'),
    };

    await makeContractCall(options);
  };

  const handleWithdraw = async () => {
    if (!userSession.isUserSignedIn()) return alert('Please connect your wallet');
    setStatus('Withdrawing...');

    const options = {
      contractAddress,
      contractName,
      functionName: 'withdraw-stx',
      functionArgs: [],
      appDetails,
      onFinish: (data) => {
        console.log('Transaction finished:', data.txId);
        setStatus('Withdrawal successful!');
        saveTransaction('withdraw', 0, 0, data.txId);
      },
      onCancel: () => setStatus('Withdrawal cancelled'),
    };

    await makeContractCall(options);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const copyTxId = (txId) => {
    navigator.clipboard.writeText(txId);
    alert('Transaction ID copied to clipboard!');
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
            
            <hr/>
            
            <h2>Withdraw STX</h2>
            <button onClick={handleWithdraw}>Withdraw</button>
            
            {/* Transaction History Section */}
            {txHistory.length > 0 && (
              <div className="transaction-history">
                <h3>Recent Transactions</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Amount (STX)</th>
                      <th>Lock Days</th>
                      <th>Date</th>
                      <th>Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txHistory.map((tx, index) => (
                      <tr key={index}>
                        <td style={{ color: tx.type === 'deposit' ? '#00cc66' : '#ff4444' }}>
                          {tx.type === 'deposit' ? '📥 ' : '📤 '}{tx.type}
                        </td>
                        <td>{tx.type === 'deposit' ? tx.amount : '-'}</td>
                        <td>{tx.type === 'deposit' ? tx.lockDays : '-'}</td>
                        <td>{formatDate(tx.timestamp)}</td>
                        <td>
                          <button 
                            onClick={() => copyTxId(tx.id)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#0066cc',
                              textDecoration: 'underline',
                              cursor: 'pointer'
                            }}
                          >
                            {tx.id.slice(0, 10)}...
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
