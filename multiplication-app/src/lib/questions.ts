import type { Question } from '../types';

function weightedRandom(weights: Record<string, number>, keys: string[]): string {
  const totalWeight = keys.reduce((sum, k) => sum + (weights[k] ?? 1), 0);
  let rand = Math.random() * totalWeight;
  for (const key of keys) {
    rand -= weights[key] ?? 1;
    if (rand <= 0) return key;
  }
  return keys[keys.length - 1];
}

function swapDigits(n: number): number {
  const s = String(n);
  if (s.length === 2) {
    return parseInt(s[1] + s[0], 10);
  }
  return n + 10;
}

function generateDistractors(
  multiplicand: number,
  multiplier: number,
  correct: number,
  difficulty: 'easy' | 'medium' | 'hard'
): number[] {
  const distractors = new Set<number>();

  // Distractor 1: neighboring multiplier (±1)
  const neighborUp = multiplicand * (multiplier + 1);
  const neighborDown = multiplicand * (multiplier - 1);
  if (neighborDown > 0 && neighborDown !== correct) {
    distractors.add(neighborDown);
  } else if (neighborUp !== correct) {
    distractors.add(neighborUp);
  }
  if (distractors.size < 1) distractors.add(neighborUp);

  // Distractor 2: digit swap
  const swapped = swapDigits(correct);
  if (swapped !== correct && swapped > 0 && swapped < 150) {
    distractors.add(swapped);
  } else {
    // fallback: neighboring multiplicand
    const altMultiplicand = multiplicand + 1;
    const d = altMultiplicand * multiplier;
    if (d !== correct) distractors.add(d);
  }

  // Distractor 3 depends on difficulty
  if (difficulty === 'easy') {
    // Very obvious wrong answer: addition instead of multiplication
    const addResult = multiplicand + multiplier;
    if (addResult !== correct) distractors.add(addResult);
  } else if (difficulty === 'medium') {
    // Neighboring table error
    const d = multiplicand * (multiplier + 2);
    if (d !== correct) distractors.add(d);
  } else {
    // Hard: close neighbor, off by one factor in both directions
    const d1 = (multiplicand - 1) * multiplier;
    if (d1 > 0 && d1 !== correct) distractors.add(d1);
    const d2 = multiplicand * (multiplier - 2);
    if (d2 > 0 && d2 !== correct) distractors.add(d2);
  }

  // Ensure we have at least 3 distractors
  let extra = 1;
  while (distractors.size < 3) {
    const candidate = correct + extra * (Math.random() > 0.5 ? 1 : -1) * multiplicand;
    if (candidate > 0 && candidate !== correct) distractors.add(Math.abs(candidate));
    extra++;
  }

  // Remove correct answer if accidentally included
  distractors.delete(correct);

  // Take first 3
  return Array.from(distractors).slice(0, 3);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateQuestion(
  table: number | 'mixed',
  difficulty: 'easy' | 'medium' | 'hard',
  weights?: Record<string, number>
): Question {
  let multiplicand: number;
  let multiplier: number;

  const maxMultiplier = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 10;

  if (table === 'mixed') {
    // Generate all possible question keys
    const keys: string[] = [];
    for (let a = 2; a <= 10; a++) {
      for (let b = 1; b <= maxMultiplier; b++) {
        keys.push(`${a}x${b}`);
      }
    }

    const chosenKey = weights ? weightedRandom(weights, keys) : keys[Math.floor(Math.random() * keys.length)];
    const [mA, mB] = chosenKey.split('x').map(Number);
    multiplicand = mA;
    multiplier = mB;
  } else {
    multiplicand = table;
    const keys: string[] = [];
    for (let b = 1; b <= maxMultiplier; b++) {
      keys.push(`${table}x${b}`);
    }
    const chosenKey = weights ? weightedRandom(weights, keys) : keys[Math.floor(Math.random() * keys.length)];
    multiplier = parseInt(chosenKey.split('x')[1], 10);
  }

  const correctAnswer = multiplicand * multiplier;
  const distractors = generateDistractors(multiplicand, multiplier, correctAnswer, difficulty);

  // Build options: correct + 3 distractors, then shuffle
  const allOptions = shuffleArray([correctAnswer, ...distractors.slice(0, 3)]);

  return {
    multiplicand,
    multiplier,
    correctAnswer,
    options: allOptions,
  };
}
