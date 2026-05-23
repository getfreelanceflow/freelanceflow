import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import proposalsRouter from "./proposals";
import savedJobsRouter from "./savedJobs";
import dashboardRouter from "./dashboard";
import clientsRouter from "./clients";
import invoicesRouter from "./invoices";
import followupsRouter from "./followups";
import templatesRouter from "./templates";
import profileRouter from "./profile";
import aiRouter from "./ai";
import timeEntriesRouter from "./timeEntries";
import tasksRouter from "./tasks";
import expensesRouter from "./expenses";
import goalsRouter from "./goals";
import parseResumeRouter from "./parseResume";
import demoDataRouter from "./demoData";
import searchRouter from "./search";
import notificationsRouter from "./notifications";
import { servicePackagesRouter } from "./servicePackages";
import contactRouter from "./contact";

const router: IRouter = Router();

router.use(healthRouter);
// Register public routers early — their public routes must run before
// other routers' top-level requireUser middleware can intercept them.
router.use(servicePackagesRouter);
router.use(contactRouter);
router.use(jobsRouter);
router.use(proposalsRouter);
router.use(savedJobsRouter);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(invoicesRouter);
router.use(followupsRouter);
router.use(templatesRouter);
router.use(profileRouter);
router.use(aiRouter);
router.use(timeEntriesRouter);
router.use(tasksRouter);
router.use(expensesRouter);
router.use(goalsRouter);
router.use(parseResumeRouter);
router.use(demoDataRouter);
router.use(searchRouter);
router.use(notificationsRouter);

export default router;
