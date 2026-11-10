#lang racket

;; ============================================================================
;; DSL #1 - MODERATION POLICY LANGUAGE ("policy-lang")
;; ============================================================================
;;
;; Company: Sentinel Map  |  Racket Development Department  |  AI Agent #2
;;
;; What problem this solves:
;;   docs/LEGAL.md draws a hard line for the real Sentinel Map application:
;;   it maps PLACES AND EVENTS, never PEOPLE. Every anonymous activity report
;;   submitted to the real app has to be screened against that rule (and
;;   against basic bot/spam abuse) before it's allowed to appear on the map.
;;   This DSL lets that screening policy be written down as a short, ordered
;;   list of named rules - readable by a non-programmer reviewer - instead
;;   of being buried inside general-purpose control flow. It is the design
;;   this project's "Guardian" content-safety agent (see the company report's
;;   AI Integration section) is meant to run on top of.
;;
;; Why this is a DSL, not just a function library:
;;   A plain function-call API would make a policy author write
;;     (if (contains-any? ...) (reject ...) (if (contains-any? ...) ...))
;;   This DSL instead gives a policy author two small purpose-built forms -
;;   `rule` and `define-policy` - whose shape IS the vocabulary of the
;;   problem (a named condition that produces a named action), built with
;;   `define-syntax-rule` macros so that vocabulary is enforced by Racket's
;;   own reader/expander, not just by convention.
;;
;; Evaluation semantics: FIRST MATCH WINS, in the order the rules are
;; written - exactly like a firewall ruleset or a cascading CSS rule - so a
;; policy author controls precedence just by ordering the rules.
;; ============================================================================

(require rackunit)

;; ---------------------------------------------------------------------------
;; Core data types
;; ---------------------------------------------------------------------------

