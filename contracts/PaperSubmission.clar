(define-constant ERR_NOT_AUTHORIZED u100)
(define-constant ERR_ALREADY_SUBMITTED u101)
(define-constant ERR_INSUFFICIENT_STAKE u102)
(define-constant ERR_INVALID_HASH u103)
(define-constant ERR_INVALID_TITLE u104)
(define-constant ERR_INVALID_ABSTRACT u105)
(define-constant ERR_INVALID_SUBMISSION_ID u106)
(define-constant ERR_INVALID_STATUS u107)

(define-data-var submission-counter uint u0)
(define-data-var minimum-stake uint u1000000)
(define-data-var max-submissions uint u10000)

(define-map submissions
  { submission-id: uint }
  {
    author: principal,
    paper-hash: (buff 32),
    title: (string-utf8 256),
    abstract: (string-utf8 1000),
    timestamp: uint,
    stake-amount: uint,
    status: (string-ascii 20)
  }
)

(define-constant user-registry-contract 'SP000000000000000000002Q6VF78.user-registry)
(define-constant plagiarism-detector-contract 'SP000000000000000000002Q6VF78.plagiarism-detector)
(define-constant reviewer-assignment-contract 'SP000000000000000000002Q6VF78.reviewer-assignment)
(define-constant reward-token-contract 'SP000000000000000000002Q6VF78.reward-token)

(define-read-only (get-submission (submission-id uint))
  (map-get? submissions { submission-id: submission-id })
)

(define-read-only (get-submission-count)
  (var-get submission-counter)
)

(define-read-only (get-minimum-stake)
  (var-get minimum-stake)
)

(define-private (validate-hash (paper-hash (buff 32)))
  (if (> (len paper-hash) u0)
      (ok true)
      (err ERR_INVALID_HASH))
)

(define-private (validate-title (title (string-utf8 256)))
  (if (and (> (len title) u0) (<= (len title) u256))
      (ok true)
      (err ERR_INVALID_TITLE))
)

(define-private (validate-abstract (abstract (string-utf8 1000)))
  (if (and (> (len abstract) u0) (<= (len abstract) u1000))
      (ok true)
      (err ERR_INVALID_ABSTRACT))
)

(define-private (validate-submission-id (submission-id uint))
  (if (< submission-id (var-get submission-counter))
      (ok true)
      (err ERR_INVALID_SUBMISSION_ID))
)

(define-public (set-minimum-stake (new-stake uint))
  (begin
    (asserts! (is-eq tx-sender (unwrap! (var-get authority-contract) (err ERR_NOT_AUTHORIZED))) (err ERR_NOT_AUTHORIZED))
    (asserts! (> new-stake u0) (err ERR_INSUFFICIENT_STAKE))
    (var-set minimum-stake new-stake)
    (ok true)
  )
)

(define-public (submit-paper (paper-hash (buff 32)) (title (string-utf8 256)) (abstract (string-utf8 1000)))
  (let
    (
      (submission-id (var-get submission-counter))
      (sender tx-sender)
      (current-block-height (unwrap-panic (get-block-info? time u0)))
    )
    (asserts! (< submission-id (var-get max-submissions)) (err ERR_INVALID_SUBMISSION_ID))
    (asserts! (is-some (contract-call? user-registry-contract get-user sender)) (err ERR_NOT_AUTHORIZED))
    (try! (validate-hash paper-hash))
    (try! (validate-title title))
    (try! (validate-abstract abstract))
    (asserts! (is-ok (contract-call? plagiarism-detector-contract check-plagiarism paper-hash)) (err ERR_ALREADY_SUBMITTED))
    (try! (stx-transfer? (var-get minimum-stake) sender (as-contract tx-sender)))
    (map-insert submissions
      { submission-id: submission-id }
      {
        author: sender,
        paper-hash: paper-hash,
        title: title,
        abstract: abstract,
        timestamp: current-block-height,
        stake-amount: (var-get minimum-stake),
        status: "pending"
      }
    )
    (var-set submission-counter (+ submission-id u1))
    (try! (contract-call? reviewer-assignment-contract assign-reviewers submission-id))
    (ok submission-id)
  )
)

(define-public (update-status (submission-id uint) (new-status (string-ascii 20)))
  (let
    (
      (submission (unwrap! (map-get? submissions { submission-id: submission-id }) (err ERR_INVALID_SUBMISSION_ID)))
    )
    (asserts! (is-eq tx-sender 'SP000000000000000000002Q6VF78.consensus-voting) (err ERR_NOT_AUTHORIZED))
    (asserts! (or (is-eq new-status "pending") (is-eq new-status "review") (is-eq new-status "accepted") (is-eq new-status "rejected")) (err ERR_INVALID_STATUS))
    (map-set submissions
      { submission-id: submission-id }
      (merge submission { status: new-status })
    )
    (ok true)
  )
)

(define-public (refund-stake (submission-id uint))
  (let
    (
      (submission (unwrap! (map-get? submissions { submission-id: submission-id }) (err ERR_INVALID_SUBMISSION_ID)))
      (author (get author submission))
      (stake (get stake-amount submission))
    )
    (asserts! (is-eq tx-sender 'SP000000000000000000002Q6VF78.consensus-voting) (err ERR_NOT_AUTHORIZED))
    (asserts! (is-eq (get status submission) "rejected") (err ERR_INVALID_STATUS))
    (try! (as-contract (stx-transfer? stake tx-sender author)))
    (map-set submissions
      { submission-id: submission-id }
      (merge submission { stake-amount: u0 })
    )
    (ok true)
  )
)