export const AUTH_COOKIE = "dreamdocs_auth";
export const AUTH_STORAGE_KEY = "dreamdocs_auth";
export const OWNER_UNION_ID = process.env.OWNER_UNION_ID ?? "owner";

export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Требуется авторизация",
  FORBIDDEN: "Доступ запрещен",
  NOT_FOUND: "Не найдено",
  CONFLICT: "Конфликт данных",
  BAD_REQUEST: "Некорректный запрос",
  INTERNAL_ERROR: "Внутренняя ошибка сервера",
  INVALID_CREDENTIALS: "Неверный email или пароль",
  USER_BLOCKED: "Пользователь заблокирован",
  INVITATION_EXPIRED: "Приглашение истекло или недействительно",
  INVITATION_USED: "Приглашение уже использовано",
  PROGRAM_NOT_PUBLISHED: "Программа не опубликована",
  MODULE_LOCKED: "Модуль заблокирован. Сначала завершите обязательные модули",
  ASSESSMENT_NOT_PASSED: "Тест не пройден",
  MAX_ATTEMPTS_REACHED: "Достигнуто максимальное количество попыток",
  CERTIFICATE_ALREADY_ISSUED: "Сертификат уже выдан",
  CERTIFICATE_REQUIREMENTS_NOT_MET: "Не выполнены требования для получения сертификата",
  INVALID_FILE_TYPE: "Недопустимый тип файла",
  FILE_TOO_LARGE: "Файл слишком большой",
  ZIP_INVALID: "Некорректный ZIP-архив",
  ZIP_BOMB_DETECTED: "Обнаружен потенциально опасный архив",
  PATH_TRAVERSAL_DETECTED: "Обнаружена попытка path traversal",
} as const;

export const ROLES = [
  "user",
  "employee",
  "partner",
  "integrator",
  "admin",
  "superadmin",
] as const;

export const USER_STATUSES = ["active", "blocked", "pending"] as const;

export const VERSION_STATUSES = ["draft", "published", "archived"] as const;

export const CONTENT_TYPES = ["html_zip", "pdf", "rutube"] as const;

export const ASSESSMENT_TYPES = ["mini_test", "final", "certification"] as const;

export const QUESTION_TYPES = ["single", "multiple", "text"] as const;

export const NOTIFICATION_TYPES = [
  "program_assigned",
  "module_completed",
  "assessment_reminder",
  "certificate_issued",
  "invitation_received",
  "system",
] as const;

export const PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;

export const SETTINGS_CATEGORIES = [
  "general",
  "security",
  "email",
  "appearance",
] as const;

export const TARGET_AUDIENCES = [
  "all",
  "employee",
  "partner",
  "integrator",
] as const;

export const MODULE_TYPES = [
  "common",
  "employee",
  "partner",
  "integrator",
] as const;

export const UPLOAD_LIMITS = {
  HTML: 5 * 1024 * 1024, // 5MB
  PDF: 10 * 1024 * 1024, // 10MB
  ZIP: 50 * 1024 * 1024, // 50MB
  IMAGE: 5 * 1024 * 1024, // 5MB
  CSS: 1 * 1024 * 1024, // 1MB
} as const;

export const UPLOAD_WHITELIST = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/html",
  "text/css",
  "application/zip",
  "application/x-zip-compressed",
] as const;

export const JWT_EXPIRY_DAYS = 7;
