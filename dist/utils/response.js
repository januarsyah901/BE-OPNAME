"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = exports.successResponse = void 0;
const successResponse = (res, data, message = 'OK', statusCode = 200, meta) => {
    return res.status(statusCode).json(Object.assign({ success: true, data,
        message }, (meta ? { meta } : {})));
};
exports.successResponse = successResponse;
const errorResponse = (res, code, message, statusCode = 400, details) => {
    return res.status(statusCode).json({
        success: false,
        error: Object.assign({ code,
            message }, (details ? { details } : {}))
    });
};
exports.errorResponse = errorResponse;
