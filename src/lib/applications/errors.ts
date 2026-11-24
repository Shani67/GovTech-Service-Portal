export class NotFoundError extends Error {
  constructor(message = "Application not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Someone else changed the application after it was loaded (optimistic locking). */
export class ConflictError extends Error {
  constructor(message = "The application was changed by someone else. Reload and try again.") {
    super(message);
    this.name = "ConflictError";
  }
}

export class ForbiddenTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenTransitionError";
  }
}

export class IncompleteApplicationError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super("The application is not complete");
    this.name = "IncompleteApplicationError";
  }
}
