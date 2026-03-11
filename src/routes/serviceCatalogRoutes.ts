import { Router } from "express";
import { 
  getServiceCatalog, 
  createServiceCatalog, 
  updateServiceCatalog, 
  deleteServiceCatalog 
} from "../controllers/serviceCatalogController";

const router = Router();

router.get("/", getServiceCatalog);
router.post("/", createServiceCatalog);
router.put("/:id", updateServiceCatalog);
router.delete("/:id", deleteServiceCatalog);

export default router;
