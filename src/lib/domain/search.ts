export function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLen][aLen];
}

export function fuzzySort(
  items: Array<{ nameLower: string; [key: string]: unknown }>,
  query: string
): Array<{ nameLower: string; [key: string]: unknown }> {
  const queryLower = query.toLowerCase();

  return [...items].sort((a, b) => {
    const distA = levenshteinDistance(a.nameLower, queryLower);
    const distB = levenshteinDistance(b.nameLower, queryLower);
    return distA - distB;
  });
}
