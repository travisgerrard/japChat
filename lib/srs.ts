// Daddy Long Legs: Shared SRS logic (WaniKani-style)

export type SRSStage = {
  name: string;
  interval: number | null; // ms, null = Burned
};

export const SRS_STAGES: SRSStage[] = [
  { name: 'Apprentice 1', interval: 4 * 60 * 60 * 1000 },      // 4 hours
  { name: 'Apprentice 2', interval: 8 * 60 * 60 * 1000 },      // 8 hours
  { name: 'Apprentice 3', interval: 24 * 60 * 60 * 1000 },     // 1 day
  { name: 'Apprentice 4', interval: 2 * 24 * 60 * 60 * 1000 }, // 2 days
  { name: 'Guru 1',      interval: 7 * 24 * 60 * 60 * 1000 },  // 1 week
  { name: 'Guru 2',      interval: 14 * 24 * 60 * 60 * 1000 }, // 2 weeks
  { name: 'Master',      interval: 30 * 24 * 60 * 60 * 1000 }, // 1 month
  { name: 'Enlightened', interval: 120 * 24 * 60 * 60 * 1000 },// 4 months
  { name: 'Burned',      interval: null },                     // Burned = done
];

export function getSRSStage(level: number): SRSStage {
  return SRS_STAGES[Math.max(0, Math.min(level, SRS_STAGES.length - 1))];
}

export function promoteSRSLevel(level: number): number {
  return Math.min(level + 1, SRS_STAGES.length - 1);
}

export function demoteSRSLevel(level: number): number {
  // WaniKani: If Guru or higher, drop 2 stages; else drop 1 stage (never below 0)
  if (level >= 4) return Math.max(level - 2, 0);
  return Math.max(level - 1, 0);
}

export function computeNextReview(level: number, correct: boolean, now: Date = new Date()): { newLevel: number, nextReview: Date | null } {
  let newLevel = level;
  if (correct) {
    newLevel = promoteSRSLevel(level);
  } else {
    newLevel = demoteSRSLevel(level);
  }
  const stage = getSRSStage(newLevel);
  if (stage.interval === null) return { newLevel, nextReview: null };
  const nextReview = new Date(now.getTime() + stage.interval);
  return { newLevel, nextReview };
} 