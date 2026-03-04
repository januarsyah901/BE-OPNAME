"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const vehicleController_1 = require("../controllers/vehicleController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.put('/:id', vehicleController_1.updateVehicle);
exports.default = router;
