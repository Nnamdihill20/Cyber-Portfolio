#lang racket

;; ============================================================================
;; DSL #2 - ANOMALY ALERT RULE LANGUAGE ("alert-lang")
;; ============================================================================
;;
;; Company: Sentinel Map  |  Racket Development Department  |  AI Agent #2
;;
;; What problem this solves:
;;   The company report's AI Integration section describes "Sentinel," a
;;   threat/anomaly agent that watches corroborated-report clusters for
;;   suspicious spikes and surfaces alerts - WITHOUT ever identifying a
;;   person, only aggregate counts and timing over a place. This DSL is the
;;   rule language that agent would run: a short, ordered set of named
;;   threshold rules over cluster statistics (how many corroborating reports,
;;   how recently they started), each tagged with a severity.
;;
;; Why this is a DSL, not just a function library:
;;   `alert` and `define-alert-rules` give a rule author a fixed, readable
;;   shape - name, condition, severity, message - built as
;;   `define-syntax-rule` macros, the same technique DSL #1 uses, so the
;;   vocabulary is enforced structurally rather than by convention.
;;
;; Evaluation semantics - the deliberate difference from DSL #1:
;;   DSL #1 is FIRST MATCH WINS (ruleset/firewall style): rule order is
;;   precedence. That is wrong for alerting, where you want the MOST
;;   SEVERE applicable alert, not just the first one written down. So this
;;   evaluator instead evaluates EVERY rule, collects every one whose
;;   condition is true, and returns the highest-severity match - rule order
;;   here only matters as a tie-breaker. The two DSLs intentionally show two
;;   different, equally legitimate rule-engine evaluation strategies.
;; ============================================================================

(require rackunit)
(require racket/list)

;; ---------------------------------------------------------------------------
;; Core data types
;; ---------------------------------------------------------------------------

