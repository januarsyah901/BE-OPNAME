import { Request, Response } from "express";
import prisma from "../config/prisma";
import { successResponse, errorResponse } from "../utils/response";

export const getServiceCatalog = async (req: Request, res: Response) => {
  try {
    const data = await prisma.service_catalog.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
    });
    return successResponse(res, data, "Katalog layanan berhasil diambil");
  } catch (error: any) {
    return errorResponse(res, "SERVER_ERROR", error.message, 500);
  }
};

export const createServiceCatalog = async (req: Request, res: Response) => {
  try {
    const { name, description, kategori, standard_price, berlaku_untuk } = req.body;
    
    if (!name) {
      return errorResponse(res, "VALIDATION_ERROR", "Nama layanan wajib diisi", 400);
    }

    const data = await prisma.service_catalog.create({
      data: {
        name,
        description,
        kategori,
        standard_price: standard_price || 0,
        berlaku_untuk: berlaku_untuk || "keduanya",
      },
    });

    return successResponse(res, data, "Layanan berhasil ditambahkan ke katalog", 201);
  } catch (error: any) {
    return errorResponse(res, "SERVER_ERROR", error.message, 500);
  }
};
