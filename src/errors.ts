/**
 * Custom error classes for better error handling
 */

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailAlreadyExistsError";
  }
}
