import dotenv from "dotenv";
dotenv.config();

import prisma from "../config/prisma";
import bcrypt from "bcryptjs";

// Helper
const log = (section: string) => console.log(`✅ [${section}] seeded`);
const err = (section: string, e: any) =>
  console.error(`❌ [${section}] ERROR:`, e.message);

async function seedAuthOnly() {
  console.log("🚀 Seeding Auth Users Only...");

  const users = [
    {
      name: "Owner",
      username: "owner",
      password: "owner123",
      role: "owner",
    },
    {
      name: "Admin",
      username: "admin",
      password: "admin123",
      role: "admin",
    },
    {
      name: "Kasir",
      username: "kasir",
      password: "kasir123",
      role: "kasir",
    },
  ];

  for (const u of users) {
    try {
      const password_hash = bcrypt.hashSync(u.password, 10);
      await prisma.users.upsert({
        where: { username: u.username },
        update: {
          name: u.name,
          password_hash,
          role: u.role,
          deleted_at: null,
          is_active: true,
        },
        create: {
          name: u.name,
          username: u.username,
          password_hash,
          role: u.role,
          is_active: true,
        },
      });
      console.log(`- User [${u.username}] with role [${u.role}] synced.`);
    } catch (e: any) {
      err(`User: ${u.username}`, e);
    }
  }

  log("Auth Users");
}

seedAuthOnly()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
