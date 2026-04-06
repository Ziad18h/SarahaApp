import userModel from "../../DB/models/user.model.js";
import cs from "../../config/config.service.js";
import { cleanupExpiredMemoryEntries } from "../../DB/Redis/redis.service.js";

let maintenanceTimer = null;

const clearExpiredUserBans = async () => {
  const result = await userModel.updateMany(
    {
      isBanned: true,
      banExpiresAt: { $lte: new Date() },
    },
    {
      $set: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
        banExpiresAt: null,
        bannedBy: null,
      },
    }
  );

  return result.modifiedCount ?? 0;
};

export const runBackgroundJobsNow = async () => {
  try {
    const [unbannedUsers, cleanedCacheEntries] = await Promise.all([
      clearExpiredUserBans(),
      Promise.resolve(cleanupExpiredMemoryEntries()),
    ]);

    if (unbannedUsers || cleanedCacheEntries) {
      console.log(
        `Maintenance cycle completed: unbanned ${unbannedUsers} user(s), cleaned ${cleanedCacheEntries} cache entr${cleanedCacheEntries === 1 ? "y" : "ies"}`
      );
    }

    return {
      unbannedUsers,
      cleanedCacheEntries,
    };
  } catch (error) {
    console.error("Maintenance job failed:", error.message);
    return {
      unbannedUsers: 0,
      cleanedCacheEntries: 0,
    };
  }
};

export const startBackgroundJobs = () => {
  if (maintenanceTimer) {
    return maintenanceTimer;
  }

  maintenanceTimer = setInterval(() => {
    void runBackgroundJobsNow();
  }, cs.maintenanceIntervalMs);

  if (typeof maintenanceTimer.unref === "function") {
    maintenanceTimer.unref();
  }

  console.log(
    `Background jobs started with interval ${cs.maintenanceIntervalMs}ms`
  );
  void runBackgroundJobsNow();

  return maintenanceTimer;
};

export const stopBackgroundJobs = () => {
  if (!maintenanceTimer) {
    return false;
  }

  clearInterval(maintenanceTimer);
  maintenanceTimer = null;
  return true;
};
