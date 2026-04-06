import { createClient } from "redis";
import cs from "../../config/config.service.js";

let hasErrorListener = false;
let redisAvailable = false;

export const redis_client = cs.redisUrl
  ? createClient({
      url: cs.redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: () => false,
      },
    })
  : null;

export const isRedisAvailable = () => redisAvailable && Boolean(redis_client?.isOpen);

export const CheckRedisConnect = async () => {
  if (!redis_client) {
    console.warn("Redis URL is not configured. Falling back to in-memory store.");
    redisAvailable = false;
    return false;
  }

  if (!hasErrorListener) {
    redis_client.on("error", (error) => {
      redisAvailable = false;
      console.warn("Redis error:", error.message);
    });
    hasErrorListener = true;
  }

  if (redis_client.isOpen) {
    redisAvailable = true;
    return true;
  }

  try {
    await Promise.race([
      redis_client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timeout")), 3500)
      ),
    ]);
    redisAvailable = true;
    console.log("Redis Connected");
    return true;
  } catch (error) {
    redisAvailable = false;
    console.warn("Redis connection failed. Falling back to in-memory store.");
    return false;
  }
};
