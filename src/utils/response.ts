import { Response } from 'express';

interface Meta {
    page?: number;
    total?: number;
    per_page?: number;
}

export const successResponse = (
    res: Response,
    data: any,
    message = 'OK',
    statusCode = 200,
    meta?: Meta
) => {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
        ...(meta ? { meta } : {})
    });
};

export const errorResponse = (
    res: Response,
    code: string,
    message: string,
    statusCode = 400,
    details?: any
) => {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(details ? { details } : {})
        }
    });
};
