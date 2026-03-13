import { Request, Response } from "express";
import prisma from "../config/prisma";
import { successResponse, errorResponse } from "../utils/response";

export const getServiceCatalog = async (req: Request, res: Response) => {
  try {
    const data = await prisma.service_catalog.findMany({
      orderBy: { name: "asc" },
    });
    return successResponse(res, data, "Katalog layanan berhasil diambil");
  } catch (error: any) {
    return errorResponse(res, "SERVER_ERROR", error.message, 500);
  }
};

export const createServiceCatalog = async (req: Request, res: Response) => {
  try {
    const { sku, name, description, kategori, standard_price, berlaku_untuk, durasi_estimasi, garansi } = req.body;
    
    if (!name) {
      return errorResponse(res, "VALIDATION_ERROR", "Nama layanan wajib diisi", 400);
    }

    const data = await prisma.service_catalog.create({
      data: {
        sku,
        name,
        description,
        kategori,
        standard_price: standard_price || 0,
        berlaku_untuk: berlaku_untuk || "keduanya",
        durasi_estimasi,
        garansi,
      },
    });

    return successResponse(res, data, "Layanan berhasil ditambahkan ke katalog", 201);
  } catch (error: any) {
    return errorResponse(res, "SERVER_ERROR", error.message, 500);
  }
};

export const updateServiceCatalog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sku, name, description, kategori, standard_price, berlaku_untuk, is_active, durasi_estimasi, garansi } = req.body;

    const data = await prisma.service_catalog.update({
      where: { id: Number(id) },
      data: {
        sku,
        name,
        description,
        kategori,
        standard_price: standard_price !== undefined ? standard_price : undefined,
        berlaku_untuk,
        is_active,
        durasi_estimasi,
        garansi,
      },
    });

    return successResponse(res, data, "Layanan berhasil diperbarui");
  } catch (error: any) {
    return errorResponse(res, "SERVER_ERROR", error.message, 500);
  }
};

export const deleteServiceCatalog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.service_catalog.delete({
      where: { id: Number(id) },
    });
    return successResponse(res, null, "Layanan berhasil dihapus dari katalog");
  } catch (error: any) {
    return errorResponse(res, "SERVER_ERROR", error.message, 500);
  }
};
