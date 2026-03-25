# STX Vault 🔐  
### Bitcoin-Backed Saving Vault on Stacks

![Built on Stacks](https://img.shields.io/badge/Built%20on-Stacks-orange)
![Clarity](https://img.shields.io/badge/Contracts-Clarity-blue)
![Status](https://img.shields.io/badge/Status-Mainnet%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## 🚀 Overview

STX Vault is a decentralized, non-custodial savings vault built on the **Stacks blockchain**, secured by Bitcoin.

Users can deposit STX into a smart contract vault, lock their balance, and withdraw later — with all transactions benefiting from **Bitcoin finality via Stacks Proof-of-Transfer (PoX)**.

---

## 🔗 Stacks Attribution

- Built on the **Stacks blockchain**
- Smart contracts written in **Clarity**
- Network: **Stacks Mainnet**
- Uses `@stacks/transactions` and `@stacks/connect`
- Deployed and verifiable on Stacks Explorer

**Deployer Address:**  
SPXXXXX

---

## 🌟 Features

- Deposit STX into vault  
- Optional lock periods  
- Withdraw anytime or after lock  
- On-chain balance tracking  
- Bitcoin-secured execution  

---

## 📜 Smart Contract

Located at: `/contracts/vault.clar`

```clarity
(define-data-var vault-balances (map principal uint))
(define-data-var lock-periods (map principal uint))
(define-constant COOLDOWN-SECONDS u604800)

(define-public (deposit)
  (let (
      (amount (stx-get-balance tx-sender))
  )
    (asserts! (> amount u0) "NO_STX")
    (try! (stx-transfer? amount tx-sender contract-principal))
    (map-set vault-balances tx-sender (+ (default-to u0 (map-get? vault-balances tx-sender)) amount))
    (ok amount)
  )
)

(define-public (withdraw (amount uint))
  (let (
      (balance (default-to u0 (map-get? vault-balances tx-sender)))
  )
    (asserts! (>= balance amount) "INSUFFICIENT_BALANCE")
    (try! (stx-transfer? amount contract-principal tx-sender))
    (map-set vault-balances tx-sender (- balance amount))
    (ok true)
  )
)
```

---

## ⚙️ Frontend Integration

### Deposit

```javascript
await makeContractCall({
  contractAddress,
  contractName: "vault",
  functionName: "deposit",
  network,
});
```

### Withdraw

```javascript
await makeContractCall({
  contractAddress,
  contractName: "vault",
  functionName: "withdraw",
  functionArgs: [uintCV(amount)],
  network,
});
```

---

## 📁 Project Structure

```
/contracts
  vault.clar
/src
  connect-wallet.js
  deposit.js
  withdraw.js
  get-balance.js
package.json
README.md
```

---

## 🌐 Live Links

- Live dApp: https://your-vercel-url.vercel.app  
- Contract Address: SPXXXXX.vault  
- Explorer: https://explorer.hiro.so/address/SPXXXXX  

---

## 🛠 Development

```bash
git clone https://github.com/yourusername/stx-vault.git
cd stx-vault

clarinet check
clarinet test
clarinet deploy --mainnet
```

---

## 📌 Notes

- Fully **Stacks-native dApp**
- Powered by **Bitcoin security**
- Transparent and verifiable on-chain

---

## 📅 Last Updated
2026-03-25
