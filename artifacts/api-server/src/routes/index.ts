import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import proposalsRouter from "./proposals";
import savedJobsRouter from "./savedJobs";
import dashboardRouter from "./dashboard";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(proposalsRouter);
router.use(savedJobsRouter);
router.use(dashboardRouter);
router.use(openaiRouter);

export default router;
