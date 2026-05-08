import { TRPCError } from "@trpc/server";
import { ERROR_MESSAGES } from "./constants";

export function getErrorMessage(code: TRPCError["code"]): string {
  switch (code) {
    case "UNAUTHORIZED":
      return ERROR_MESSAGES.UNAUTHORIZED;
    case "FORBIDDEN":
      return ERROR_MESSAGES.FORBIDDEN;
    case "NOT_FOUND":
      return ERROR_MESSAGES.NOT_FOUND;
    case "CONFLICT":
      return ERROR_MESSAGES.CONFLICT;
    case "BAD_REQUEST":
      return ERROR_MESSAGES.BAD_REQUEST;
    case "INTERNAL_SERVER_ERROR":
      return ERROR_MESSAGES.INTERNAL_ERROR;
    case "PARSE_ERROR":
      return "Ошибка разбора запроса";
    case "TIMEOUT":
      return "Превышено время ожидания";
    default:
      return ERROR_MESSAGES.INTERNAL_ERROR;
  }
}

export function createTrpcError(
  code: TRPCError["code"],
  message?: string,
  cause?: unknown
): TRPCError {
  return new TRPCError({
    code,
    message: message ?? getErrorMessage(code),
    cause,
  });
}
