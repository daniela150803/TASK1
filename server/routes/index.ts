import { Router } from "express";
import healthRouter from "./health.js";
import windRouter from "./wind.js";

const router = Router();
router.use(healthRouter);
router.use(windRouter);

export default router;
