import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import salesRouter from "./sales";
import reportsRouter from "./reports";
import backupRouter from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(salesRouter);
router.use(reportsRouter);
router.use(backupRouter);

export default router;
