;; STX Savings Vault Pro | 2026 Advanced Edition
;; Secure, incremental time-locked savings on Stacks

;; 1. DATA MAPS & VARIABLES
;; ---------------------------------------------------------
(define-map deposits
    principal
    {
        amount: uint,
        unlock-block: uint,
        last-deposit-at: uint
    }
)

;; 2. CONSTANTS & ERRORS
;; ---------------------------------------------------------
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-LOCK-PERIOD-NOT-MET (err u101))
(define-constant ERR-NO-DEPOSIT-FOUND (err u102))
(define-constant ERR-INVALID-AMOUNT (err u103))
(define-constant ERR-LOCK-TOO-SHORT (err u104))

;; 3. READ-ONLY FUNCTIONS (For your Frontend)
;; ---------------------------------------------------------

;; Get the full vault status for a user
(define-read-only (get-vault-status (user principal))
    (map-get? deposits user)
)

;; Calculate blocks remaining until unlock
(define-read-only (get-blocks-remaining (user principal))
    (let (
        (deposit (map-get? deposits user))
    )
    (if (is-some deposit)
        (let ((unlock (get unlock-block (unwrap-panic deposit))))
            (if (>= block-height unlock)
                u0
                (- unlock block-height)
            )
        )
        u0
    ))
)

;; 4. PUBLIC FUNCTIONS
;; ---------------------------------------------------------

;; @desc Deposit STX. If a deposit exists, it ADDS to the balance.
(define-public (deposit-stx (amount uint) (lock-blocks uint))
    (let (
        (previous-deposit (default-to { amount: u0, unlock-block: u0, last-deposit-at: u0 } (map-get? deposits tx-sender)))
        (new-total (+ amount (get amount previous-deposit)))
        ;; Logic: The new unlock block is either the existing one or a new one, whichever is further away.
        (new-unlock (if (> (+ block-height lock-blocks) (get unlock-block previous-deposit))
                        (+ block-height lock-blocks)
                        (get unlock-block previous-deposit)))
    )
        ;; Security Checks
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (asserts! (> lock-blocks u0) ERR-LOCK-TOO-SHORT)

        ;; Transfer STX to Vault
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

        ;; Update the Map (Supports Top-ups!)
        (map-set deposits tx-sender
            {
                amount: new-total,
                unlock-block: new-unlock,
                last-deposit-at: block-height
            }
        )
        
        (print { event: "deposit", user: tx-sender, amount: amount, total: new-total, unlock: new-unlock })
        (ok true)
    )
)

;; @desc Withdraw full balance once the timer expires
(define-public (withdraw-stx)
    (let (
        (deposit (unwrap! (map-get? deposits tx-sender) ERR-NO-DEPOSIT-FOUND))
        (amount (get amount deposit))
        (unlock (get unlock-block deposit))
    )
        ;; Security: Ensure lock-up period is over
        (asserts! (>= block-height unlock) ERR-LOCK-PERIOD-NOT-MET)
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)

        ;; Send STX back to owner
        (try! (as-contract (stx-transfer? amount (as-contract tx-sender) tx-sender)))

        ;; Clear the vault record
        (map-delete deposits tx-sender)
        
        (print { event: "withdraw", user: tx-sender, amount: amount })
        (ok true)
    )
)
