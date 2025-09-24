export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly info?: { url?: string; status?: number; body?: string }
  ) {
    super(message)
    this.name = 'UpstreamError'
  }
}
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}
