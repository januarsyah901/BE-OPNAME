"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate, authMiddleware_1.authorizeAdmin); // semua user route = admin only
router.get('/', userController_1.listUsers);
router.post('/', userController_1.createUser);
router.get('/:id', userController_1.getUser);
router.put('/:id', userController_1.updateUser);
router.delete('/:id', userController_1.deleteUser);
exports.default = router;