;; A single named rule: a predicate over a submission, and the action to
;; produce if that predicate is true. Condition/action are stored as thunks
;; (lambdas of one argument, the submission) so evaluation is lazy - only the
;; action of the rule that actually fires is ever invoked.
(struct policy-rule (label condition action) #:transparent)

;; A named, ordered collection of rules.
(struct policy (name rules) #:transparent)

;; The shape of the thing a policy is evaluated against - a candidate
;; anonymous activity report, in the same spirit as the real app's
;; ActivityReport model, trimmed to only what moderation needs to see.
(struct submission (description activity-type honeypot) #:transparent)

;; What evaluating a policy against a submission produces.
(struct decision (verdict reason rule-label) #:transparent)

;; ---------------------------------------------------------------------------
;; The DSL surface syntax
;; ---------------------------------------------------------------------------

;; (rule "label" (s) condition-expr action-expr)
;;
;; `s` is bound, inside both condition-expr and action-expr, to the
;; submission under evaluation - this is the one piece of syntactic sugar
;; that makes rule bodies read like plain predicates/actions instead of
;; lambdas.
(define-syntax-rule (rule label (s) condition action)
  (policy-rule label (lambda (s) condition) (lambda (s) action)))

;; (define-policy name rule-expr ...)
;;
;; Binds `name` to a policy built from the given rules, in the order given.
(define-syntax-rule (define-policy name r ...)
  (define name (policy 'name (list r ...))))

;; ---------------------------------------------------------------------------
;; Helper predicates available inside rule conditions
;; ---------------------------------------------------------------------------

;; True if `text` contains any of `phrases`, case-insensitively.
(define (contains-any? text phrases)
  (define lowered (string-downcase text))
  (ormap (lambda (p) (string-contains? lowered (string-downcase p))) phrases))

;; ---------------------------------------------------------------------------
;; The evaluator
;; ---------------------------------------------------------------------------

;; Walks a policy's rules in order; the first rule whose condition is true
;; on `sub` "fires" and its action becomes the decision. A well-formed
;; policy should always end with a catch-all rule (condition #t) so this
;; never falls through - evaluate-policy raises an error if it does, rather
;; than silently returning an ambiguous result.
(define (evaluate-policy pol sub)
  (let loop ([rs (policy-rules pol)])
    (cond
      [(null? rs)
       (error 'evaluate-policy "no rule in ~a matched submission ~a - add a catch-all rule" (policy-name pol) sub)]
      [((policy-rule-condition (car rs)) sub)
       (define result ((policy-rule-action (car rs)) sub))
       (decision (first result) (second result) (policy-rule-label (car rs)))]
      [else (loop (cdr rs))])))

;; ---------------------------------------------------------------------------
;; The actual Sentinel Map moderation policy, written in the DSL
;; ---------------------------------------------------------------------------

(define-policy places-not-people-policy
  (rule "honeypot-filled" (s)
        (not (string=? (submission-honeypot s) ""))
        (list 'reject "bot submission - honeypot field was filled in"))

  (rule "empty-description-ok" (s)
        (string=? (submission-description s) "")
        (list 'allow "no description text to screen"))

  (rule "individual-identifier" (s)
        (contains-any? (submission-description s)
                        '("badge #" "officer " "his name is" "her name is"
                          "license plate" "plate number" "social security"))
        (list 'flag "possible individual identification - violates the places-not-people scope boundary (docs/LEGAL.md)"))

  (rule "slur-or-harassment" (s)
        (contains-any? (submission-description s) '("kill " "threat" "address is"))
        (list 'flag "possible harassment or doxxing content - needs human review"))

  (rule "default-allow" (s)
        #t
        (list 'allow "no policy violation detected")))

;; ---------------------------------------------------------------------------
;; Demonstration
;; ---------------------------------------------------------------------------

(define (show label sub)
  (define d (evaluate-policy places-not-people-policy sub))
  (printf "~a:\n  verdict=~a  rule=~a\n  reason: ~a\n\n"
          label (decision-verdict d) (decision-rule-label d) (decision-reason d)))

(module+ main
  (show "A clean checkpoint report"
        (submission "Checkpoint set up near the highway exit." "CHECKPOINT" ""))

  (show "A report naming an officer"
        (submission "Officer Smith, badge # 4471, is at the corner." "OTHER" ""))

  (show "A bot submission (honeypot tripped)"
        (submission "buy cheap watches now" "OTHER" "filled-by-a-bot"))

  (show "A report with no description"
        (submission "" "PATROL_PRESENCE" ""))

  (show "A harassment-flavored report"
        (submission "Someone's address is 123 Main St, go confront them." "OTHER" "")))

;; ---------------------------------------------------------------------------
;; Tests (run with: raco test DSL_1_moderation_policy.rkt)
;; ---------------------------------------------------------------------------

(module+ test
  (test-case "honeypot takes priority over everything else"
    (define sub (submission "Officer Smith, badge # 1" "OTHER" "bot-value"))
    (check-equal? (decision-verdict (evaluate-policy places-not-people-policy sub)) 'reject)
    (check-equal? (decision-rule-label (evaluate-policy places-not-people-policy sub)) "honeypot-filled"))

  (test-case "individual identifiers are flagged, not silently allowed"
    (define sub (submission "His name is John and he drives a blue sedan." "OTHER" ""))
    (check-equal? (decision-verdict (evaluate-policy places-not-people-policy sub)) 'flag)
    (check-equal? (decision-rule-label (evaluate-policy places-not-people-policy sub)) "individual-identifier"))

  (test-case "license plate mentions are flagged"
    (define sub (submission "I got the license plate number, it's ABC123." "OTHER" ""))
    (check-equal? (decision-verdict (evaluate-policy places-not-people-policy sub)) 'flag))

  (test-case "harassment content is flagged"
    (define sub (submission "I found their address is 123 Main St." "OTHER" ""))
    (check-equal? (decision-verdict (evaluate-policy places-not-people-policy sub)) 'flag)
    (check-equal? (decision-rule-label (evaluate-policy places-not-people-policy sub)) "slur-or-harassment"))

  (test-case "an ordinary, policy-compliant report is allowed"
    (define sub (submission "ICE agents parked outside the courthouse." "PATROL_PRESENCE" ""))
    (check-equal? (decision-verdict (evaluate-policy places-not-people-policy sub)) 'allow)
    (check-equal? (decision-rule-label (evaluate-policy places-not-people-policy sub)) "default-allow"))

  (test-case "contains-any? is case-insensitive"
    (check-true (contains-any? "OFFICER Smith is here" '("officer")))
    (check-false (contains-any? "nothing to see here" '("officer")))))
