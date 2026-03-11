import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  listNotifications,
  getWaClientStatus,
  getWaQrCode,
  restartWa,
  sendTestNotification,
  retryNotification,
  clearNotifications,
} from "../controllers/notificationController";

const router = Router();

router.use(authenticate);

// Log notifikasi WA
router.get("/wa", listNotifications);
router.delete("/wa", clearNotifications);

// WA Client management (WhatsApp Web.js)
router.get("/wa/status", getWaClientStatus);
router.get("/wa/qr", getWaQrCode);
router.post("/wa/restart", restartWa);
router.post("/wa/test", sendTestNotification);
router.post("/wa/retry/:id", retryNotification);

export default router;
