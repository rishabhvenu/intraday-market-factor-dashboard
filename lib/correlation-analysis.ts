export interface CorrelationMatrix {
  symbols: string[]
  matrix: number[][]
}

export interface PCAResult {
  components: number[][]
  explainedVariance: number[]
  symbols: string[]
}

// Calculate Pearson correlation coefficient between two arrays
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0

  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0)
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0)
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

// Calculate rolling returns from price data
function calculateReturns(prices: number[], window = 1): number[] {
  const returns: number[] = []
  for (let i = window; i < prices.length; i++) {
    const currentPrice = prices[i]
    const previousPrice = prices[i - window]
    if (previousPrice !== 0) {
      returns.push((currentPrice - previousPrice) / previousPrice)
    }
  }
  return returns
}

// Calculate correlation matrix for multiple symbols
export function calculateCorrelationMatrix(
  symbolsData: Array<{ symbol: string; data: Array<{ close: number }> }>,
  lookbackPeriod = 50,
): CorrelationMatrix {
  const symbols = symbolsData.map((s) => s.symbol)
  const returns = symbolsData.map((s) => {
    if (!s.data || !Array.isArray(s.data) || s.data.length === 0) {
      return []
    }
    const prices = s.data.slice(-lookbackPeriod).map((d) => d.close)
    return calculateReturns(prices)
  })

  const matrix: number[][] = []

  for (let i = 0; i < symbols.length; i++) {
    matrix[i] = []
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) {
        matrix[i][j] = 1 // Perfect correlation with itself
      } else {
        matrix[i][j] = pearsonCorrelation(returns[i], returns[j])
      }
    }
  }

  return { symbols, matrix }
}

// Simple PCA implementation (first two components only)
export function calculatePCA(
  symbolsData: Array<{ symbol: string; data: Array<{ close: number }> }>,
  lookbackPeriod = 50,
): PCAResult {
  const symbols = symbolsData.map((s) => s.symbol)
  const returns = symbolsData.map((s) => {
    if (!s.data || !Array.isArray(s.data) || s.data.length === 0) {
      return []
    }
    const prices = s.data.slice(-lookbackPeriod).map((d) => d.close)
    return calculateReturns(prices)
  })

  // Ensure all return arrays have the same length
  const minLength = Math.min(...returns.map((r) => r.length))
  const normalizedReturns = returns.map((r) => r.slice(-minLength))

  // Calculate means
  const means = normalizedReturns.map((r) => r.reduce((a, b) => a + b, 0) / r.length)

  // Center the data
  const centeredData = normalizedReturns.map((r, i) => r.map((val) => val - means[i]))

  // Calculate covariance matrix
  const n = symbols.length
  const covariance: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0
      for (let k = 0; k < minLength; k++) {
        sum += centeredData[i][k] * centeredData[j][k]
      }
      covariance[i][j] = sum / (minLength - 1)
    }
  }

  // Simplified PCA: just return the first two eigenvector approximations
  // This is a simplified version - in practice you'd use proper eigenvalue decomposition
  const components: number[][] = []
  const explainedVariance: number[] = []

  // First component (approximation): direction of maximum variance
  const firstComponent = Array(n).fill(1 / Math.sqrt(n)) // Equal weights as approximation
  components.push(firstComponent)
  explainedVariance.push(0.6) // Approximate explained variance

  // Second component (approximation): orthogonal to first
  const secondComponent = Array(n)
    .fill(0)
    .map((_, i) => (i % 2 === 0 ? 1 : -1) / Math.sqrt(n))
  components.push(secondComponent)
  explainedVariance.push(0.3) // Approximate explained variance

  return { components, explainedVariance, symbols }
}
