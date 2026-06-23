import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { permissions, roles } from "../src/shared/demo-data";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "postgresql://filerepo:filerepo@localhost:5432/filerepo"
});

const prisma = new PrismaClient({ adapter });

const emailTemplates = [
  {
    templateKey: "smtp.test",
    subject: "SMTP test from Enterprise File Repository",
    textBody: "This is a test email from {{appName}} sent at {{timestamp}}.",
    htmlBody: "<p>This is a test email from <strong>{{appName}}</strong> sent at {{timestamp}}.</p>"
  },
  {
    templateKey: "file.scan.infected",
    subject: "Malware detected in uploaded file",
    textBody:
      "Malware was detected in {{fileName}}. File ID: {{fileId}}. Version ID: {{versionId}}. Signature: {{signature}}.",
    htmlBody:
      "<p>Malware was detected in <strong>{{fileName}}</strong>.</p><p>File ID: {{fileId}}<br/>Version ID: {{versionId}}<br/>Signature: {{signature}}</p>"
  },
  {
    templateKey: "file.scan.failed",
    subject: "File antivirus scan failed",
    textBody: "Antivirus scanning failed for {{fileName}}. Version ID: {{versionId}}. Reason: {{reason}}.",
    htmlBody:
      "<p>Antivirus scanning failed for <strong>{{fileName}}</strong>.</p><p>Version ID: {{versionId}}<br/>Reason: {{reason}}</p>"
  }
];

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

  const department = await prisma.department.upsert({
    where: { code: "IT" },
    update: {},
    create: {
      code: "IT",
      name: "Information Technology",
      description: "System administration and platform ownership"
    }
  });

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission },
      update: {},
      create: {
        key: permission,
        description: permission
      }
    });
  }

  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        isSystemRole: true
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystemRole: true
      }
    });

    for (const permissionKey of role.permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionKey: {
            roleId: createdRole.id,
            permissionKey
          }
        },
        update: {},
        create: {
          roleId: createdRole.id,
          permissionKey
        }
      });
    }
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "SUPER_ADMIN" }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {
      departmentId: department.id,
      status: "ACTIVE"
    },
    create: {
      email: "admin@company.com",
      fullName: "System Admin",
      employeeCode: "ADMIN-001",
      country: "India",
      departmentId: department.id,
      passwordHash: await bcrypt.hash(adminPassword, 12)
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id
    }
  });

  const existingRoot = await prisma.folder.findFirst({
    where: {
      parentId: null,
      name: "Company Repository"
    }
  });

  if (!existingRoot) {
    await prisma.folder.create({
      data: {
        name: "Company Repository",
        pathCache: "Company Repository",
        departmentId: department.id,
        createdById: admin.id
      }
    });
  }

  for (const template of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { templateKey: template.templateKey },
      update: template,
      create: template
    });
  }

  console.log("Seed complete");
  console.log("Admin email: admin@company.com");
  console.log("Admin password:", adminPassword);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
