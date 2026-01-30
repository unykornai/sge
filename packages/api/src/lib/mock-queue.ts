/**
 * Mock Queue System
 * 
 * In-memory job queue for MOCK_MODE when no Redis is available.
 * Implements a subset of BullMQ API for demo/development.
 */

import { logger } from './logger';

type JobProcessor<T = any> = (job: MockJob<T>) => Promise<any>;
type JobData = Record<string, any>;

export interface MockJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts: any;
  progress: (value: number) => Promise<void>;
  log: (message: string) => Promise<void>;
  updateData: (data: T) => Promise<void>;
}

// Job storage
const queues = new Map<string, MockJob[]>();
const processors = new Map<string, JobProcessor>();
const scheduledJobs = new Map<string, NodeJS.Timeout>();

let jobIdCounter = 1;
const nextJobId = () => `mock-job-${jobIdCounter++}`;

/**
 * Mock Queue class (compatible with BullMQ Queue)
 */
export class MockQueue<T extends JobData = JobData> {
  name: string;
  
  constructor(name: string, _opts?: any) {
    this.name = name;
    if (!queues.has(name)) {
      queues.set(name, []);
    }
    logger.debug({ queue: name }, 'Mock queue created');
  }
  
  async add(jobName: string, data: T, opts?: any): Promise<MockJob<T>> {
    const job: MockJob<T> = {
      id: opts?.jobId || nextJobId(),
      name: jobName,
      data,
      opts: opts || {},
      progress: async (_value: number) => {},
      log: async (message: string) => {
        logger.debug({ jobId: job.id, message }, 'Job log');
      },
      updateData: async (newData: T) => {
        job.data = newData;
      },
    };
    
    const queue = queues.get(this.name) || [];
    queue.push(job);
    queues.set(this.name, queue);
    
    logger.debug({ queue: this.name, jobId: job.id, jobName }, 'Job added to mock queue');
    
    // Process immediately if a processor is registered
    const processor = processors.get(this.name);
    if (processor) {
      setImmediate(async () => {
        try {
          await processor(job);
          logger.debug({ queue: this.name, jobId: job.id }, 'Job processed');
        } catch (error) {
          logger.error({ error, jobId: job.id }, 'Job failed');
        }
      });
    }
    
    return job;
  }
  
  async addBulk(jobs: Array<{ name: string; data: T; opts?: any }>): Promise<MockJob<T>[]> {
    const results: MockJob<T>[] = [];
    for (const job of jobs) {
      results.push(await this.add(job.name, job.data, job.opts));
    }
    return results;
  }
  
  async upsertJobScheduler(
    schedulerId: string,
    opts: { pattern?: string; every?: number },
    template: { name: string; data: T }
  ): Promise<void> {
    // Clear existing scheduler
    const existing = scheduledJobs.get(`${this.name}:${schedulerId}`);
    if (existing) {
      clearInterval(existing);
    }
    
    // For mock, we just log the scheduler
    logger.info({
      queue: this.name,
      schedulerId,
      pattern: opts.pattern,
      every: opts.every,
    }, 'Mock job scheduler registered');
    
    // If 'every' is specified, set up a real interval for demo
    if (opts.every && opts.every < 60000) { // Only for short intervals
      const interval = setInterval(() => {
        this.add(template.name, template.data);
      }, opts.every);
      scheduledJobs.set(`${this.name}:${schedulerId}`, interval);
    }
  }
  
  async getJob(jobId: string): Promise<MockJob<T> | null> {
    const queue = queues.get(this.name) || [];
    return queue.find(j => j.id === jobId) || null;
  }
  
  async getJobs(types: string[]): Promise<MockJob<T>[]> {
    return queues.get(this.name) || [];
  }
  
  async close(): Promise<void> {
    logger.debug({ queue: this.name }, 'Mock queue closed');
  }
}

/**
 * Mock Worker class (compatible with BullMQ Worker)
 */
export class MockWorker<T extends JobData = JobData> {
  name: string;
  processor: JobProcessor<T>;
  
  constructor(name: string, processor: JobProcessor<T>, _opts?: any) {
    this.name = name;
    this.processor = processor;
    processors.set(name, processor);
    logger.debug({ queue: name }, 'Mock worker registered');
  }
  
  on(_event: string, _handler: (...args: any[]) => void): this {
    // No-op for mock - events not implemented
    return this;
  }
  
  async close(): Promise<void> {
    processors.delete(this.name);
    logger.debug({ queue: this.name }, 'Mock worker closed');
  }
}

/**
 * Mock QueueEvents class (compatible with BullMQ QueueEvents)
 */
export class MockQueueEvents {
  name: string;
  
  constructor(name: string, _opts?: any) {
    this.name = name;
  }
  
  on(_event: string, _handler: (...args: any[]) => void): this {
    return this;
  }
  
  async close(): Promise<void> {}
}

// Clear all mock data (for testing)
export function clearMockQueues() {
  queues.clear();
  processors.clear();
  for (const timeout of scheduledJobs.values()) {
    clearInterval(timeout);
  }
  scheduledJobs.clear();
  jobIdCounter = 1;
}
