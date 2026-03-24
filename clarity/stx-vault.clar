;; STX Savings Vault Pro | 2026 Advanced Edition
;; Secure, incremental time-locked savings on Stacks
;; Optimized for Clarity 2.0

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

;; 3. READ-ONLY FUNCTIONS
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
    (match deposit
        d (let ((unlock (get unlock-block d)))
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

;; @desc Deposit STX. Supports top-ups and extends lock-time if requested.
(define-public (deposit-stx (amount uint) (lock-blocks uint))
    (let (
        (sender tx-sender) ;; Capture the user's address
        (previous-deposit (default-to { amount: u0, unlock-block: u0, last-deposit-at: u0 } (map-get? deposits sender)))
        (new-total (+ amount (get amount previous-deposit)))
        ;; Logic: The new unlock block is either the existing one or a new one, whichever is further away.
        (new-unlock (if (> (+ block-height lock-blocks) (get unlock-block previous-deposit))
                        (+ block-height lock-blocks)
                        (get unlock-block previous-deposit)))
    )
        ;; Security Checks
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (asserts! (> lock-blocks u0) ERR-LOCK-TOO-SHORT)

        ;; Transfer STX from user to the contract address
        (try! (stx-transfer? amount sender (as-contract tx-sender)))

        ;; Update the Map
        (map-set deposits sender
            {
                amount: new-total,
                unlock-block: new-unlock,
                last-deposit-at: block-height
            }
        )

        (print { event: "deposit", user: sender, amount: amount, total: new-total, unlock: new-unlock })
        (ok true)
    )
)

;; @desc Withdraw full balance once the timer expires
(define-public (withdraw-stx)
    (let (
        (sender tx-sender) ;; The person calling the function
        (deposit (unwrap! (map-get? deposits sender) ERR-NO-DEPOSIT-FOUND))
        (amount (get amount deposit))
        (unlock (get unlock-block deposit))
    )
        ;; Security: Ensure lock-up period is over
        (asserts! (>= block-height unlock) ERR-LOCK-PERIOD-NOT-MET)
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)

        ;; Transfer STX from contract back to user
        ;; Inside (as-contract ...), tx-sender BECOMES the contract address
        (try! (as-contract (stx-transfer? amount tx-sender sender)))

        ;; Clear the vault record
        (map-delete deposits sender)

        (print { event: "withdraw", user: sender, amount: amount })
        (ok true)
    )
)
