import crypto from 'crypto';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class JobQueue {
  constructor() {
    this.jobs = [];
    this.running = 0;
    this.concurrency = Number(process.env.JOB_QUEUE_CONCURRENCY || 2);
    this.processors = new Map();
  }

  registerProcessor(type, handler) {
    this.processors.set(type, handler);
  }

  enqueue(type, payload = {}, options = {}) {
    const job = {
      id: crypto.randomUUID(),
      type,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      backoffMs: options.backoffMs || 1000,
      createdAt: new Date().toISOString(),
      runAfter: Date.now()
    };

    this.jobs.push(job);
    this.pump();

    return {
      queued: true,
      jobId: job.id,
      type: job.type,
      createdAt: job.createdAt
    };
  }

  stats() {
    return {
      queued: this.jobs.length,
      running: this.running,
      processors: Array.from(this.processors.keys())
    };
  }

  async runJob(job) {
    const handler = this.processors.get(job.type);
    if (!handler) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'job_queue_missing_processor',
        jobId: job.id,
        type: job.type,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    try {
      job.attempts += 1;
      await handler(job.payload, { jobId: job.id, attempt: job.attempts });

      console.log(JSON.stringify({
        level: 'info',
        event: 'job_queue_completed',
        jobId: job.id,
        type: job.type,
        attempts: job.attempts,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      if (job.attempts < job.maxAttempts) {
        const delay = job.backoffMs * Math.pow(2, job.attempts - 1);
        job.runAfter = Date.now() + delay;
        this.jobs.push(job);

        console.warn(JSON.stringify({
          level: 'warn',
          event: 'job_queue_retry_scheduled',
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          maxAttempts: job.maxAttempts,
          retryInMs: delay,
          error: error.message,
          timestamp: new Date().toISOString()
        }));
      } else {
        console.error(JSON.stringify({
          level: 'error',
          event: 'job_queue_failed',
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          error: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  pump() {
    if (this.running >= this.concurrency) return;

    const now = Date.now();
    const index = this.jobs.findIndex((job) => job.runAfter <= now);

    if (index === -1) {
      const nextRun = this.jobs.reduce((min, job) => Math.min(min, job.runAfter), Infinity);
      if (Number.isFinite(nextRun)) {
        const waitFor = Math.max(25, nextRun - now);
        setTimeout(() => this.pump(), waitFor);
      }
      return;
    }

    const [job] = this.jobs.splice(index, 1);
    this.running += 1;

    this.runJob(job)
      .finally(() => {
        this.running -= 1;
        this.pump();
      });

    this.pump();
  }
}

export const jobQueue = new JobQueue();
export const enqueueJob = (type, payload, options) => jobQueue.enqueue(type, payload, options);

