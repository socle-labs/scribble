import { parseRedisUrl } from "@scribble/shared";
import { Queue } from "bullmq";
import { env } from "../env";

const connection = parseRedisUrl(env.REDIS_URL);

export const processRecordingQueue = new Queue("process-recording", { connection });
export const generateScreenshotsQueue = new Queue("generate-screenshots", { connection });
export const exportGuideQueue = new Queue("export-guide", { connection });
