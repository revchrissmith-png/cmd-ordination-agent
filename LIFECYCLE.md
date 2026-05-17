# Development Lifecycle

**CMD Ordination Portal**

*Effective 1 June 2026. This policy governs all development of the portal following its launch.*

---

## Purpose

The CMD Ordination Portal was built to carry the district's ordination process for years, not months. A system that is rebuilt or adjusted continuously is not, in practice, a stable system: every change is a fresh opportunity for regression, and every regression a fresh call on the one person able to answer it. This document fixes the portal's development to a predictable annual rhythm, so that the system can be trusted precisely because it is not in constant motion.

The cadence set out below is an act of stewardship rather than a withdrawal of support. It protects the ordinands and council members who depend on the portal from the disruption of unscheduled change. It protects the portal itself from the slow accumulation of unreviewed edits. And it protects the district's investment by holding the system's maintenance to a sustainable, and in time transferable, shape. A portal that changes only on a published schedule is a portal a successor can learn, hold, and maintain.

---

## The Development Cadence

Portal development proceeds on a fixed annual cycle of two windows. Outside these windows the codebase is closed — no features, no enhancements, no discretionary fixes.

**The December bug-fix window — 8–21 December.** The second and third weeks of December are reserved for correcting defects identified over the preceding year. This window addresses faults in existing behaviour; it does not introduce new capability.

**The June feature-update window — 8–21 June.** The second and third weeks of June are reserved for new features and enhancements requested over the preceding year. Substantive change to what the portal does is confined to this window.

Between the close of one window and the opening of the next, the portal is held as released. This freeze is the load-bearing element of the policy: it is what makes the system's behaviour predictable to the people who depend on it, and what keeps its maintenance within sustainable bounds. The sole exception is the cadence-break procedure described below.

---

## Launch Stabilization Tail

The portal launches on 1 June 2026. Because a newly launched system reliably surfaces faults in its first days of real use, the period from **1 June through 7 June 2026** is designated a one-time stabilization tail. During this tail, launch-week defects may be corrected without invoking the cadence-break procedure.

The tail closes on 7 June 2026. From that date the locked cadence above governs in full, and the next scheduled access to the codebase is the December 2026 bug-fix window. The 7 June close is deliberate and final: it is the date the portal's builder departs for the 2026 General Assembly, and the cadence is set so that it holds in his absence.

---

## Feedback and the Protected Class

All feedback on the portal — defect reports, feature requests, and observations alike — is received and logged by Michelle, the District Communications Manager. Feedback is recorded against the appropriate development window. It is not escalated in real time, and it does not reach the portal's developer directly. A single, designated intake point is itself part of the policy: it is what keeps the cadence from being eroded one urgent-sounding message at a time.

For the purpose of this policy, the **protected class** — the users whose obstruction can give rise to a cadence-break — comprises **ordinands and council members**. District office staff and mentors stand outside the protected class; difficulties they encounter are logged to the appropriate window like any other feedback.

---

## The Cadence-Break Exception

Development may reopen outside a scheduled window only when a defect crosses a strict threshold. The threshold is an **AND-gate**: all three of the conditions below must be satisfied together. A defect that meets two of the three does not qualify.

1. **It blocks required work.** The defect prevents an ordinand or council member from completing a required workflow, and the system offers no working alternative. A manual intervention by a developer — correcting data by hand, or performing a step on a user's behalf — does not count as a working alternative. The test is whether the system itself provides a path, not whether the defect can be worked around off-system.

2. **It is reproducible and ongoing.** The defect recurs reliably and remains active. A one-time or intermittent fault that cannot be reproduced does not qualify.

3. **It has reached a threshold of harm.** The defect has affected at least one user for more than 14 calendar days, **or** it affects more than 10 percent of the combined ordinand-and-council cohort.

When all three conditions are met, **Michelle confirms in writing that the threshold is satisfied** before development reopens. That written confirmation is the authorization; absent it, the window stays closed.

A cadence-break deployment is **scoped to the single qualifying defect**. The reopened codebase is not an occasion for unrelated improvements, deferred fixes, or "while we are in here" changes — those wait for their scheduled window. The break closes as soon as the one defect is corrected.

---

## Standing of This Policy

This lifecycle policy was presented to the CMD Ordaining Council on 25 May 2026. It is a settled decision of the portal's steward, recorded here so that it governs by being written rather than by being remembered, and so that it remains legible to whoever carries the portal next.
