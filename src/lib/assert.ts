import { ValidationError, NotFoundError } from '@/lib/errors'

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ValidationError(message)
}

export function assertExists<T>(value: T | null | undefined, message: string): asserts value is NonNullable<T> {
  if (value == null) throw new NotFoundError(message)
}
