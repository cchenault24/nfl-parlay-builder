interface ResponseTimeData {
  averageTime: number
  callCount: number
  lastUpdated: number
}

const STORAGE_KEY = 'parlay_response_times'
const DEFAULT_ESTIMATED_TIME = 20000 // 20 seconds in milliseconds
const MAX_STORED_TIMES = 10 // Keep only last 10 response times for average

export class ResponseTimeTracker {
  private static instance: ResponseTimeTracker
  private responseTimes: number[] = []
  private averageTime: number = DEFAULT_ESTIMATED_TIME

  private constructor() {
    this.loadFromStorage()
  }

  static getInstance(): ResponseTimeTracker {
    if (!ResponseTimeTracker.instance) {
      ResponseTimeTracker.instance = new ResponseTimeTracker()
    }
    return ResponseTimeTracker.instance
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data: ResponseTimeData = JSON.parse(stored)
        this.averageTime = data.averageTime
        this.responseTimes = Array(data.callCount).fill(data.averageTime)
      }
    } catch (error) {
      console.warn('Failed to load response time data from storage:', error)
    }
  }

  private saveToStorage(): void {
    try {
      const data: ResponseTimeData = {
        averageTime: this.averageTime,
        callCount: this.responseTimes.length,
        lastUpdated: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save response time data to storage:', error)
    }
  }

  recordResponseTime(responseTime: number): void {
    // Add the new response time
    this.responseTimes.push(responseTime)

    // Keep only the last MAX_STORED_TIMES responses
    if (this.responseTimes.length > MAX_STORED_TIMES) {
      this.responseTimes = this.responseTimes.slice(-MAX_STORED_TIMES)
    }

    // Calculate new average
    this.averageTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) /
      this.responseTimes.length

    // Save to storage
    this.saveToStorage()
  }

  getEstimatedTime(): number {
    return this.averageTime
  }

  getCallCount(): number {
    return this.responseTimes.length
  }

  isFirstRun(): boolean {
    return this.responseTimes.length === 0
  }

  reset(): void {
    this.responseTimes = []
    this.averageTime = DEFAULT_ESTIMATED_TIME
    localStorage.removeItem(STORAGE_KEY)
  }

  getDebugInfo(): {
    averageTime: number
    callCount: number
    isFirstRun: boolean
    responseTimes: number[]
  } {
    return {
      averageTime: this.averageTime,
      callCount: this.responseTimes.length,
      isFirstRun: this.isFirstRun(),
      responseTimes: [...this.responseTimes],
    }
  }
}

export const responseTimeTracker = ResponseTimeTracker.getInstance()
