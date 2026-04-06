import { isRedisAvailable, redis_client } from "./redis.connect.js";

const memoryStore = new Map();

const nowInSeconds = () => Math.floor(Date.now() / 1000);

const serialize = (value) =>
  typeof value === "string" ? value : JSON.stringify(value);

const deserialize = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const getMemoryEntry = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt && entry.expiresAt <= nowInSeconds()) {
    memoryStore.delete(key);
    return null;
  }

  return entry;
};

const setMemoryValue = ({ key, value, ttl }) => {
  memoryStore.set(key, {
    value: serialize(value),
    expiresAt: ttl ? nowInSeconds() + ttl : null,
  });

  return "OK";
};

const getMemoryValue = (key) => {
  const entry = getMemoryEntry(key);
  return entry ? deserialize(entry.value) : null;
};

const deleteMemoryValue = (keys = []) => {
  const normalizedKeys = Array.isArray(keys) ? keys : [keys];
  let deletedCount = 0;

  for (const key of normalizedKeys.filter(Boolean)) {
    if (memoryStore.delete(key)) {
      deletedCount += 1;
    }
  }

  return deletedCount;
};

const memoryExists = (key) => (getMemoryEntry(key) ? 1 : 0);

const memoryTtl = (key) => {
  const entry = getMemoryEntry(key);
  if (!entry) {
    return -2;
  }

  if (!entry.expiresAt) {
    return -1;
  }

  return Math.max(entry.expiresAt - nowInSeconds(), 0);
};

const memoryExpire = ({ key, ttl }) => {
  const entry = getMemoryEntry(key);
  if (!entry) {
    return 0;
  }

  entry.expiresAt = nowInSeconds() + ttl;
  memoryStore.set(key, entry);
  return 1;
};

const memoryFindKeys = (pattern) => {
  const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
  return [...memoryStore.keys()].filter((key) => {
    const entry = getMemoryEntry(key);
    return Boolean(entry) && regex.test(key);
  });
};

export const cleanupExpiredMemoryEntries = () => {
  let cleanedCount = 0;
  const currentTime = nowInSeconds();

  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt && entry.expiresAt <= currentTime) {
      memoryStore.delete(key);
      cleanedCount += 1;
    }
  }

  return cleanedCount;
};

const useRedis = () => isRedisAvailable();

export const setValue = async ({ key, value, ttl } = {}) => {
  if (!key) {
    throw new Error("Redis key is required", { cause: 400 });
  }

  if (useRedis()) {
    const data = serialize(value);
    if (ttl) {
      return redis_client.set(key, data, { EX: ttl });
    }

    return redis_client.set(key, data);
  }

  return setMemoryValue({ key, value, ttl });
};

export const updateValue = async ({ key, value, ttl } = {}) => {
  const keyExists = await exists(key);
  if (!keyExists) {
    return 0;
  }

  return setValue({ key, value, ttl });
};

export const getValue = async (key) => {
  if (useRedis()) {
    return deserialize(await redis_client.get(key));
  }

  return getMemoryValue(key);
};

export const ttl = async (key) => {
  if (useRedis()) {
    return redis_client.ttl(key);
  }

  return memoryTtl(key);
};

export const exists = async (key) => {
  if (useRedis()) {
    return redis_client.exists(key);
  }

  return memoryExists(key);
};

export const expire = async ({ key, ttl: ttlInSeconds } = {}) => {
  if (useRedis()) {
    return redis_client.expire(key, ttlInSeconds);
  }

  return memoryExpire({ key, ttl: ttlInSeconds });
};

export const deleteValue = async (keys = []) => {
  const normalizedKeys = Array.isArray(keys)
    ? keys.filter(Boolean)
    : [keys].filter(Boolean);

  if (!normalizedKeys.length) {
    return 0;
  }

  if (useRedis()) {
    return redis_client.del(normalizedKeys);
  }

  return deleteMemoryValue(normalizedKeys);
};

export const findKeys = async (pattern) => {
  if (useRedis()) {
    const matchedKeys = [];

    for await (const key of redis_client.scanIterator({ MATCH: pattern })) {
      matchedKeys.push(key);
    }

    return matchedKeys;
  }

  return memoryFindKeys(pattern);
};

export const deleteByPattern = async (pattern) => {
  const matchedKeys = await findKeys(pattern);
  return deleteValue(matchedKeys);
};

export const set = setValue;
export const update = updateValue;
export const get = getValue;
export const del = deleteValue;
export const keys = findKeys;
