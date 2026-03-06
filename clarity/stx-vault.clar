;; stx-vault.clar
;; Simple STX time-lock vault

;; Store deposits
(define-map deposits
    { owner: principal }
    {
        amount: uint,
        unlock-block: uint
    }
)

;; Contract owner
(define-data-var contract-owner principal tx-sender)

;; Error codes
(define-constant err-lock-period-not-met (err u101))
(define-constant err-no-deposit-found (err u102))
(define-constant err-lock-must-be-positive (err u103))

;; Deposit STX with a lock period
(define-public (deposit-stx (amount uint) (lock-blocks uint))
    (begin
        ;; Ensure positive lock
        (asserts! (> lock-blocks u0) err-lock-must-be-positive)

        ;; Transfer STX to contract
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

        ;; Save deposit
        (map-set deposits
            { owner: tx-sender }
            {
                amount: amount,
                unlock-block: (+ block-height lock-blocks)
            }
        )

        (ok true)
    )
)

;; Withdraw after lock expires
(define-public (withdraw-stx)
    (let (
        (deposit (map-get? deposits { owner: tx-sender }))
    )
        (asserts! (is-some deposit) err-no-deposit-found)

        (let (
            (amount (get amount (unwrap-panic deposit)))
            (unlock (get unlock-block (unwrap-panic deposit)))
        )

            ;; Ensure lock expired
            (asserts! (>= block-height unlock) err-lock-period-not-met)

            ;; Send STX back to user
            (try! (stx-transfer? amount (as-contract tx-sender) tx-sender))

            ;; Remove deposit
            (map-delete deposits { owner: tx-sender })

            (ok true)
        )
    )
)