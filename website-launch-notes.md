# LakshyaSetu Website Launch Architecture

## Product direction
LakshyaSetu is structured as an exam-first learning platform for UPSC and State PSC aspirants.

## Exam UX
- One-question-at-a-time interface
- Question navigator
- Timer
- Submit and performance snapshot
- First attempt remains the official rank attempt
- Retakes remain practice/review attempts
- Previous attempts expose View Solution and Explanation
- Admin preview is private and never consumes paid attempts

## Admin workflow
Admin creates/publishes a test once. The same `ls_tests` and `ls_test_questions` records are used for student and admin preview, preventing duplicate question versions.

## Content workflow
Topic -> question generation brief -> review -> post/import -> admin preview -> publish -> student attempt -> analysis -> solutions.

## Question Studio
The Question Studio generates a rigorous JSON-compatible generation brief from a topic, exam, difficulty and question count. AI credentials are intentionally kept out of browser code; an authenticated server-side AI endpoint can be connected later without changing the student exam UI.

## Design direction
Clean examination-board feel: restrained colors, consistent spacing, readable cards, strong hierarchy, responsive mobile layout, minimal visual clutter.
