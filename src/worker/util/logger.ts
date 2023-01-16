/**
 * Need a own implementation as we can't access window and therefore apex.debug from worker
 */

const LEVELS = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 4,
  APP_TRACE: 6,
  ENGINE_TRACE: 9,
};

let level = 2;

export function initLogLevel(newLevel: number) {
  level = newLevel;
}

export const log = {
  error: (...args: any[]) => {
    if (level >= LEVELS.ERROR) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (level >= LEVELS.WARN) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (level >= LEVELS.INFO) {
      console.log(...args);
    }
  },
  trace: (...args: any[]) => {
    if (level >= LEVELS.APP_TRACE) {
      console.log(...args);
    }
  },
  engineTrace: (...args: any[]) => {
    if (level >= LEVELS.ENGINE_TRACE) {
      console.log(...args);
    }
  },
};
