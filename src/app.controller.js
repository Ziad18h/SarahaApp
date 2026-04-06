import path from "node:path";
import cors from "cors";
import express from "express";
import cs from "./config/config.service.js";
import checkConnectionDB from "./DB/connectionDB.js";
import { CheckRedisConnect } from "./DB/Redis/redis.connect.js";
import { startBackgroundJobs } from "./common/utilties/cron.service.js";
import messageRouter from "./modules/messages/message.controller.js";
import userRouter from "./modules/users/user.controller.js";

const app = express();

const bootstarp = async () => {
  app.use(cors());
  app.use(express.json());
  app.use("/files", express.static(path.resolve("files")));

  app.get("/", (req, res) => {
    res.status(200).json({ msg: "Welcome to Saraha" });
  });

  await checkConnectionDB();
  await CheckRedisConnect();
  startBackgroundJobs();

  app.use("/users", userRouter);
  app.use("/messages", messageRouter);

  app.use((req, res, next) => {
    next(new Error(`Url ${req.originalUrl} Not Found`, { cause: 404 }));
  });

  app.use((err, req, res, next) => {
    const statusCode = Number(err.cause) || 500;
    const response = {
      message: err.message || "Internal Server Error",
    };

    if (process.env.NODE_ENV !== "production") {
      response.stack = err.stack;
    }

    res.status(statusCode).json(response);
  });

  app.listen(cs.port, () => {
    console.log(`server is running on port ${cs.port}`);
  });
};

export { bootstarp };
