const TEST_FILES = [
  { url: 'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js', size: 11400 },
  { url: 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js', size: 130000 },
]

const SPEED_TEST_API = "/api/speed-test";
const TEST_PAYLOAD_SIZE = 2 * 1024 * 1024;

class SpeedTestManager {
  constructor() {
    this.isRunning = false
    this.currentSpeed = 0
    this.measurements = []
    this.maxMeasurements = 10
  }

  async measureSpeed() {
    // try {
    //   const testFile = TEST_FILES[Math.floor(Math.random() * TEST_FILES.length)]
    //   const url = `${testFile.url}?t=${Date.now()}`
      
    //   const startTime = performance.now()
    //   const response = await fetch(url, { 
    //     cache: 'no-store',
    //     mode: 'cors'
    //   })
      
    //   if (!response.ok) {
    //     throw new Error('Failed to fetch test file')
    //   }

    //   await response.blob()
    //   const endTime = performance.now()
      
    //   const durationSeconds = (endTime - startTime) / 1000
    //   const bitsDownloaded = testFile.size * 8
    //   const speedBps = bitsDownloaded / durationSeconds
    //   const speedMbps = speedBps / (1024 * 1024)
      
    //   return Math.max(0.1, speedMbps)
    // } catch (error) {
    //   console.warn('Speed test failed:', error)
    //   return this.getSimulatedSpeed()
    // }
    try {
      const url = `${SPEED_TEST_API}?t=${Date.now()}`
      const startTime = performance.now()

      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch')

      await response.blob()
      const endTime = performance.now()

      const durationSeconds = (endTime - startTime) / 1000
      const bitsDownloaded = TEST_PAYLOAD_SIZE * 8
      const speedBps = bitsDownloaded / durationSeconds
      const speedMbps = speedBps / (1024 * 1024 * 32)

      return Math.max(0.1, speedMbps)
    } catch (err) {
      console.error("Speed test API failed:", err)
      return this.getSimulatedSpeed()
    }
  }

  getSimulatedSpeed() {
    const base = 2.5
    const variation = (Math.random() - 0.5) * 1.5
    return Math.max(0.5, base + variation)
  }

  getSmoothedSpeed() {
    if (this.measurements.length === 0) {
      return this.currentSpeed
    }
    let sum = 0
    let weightSum = 0
    this.measurements.forEach((speed, index) => {
      const weight = index + 1
      sum += speed * weight
      weightSum += weight
    })
    
    return sum / weightSum
  }

  addMeasurement(speed) {
    this.measurements.push(speed)
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift()
    }
    this.currentSpeed = this.getSmoothedSpeed()
  }

  async startMonitoring(callback, interval = 3000) {
    if (this.isRunning) {
      console.warn('Speed test already running')
      return
    }

    this.isRunning = true
    this.measurements = []

    const runTest = async () => {
      if (!this.isRunning) return

      const speed = await this.measureSpeed()
      this.addMeasurement(speed)
      if (callback) {
        callback(this.currentSpeed)
      }

      if (this.isRunning) {
        setTimeout(runTest, interval)
      }
    }
    runTest()
  }

  stopMonitoring() {
    this.isRunning = false
  }

  async getInstantSpeed() {
    const speed = await this.measureSpeed()
    return speed
  }
}

export const speedTest = new SpeedTestManager()

export async function measureNetworkSpeed() {
  return await speedTest.getInstantSpeed()
}

export function startSpeedMonitoring(callback, interval = 3000) {
  speedTest.startMonitoring(callback, interval)
  return () => {
    speedTest.stopMonitoring()
  }
}
