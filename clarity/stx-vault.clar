;; STX Savings Vault Pro | v9.0 Emergency Edition
;; Features: Standard Withdraw & 10% Penalty Emergency Withdraw

;; 1. DATA MAPS & VARIABLES
(define-map deposits principal { amount: uint, unlock-block: uint, last-deposit-at: uint })
(define-constant ADMIN tx-sender) ;; The address that collects penalty fees

;; 2. ERROR CODES
(define-constant ERR-LOCK-NOT-MET (err u101))
(define-constant ERR-NO-DEPOSIT (err u102))
(define-constant ERR-INVALID-AMT (err u103))

;; 3. PUBLIC FUNCTIONS

;; Standard Deposit (Same as v8.1)
(define-public (deposit-stx (amount uint) (lock-blocks uint))
    (let (
        (user tx-sender)
        (prev (default-to { amount: u0, unlock-block: u0, last-deposit-at: u0 } (map-get? deposits user)))
    )
        (try! (stx-transfer? amount user (as-contract tx-sender)))
        (ok (map-set deposits user {
            amount: (+ amount (get amount prev)),
            unlock-block: (if (> (+ block-height lock-blocks) (get unlock-block prev)) (+ block-height lock-blocks) (get unlock-block prev)),
            last-deposit-at: block-height
        }))
    )
)

;; NEW: Emergency "Rage-Quit" (Withdraw early for a 10% fee)
(define-public (emergency-withdraw)
    (let (
        (user tx-sender)
        (deposit (unwrap! (map-get? deposits user) ERR-NO-DEPOSIT))
        (total-amount (get amount deposit))
        ;; Calculate 10% fee (amount / 10)
        (fee (/ total-amount u10))
        (payout (- total-amount fee))
    )
        ;; No time check needed here! That's the point of emergency.
        (asserts! (> total-amount u0) ERR-INVALID-AMT)

        ;; 1. Send 90% back to the user
        (try! (as-contract (stx-transfer? payout tx-sender user)))
        
        ;; 2. Send 10% penalty to the ADMIN (you)
        (try! (as-contract (stx-transfer? fee tx-sender ADMIN)))

        (map-delete deposits user)
        (print { event: "rage-quit", user: user, penalty: fee, paid: payout })
        (ok true)
    )
)

;; Standard Withdraw (No fee, but must wait for block-height)
(define-public (withdraw-stx)
    (let (
        (user tx-sender)
        (deposit (unwrap! (map-get? deposits user) ERR-NO-DEPOSIT))
        (amount (get amount deposit))
        (unlock (get unlock-block deposit))
    )
        (asserts! (>= block-height unlock) ERR-LOCK-NOT-MET)
        (try! (as-contract (stx-transfer? amount tx-sender user)))
        (map-delete deposits user)
        (ok true)
    )
)

;; 4. READ-ONLY
(define-read-only (get-vault-status (user principal)) (map-get? deposits user))
