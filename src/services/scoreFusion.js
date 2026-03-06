export function fuseScores({ baseScore, llmScore }) {
  if (!llmScore) return baseScore;

  return Math.round((baseScore * 0.7) + (llmScore * 0.3));
}
