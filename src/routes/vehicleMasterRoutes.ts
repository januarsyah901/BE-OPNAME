import { Router } from "express";
import { getVehicleMasters, createVehicleMaster } from "../controllers/vehicleMasterController";

const router = Router();

router.get("/", getVehicleMasters);
router.post("/", createVehicleMaster);

export default router;
