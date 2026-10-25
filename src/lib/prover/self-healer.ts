export class MultiIterationSelfHealer {
  public static synthesizeRefinementPrompt(
    originalError: string,
    regressionFailure: string,
    iteration: number
  ): string {
    return [
      `[SELF-HEALING LOOP: ITERATION ${iteration}]`,
      `Original Goal: Resolve ${originalError}`,
      `Secondary Regression Detected in Shadow Sandbox: ${regressionFailure}`,
      `Instructions: Adjust patch to resolve the original defect WITHOUT causing the secondary regression.`
    ].join('\n');
  }
}
