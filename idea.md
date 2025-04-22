# SRS Algorithm Improvement Ideas

## 1. Finer Granularity & More Levels
- Add more SRS levels (e.g., up to 8 or 10) for smoother progression.
- Use a more gradual interval curve (e.g., 1, 2, 4, 7, 14, 30, 60, 120 days).

## 2. Adaptive Intervals
- Personalize intervals based on user performance (e.g., if a user struggles with a card, slow down the interval increase).
- Use “ease factors” (like Anki/SuperMemo): Each card has a factor that increases/decreases based on how easy/hard the user finds it.

## 3. Multiple Response Types
- Instead of just “Correct”/“Incorrect,” allow:
  - “Easy” (increase interval more)
  - “Good” (normal interval)
  - “Hard” (smaller interval increase)
  - “Forgot” (reset or drop interval)
- This gives more data to adapt the schedule.

## 4. Lapses & Leech Handling
- If a card is missed repeatedly, mark it as a “leech” and:
  - Suspend it for a while
  - Show a warning
  - Require extra study before it returns

## 5. Better Logging & Analytics
- Track streaks, time spent, and review history per card.
- Show users their “mature” cards, leeches, and learning stats.

## 6. Sync With Research-Backed Algorithms
- Implement a version of the [SM-2 algorithm](https://en.wikipedia.org/wiki/SuperMemo#The_SM-2_algorithm) (used by Anki), which adapts intervals based on user feedback and a per-card “ease factor”).

---

Daddy Long Legs, revisit these ideas anytime to enhance your SRS system! 

Add navigation links between chat, vocab, grammar, and review pages.
Implement search or filtering for vocab/grammar lists.
Add user stats or a dashboard.
Improve the chat experience (streaming, avatars, etc.).
Add the ability to edit or delete vocab/grammar items.
Polish mobile responsiveness or accessibility