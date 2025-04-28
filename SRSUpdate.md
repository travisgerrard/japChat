# SRS Update Plan

## 4. Next Steps

1. **Refactor SRS logic into a shared module.**
   - Move all SRS interval, stage, and promotion/demotion logic into a single utility (e.g., `lib/srs.ts`).
   - Ensure this logic is used for all SRS item types: audio, vocab, and grammar.

2. **Update review session logic so that:**
   - Items answered incorrectly are **not hidden until the next day**. Instead, they should reappear in the same session or after a short interval (e.g., 4 hours for Apprentice).
   - Items must be **answered correctly before being scheduled for a future review**. Only correct answers advance the item and schedule it for a later review.

3. **Implement WaniKani-like intervals and penalties for stage progression and demotion.**
   - Use intervals and SRS stages similar to WaniKani (Apprentice, Guru, Master, Enlightened, Burned).
   - On incorrect answers, demote the item by 1–2 stages (depending on current stage), and do not advance the review interval.
   - On correct answers, promote the item by one stage and set the next review according to the new stage's interval.

---

This plan will ensure a more effective and motivating SRS experience, closely matching proven systems like WaniKani and unifying the logic across all review types in Daddy Long Legs. 