import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import proposalsRouter from "./proposals";
import savedJobsRouter from "./savedJobs";
import dashboardRouter from "./dashboard";
import openaiRouter from "./openai";
import clientsRouter from "./clients";
import invoicesRouter from "./invoices";
import followupsRouter from "./followups";
import templatesRouter from "./templates";
import profileRouter from "./profile";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(proposalsRouter);
router.use(savedJobsRouter);
router.use(dashboardRouter);
router.use(openaiRouter);
router.use(clientsRouter);
router.use(invoicesRouter);
router.use(followupsRouter);
router.use(templatesRouter);
router.use(profileRouter);
router.use(aiRouter);

export default router;
