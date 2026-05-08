import { db, conn } from "../api/queries/connection";
import { hashPassword } from "../api/lib/hash";
import {
  users,
  programs,
  programVersions,
  courses,
  courseVersions,
  modules,
  moduleVersions,
  moduleContents,
  assessments,
  assessmentVersions,
  questions,
  answerOptions,
  certificateTemplates,
} from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Create superadmin
  const [superadmin] = await db
    .insert(users)
    .values({
      name: "Super Admin",
      email: "admin@dreamdocs.ru",
      passwordHash: await hashPassword("admin123"),
      role: "superadmin",
      status: "active",
    })
    .onDuplicateKeyUpdate({
      set: { updatedAt: new Date() },
    });

  const superadminId = superadmin?.insertId ?? 1;
  console.log("Superadmin created:", superadminId);

  // Create certificate template
  const [template] = await db.insert(certificateTemplates).values({
    name: "Default Template",
    description: "Standard certificate template",
    s3Key: "templates/default.pdf",
    fieldsJson: JSON.stringify({
      name: { x: 200, y: 300, fontSize: 24 },
      program: { x: 200, y: 350, fontSize: 18 },
      date: { x: 200, y: 400, fontSize: 14 },
      score: { x: 200, y: 450, fontSize: 14 },
      number: { x: 200, y: 500, fontSize: 12 },
      qr: { x: 500, y: 300, size: 100 },
    }),
    isDefault: true,
    createdBy: superadminId,
  });

  const templateId = template?.insertId ?? 1;

  // Create sample program
  const [program] = await db.insert(programs).values({
    slug: "dreamdocs-basics",
    code: "DDB",
    title: "Основы DreamDocs",
    description: "Базовый курс по работе с DreamDocs",
    targetAudience: "all",
    hasCertification: true,
    certificateTemplateId: templateId,
    createdBy: superadminId,
  });

  const programId = program?.insertId ?? 1;

  // Create program version
  const [programVersion] = await db.insert(programVersions).values({
    programId,
    versionNumber: 1,
    status: "published",
    publishedAt: new Date(),
    createdBy: superadminId,
  });

  const programVersionId = programVersion?.insertId ?? 1;

  // Create course
  const [course] = await db.insert(courses).values({
    programVersionId,
    sortOrder: 1,
    slug: "getting-started",
    title: "Начало работы",
    description: "Введение в платформу DreamDocs",
    targetRole: "all",
    isMandatory: true,
  });

  const courseId = course?.insertId ?? 1;

  // Create course version
  const [courseVersion] = await db.insert(courseVersions).values({
    courseId,
    versionNumber: 1,
    status: "published",
    publishedAt: new Date(),
  });

  const courseVersionId = courseVersion?.insertId ?? 1;

  // Create modules
  const [module1] = await db.insert(modules).values({
    courseVersionId,
    sortOrder: 1,
    title: "Введение",
    description: "Обзор платформы",
    moduleType: "common",
    isMandatory: true,
  });

  const [module2] = await db.insert(modules).values({
    courseVersionId,
    sortOrder: 2,
    title: "Основные функции",
    description: "Работа с документами",
    moduleType: "common",
    isMandatory: true,
  });

  const module1Id = module1?.insertId ?? 1;
  const module2Id = module2?.insertId ?? 2;

  // Create module versions
  const [moduleVersion1] = await db.insert(moduleVersions).values({
    moduleId: module1Id,
    versionNumber: 1,
    status: "published",
    publishedAt: new Date(),
  });

  const [moduleVersion2] = await db.insert(moduleVersions).values({
    moduleId: module2Id,
    versionNumber: 1,
    status: "published",
    publishedAt: new Date(),
  });

  const moduleVersion1Id = moduleVersion1?.insertId ?? 1;
  const moduleVersion2Id = moduleVersion2?.insertId ?? 2;

  // Create module contents
  await db.insert(moduleContents).values({
    moduleVersionId: moduleVersion1Id,
    contentType: "html_zip",
    s3Key: "content/modules/1/index.html",
  });

  await db.insert(moduleContents).values({
    moduleVersionId: moduleVersion2Id,
    contentType: "rutube",
    rutubeVideoId: "abc123",
    rutubeUrl: "https://rutube.ru/video/abc123/",
  });

  // Create assessment
  const [assessment] = await db.insert(assessments).values({
    courseVersionId,
    assessmentType: "final",
    title: "Итоговый тест",
    description: "Проверка знаний по курсу",
    passingScore: 80,
    maxAttempts: 2,
    timeLimitMinutes: 30,
    showCorrectAnswers: true,
    allowRetake: false,
  });

  const assessmentId = assessment?.insertId ?? 1;

  // Create assessment version
  const [assessmentVersion] = await db.insert(assessmentVersions).values({
    assessmentId,
    versionNumber: 1,
    status: "published",
    publishedAt: new Date(),
  });

  const assessmentVersionId = assessmentVersion?.insertId ?? 1;

  // Create questions
  const [q1] = await db.insert(questions).values({
    assessmentVersionId,
    sortOrder: 1,
    questionText: "Что такое DreamDocs?",
    questionType: "single",
    explanation: "DreamDocs — это платформа для работы с документами",
    points: 1,
  });

  const [q2] = await db.insert(questions).values({
    assessmentVersionId,
    sortOrder: 2,
    questionText: "Какие функции доступны в DreamDocs?",
    questionType: "multiple",
    explanation: "Все перечисленные функции доступны",
    points: 2,
  });

  const q1Id = q1?.insertId ?? 1;
  const q2Id = q2?.insertId ?? 2;

  // Create answer options
  await db.insert(answerOptions).values([
    {
      questionId: q1Id,
      sortOrder: 1,
      optionText: "Платформа для работы с документами",
      isCorrect: true,
    },
    {
      questionId: q1Id,
      sortOrder: 2,
      optionText: "Социальная сеть",
      isCorrect: false,
    },
    {
      questionId: q1Id,
      sortOrder: 3,
      optionText: "Игровой движок",
      isCorrect: false,
    },
    {
      questionId: q2Id,
      sortOrder: 1,
      optionText: "Создание документов",
      isCorrect: true,
    },
    {
      questionId: q2Id,
      sortOrder: 2,
      optionText: "Совместное редактирование",
      isCorrect: true,
    },
    {
      questionId: q2Id,
      sortOrder: 3,
      optionText: "Видеозвонки",
      isCorrect: false,
    },
  ]);

  console.log("Seed completed successfully!");
  await conn.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
