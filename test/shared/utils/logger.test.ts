import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../../src/shared/utils/logger';

// LogLevel enum is not exported; numeric values from src/shared/utils/logger.ts
const DEBUG = 0;
const INFO = 1;
const WARN = 2;
const ERROR = 3;
const NONE = 4;

interface LoggerStatics {
  setLevel(level: number): void;
  getLevel(): number;
}

function statics(logger: object): LoggerStatics {
  return logger.constructor as unknown as LoggerStatics;
}

describe('createLogger', () => {
  const logger = createLogger('Test:ns');
  const Logger = statics(logger);
  let originalLevel: number;
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalLevel = Logger.getLevel();
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    Logger.setLevel(originalLevel);
    debugSpy.mockRestore();
    logSpy.mockRestore();
    // console.warn / console.error are spied by test/setup.ts; clear expected calls
    vi.mocked(console.warn).mockClear();
    vi.mocked(console.error).mockClear();
  });

  it('defaults to WARN outside production (NODE_ENV=test)', () => {
    expect(Logger.getLevel()).toBe(WARN);
  });

  it('at WARN level, suppresses debug/info and emits warn/error', () => {
    Logger.setLevel(WARN);
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('[Test:ns]', 'w');
    expect(console.error).toHaveBeenCalledWith('[Test:ns]', 'e');
  });

  it('at DEBUG level, routes each method to its console function with namespace prefix', () => {
    Logger.setLevel(DEBUG);
    const err = new Error('boom');
    logger.debug('d', 1);
    logger.info('i', { a: 1 });
    logger.warn('w');
    logger.error('e', err);

    expect(debugSpy).toHaveBeenCalledWith('[Test:ns]', 'd', 1);
    expect(logSpy).toHaveBeenCalledWith('[Test:ns]', 'i', { a: 1 });
    expect(console.warn).toHaveBeenCalledWith('[Test:ns]', 'w');
    expect(console.error).toHaveBeenCalledWith('[Test:ns]', 'e', err);
  });

  it('at INFO level, suppresses only debug', () => {
    Logger.setLevel(INFO);
    logger.debug('d');
    logger.info('i');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[Test:ns]', 'i');
  });

  it('at ERROR level, emits only error', () => {
    Logger.setLevel(ERROR);
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(logSpy).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('at NONE level, emits nothing', () => {
    Logger.setLevel(NONE);
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('shares the level across all logger instances (static)', () => {
    const other = createLogger('Other');
    Logger.setLevel(INFO);
    expect(statics(other).getLevel()).toBe(INFO);
    other.info('x');
    expect(logSpy).toHaveBeenCalledWith('[Other]', 'x');
  });

  it('emits the prefix alone when called with no arguments', () => {
    logger.warn();
    expect(console.warn).toHaveBeenCalledWith('[Test:ns]');
  });
});

describe('logger default level in production', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to ERROR when NODE_ENV=production at module load', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const mod = await import('../../../src/shared/utils/logger');
    const prodLogger = mod.createLogger('Prod');

    expect(statics(prodLogger).getLevel()).toBe(ERROR);
    prodLogger.warn('hidden');
    expect(console.warn).not.toHaveBeenCalled();
  });
});