;; A single named alert rule: a predicate over cluster stats, a severity
;; level, and a human-readable message to show if it fires.
(struct alert-rule (label condition severity message) #:transparent)

;; What an alert agent actually observes - aggregate counts and timing for
;; one corroborated-report cluster, never anything identifying a person.
(struct cluster-stats (corroborations minutes-since-first activity-type) #:transparent)

;; The result of evaluating a full rule set against one cluster.
(struct alert-result (label severity message) #:transparent)

;; Severity ordering, low to high. Any severity not listed ranks below all
;; of these (treated as 0) rather than crashing, so a typo in a rule's
;; severity fails safe (loses tie-breaks) instead of erroring out.
(define SEVERITY-RANK (hash "info" 0 "low" 1 "medium" 2 "high" 3 "critical" 4))
(define (severity-rank sev) (hash-ref SEVERITY-RANK sev 0))

;; ---------------------------------------------------------------------------
;; The DSL surface syntax
;; ---------------------------------------------------------------------------

;; (alert "label" (s) condition-expr severity message)
;;
;; `s` is bound, inside condition-expr, to the cluster-stats under
;; evaluation.
(define-syntax-rule (alert label (s) condition severity message)
  (alert-rule label (lambda (s) condition) severity message))

;; (define-alert-rules name alert-expr ...)
;;
;; Binds `name` to the list of rules, in the order given (order only
;; matters as a tie-breaker between equally-severe matches).
(define-syntax-rule (define-alert-rules name r ...)
  (define name (list r ...)))

;; ---------------------------------------------------------------------------
;; The evaluator
;; ---------------------------------------------------------------------------

;; Evaluates every rule against `stats`, keeps every rule whose condition is
;; true, and returns the highest-severity match (first-written wins a tie).
;; If nothing matches, returns an "info"-level no-op result rather than
;; erroring - unlike DSL #1, an alert rule set is not required to have a
;; catch-all, since "nothing happened" is itself a valid, common outcome.
(define (evaluate-alerts rules stats)
  (define matches (filter (lambda (r) ((alert-rule-condition r) stats)) rules))
  (cond
    [(null? matches) (alert-result "none" "info" "no notable pattern")]
    [else
     (define best (argmax (lambda (r) (severity-rank (alert-rule-severity r))) matches))
     (alert-result (alert-rule-label best) (alert-rule-severity best) (alert-rule-message best))]))

;; ---------------------------------------------------------------------------
;; The actual Sentinel Map anomaly-alert rules, written in the DSL
;; ---------------------------------------------------------------------------

(define-alert-rules sentinel-alert-rules
  (alert "rapid-spike" (s)
         (and (>= (cluster-stats-corroborations s) 5)
              (< (cluster-stats-minutes-since-first s) 30))
         "critical"
         "5+ corroborating reports within 30 minutes - possible large-scale enforcement action forming")

  (alert "sustained-cluster" (s)
         (and (>= (cluster-stats-corroborations s) 5)
              (>= (cluster-stats-minutes-since-first s) 30))
         "high"
         "5+ corroborating reports over a longer window - sustained activity at this location")

  (alert "cluster-forming" (s)
         (>= (cluster-stats-corroborations s) 3)
         "medium"
         "Multiple corroborating reports suggest activity worth watching")

  (alert "single-unconfirmed" (s)
         (= (cluster-stats-corroborations s) 1)
         "low"
         "Single, unconfirmed report - no corroboration yet"))

;; ---------------------------------------------------------------------------
;; Demonstration
;; ---------------------------------------------------------------------------

(define (show label stats)
  (define r (evaluate-alerts sentinel-alert-rules stats))
  (printf "~a:\n  rule=~a  severity=~a\n  message: ~a\n\n" label (alert-result-label r) (alert-result-severity r) (alert-result-message r)))

(module+ main
  (show "A fast-forming 6-report cluster in 12 minutes"
        (cluster-stats 6 12 "CHECKPOINT"))

  (show "A 6-report cluster that built up slowly over 2 hours"
        (cluster-stats 6 120 "CHECKPOINT"))

  (show "A modest 3-report cluster"
        (cluster-stats 3 45 "PATROL_PRESENCE"))

  (show "A single unconfirmed report"
        (cluster-stats 1 5 "OTHER"))

  (show "No reports at all"
        (cluster-stats 0 0 "OTHER")))

;; ---------------------------------------------------------------------------
;; Tests (run with: raco test DSL_2_anomaly_alerts.rkt)
;; ---------------------------------------------------------------------------

(module+ test
  (test-case "a fast, large spike is CRITICAL, not just high"
    (define r (evaluate-alerts sentinel-alert-rules (cluster-stats 5 10 "CHECKPOINT")))
    (check-equal? (alert-result-severity r) "critical")
    (check-equal? (alert-result-label r) "rapid-spike"))

  (test-case "the same report count over a long window is only HIGH, not critical"
    (define r (evaluate-alerts sentinel-alert-rules (cluster-stats 5 90 "CHECKPOINT")))
    (check-equal? (alert-result-severity r) "high")
    (check-equal? (alert-result-label r) "sustained-cluster"))

  (test-case "highest-severity-wins, not first-rule-wins: cluster-forming would also match a rapid-spike case, but must lose"
    (define r (evaluate-alerts sentinel-alert-rules (cluster-stats 5 10 "CHECKPOINT")))
    (check-equal? (alert-result-label r) "rapid-spike")
    (check-not-equal? (alert-result-label r) "cluster-forming"))

  (test-case "a modest cluster is medium severity"
    (check-equal? (alert-result-severity (evaluate-alerts sentinel-alert-rules (cluster-stats 3 60 "OTHER"))) "medium"))

  (test-case "a single report is low severity, not silently dropped"
    (check-equal? (alert-result-severity (evaluate-alerts sentinel-alert-rules (cluster-stats 1 5 "OTHER"))) "low"))

  (test-case "zero reports produce a safe info-level no-op, not an error"
    (define r (evaluate-alerts sentinel-alert-rules (cluster-stats 0 0 "OTHER")))
    (check-equal? (alert-result-severity r) "info")
    (check-equal? (alert-result-label r) "none"))

  (test-case "an unknown severity string ranks below every known level rather than crashing"
    (check-equal? (severity-rank "made-up-level") 0)
    (check-true (< (severity-rank "made-up-level") (severity-rank "low")))))
