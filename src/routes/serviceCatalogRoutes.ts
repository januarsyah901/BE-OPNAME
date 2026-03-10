import { Router } from "express";
import { getServiceCatalog, createServiceCatalog } from "../controllers/serviceCatalogController";

const router = Router();

router.get("/", getServiceCatalog);
router.post("/", createServiceCatalog);

export default router;
