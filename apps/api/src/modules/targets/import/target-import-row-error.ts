export class TargetImportRowError extends Error {
  constructor(
    public readonly row: number,
    public readonly field: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'TargetImportRowError';
  }
}