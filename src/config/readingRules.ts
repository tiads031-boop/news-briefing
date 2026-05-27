export const READING_RULES = {
  exposureMinRatio: 0.5,
  exposureMinSeconds: 1,
  heartbeatStepSeconds: 5,
  maxSessionSeconds: 30 * 60,

  // engaged
  engagedExpandedSeconds: 8,
  engagedCardSeconds: 15,

  // read
  readScrollDepth: 0.7,
  readMinSecondsWithScroll: 12,
  readCardSeconds: 25,
  readMinInteractions: 2,
} as const;
