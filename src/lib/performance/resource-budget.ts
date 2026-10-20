import type {
  ResourceBudgetConfig,
  ResourceBudgetViolation,
  PerformanceBudgetReport,
  ResourceCategoryBreakdown,
} from '../types/performance.ts';

export const DEFAULT_RESOURCE_BUDGETS: Required<ResourceBudgetConfig> = {
  maxTotalSizeBytes: 2 * 1024 * 1024,   // 2MB total transfer size
  maxJsSizeBytes: 500 * 1024,           // 500KB JS bundle budget
  maxCssSizeBytes: 150 * 1024,          // 150KB CSS budget
  maxImageSizeBytes: 1024 * 1024,       // 1MB Image budget
  maxTotalRequests: 60,                 // 60 requests
  maxDomNodes: 1500,                    // 1,500 DOM elements
  maxDomDepth: 32,                      // 32 levels of nesting
};

export interface RawNetworkResource {
  name: string;
  initiatorType: string;
  transferSize: number;
  decodedBodySize: number;
}

/**
 * Classifies an initiator type or URL extension into a standard resource category.
 */
export function classifyResourceType(
  initiatorType: string,
  url: string = ''
): ResourceCategoryBreakdown['category'] {
  const type = initiatorType.toLowerCase();
  const lowerUrl = url.toLowerCase();

  if (type === 'navigation' || lowerUrl.endsWith('.html') || lowerUrl.endsWith('.htm')) {
    return 'document';
  }
  if (type === 'script' || lowerUrl.endsWith('.js') || lowerUrl.endsWith('.mjs')) {
    return 'script';
  }
  if (type === 'css' || type === 'link' || lowerUrl.endsWith('.css')) {
    return 'stylesheet';
  }
  if (
    type === 'img' ||
    type === 'image' ||
    /\.(png|jpe?g|gif|webp|svg|ico|avif)$/.test(lowerUrl)
  ) {
    return 'image';
  }
  if (type === 'font' || /\.(woff2?|ttf|otf|eot)$/.test(lowerUrl)) {
    return 'font';
  }
  if (type === 'fetch' || type === 'xmlhttprequest') {
    return 'fetch';
  }
  return 'other';
}

/**
 * Summarizes network resources by category.
 */
export function aggregateResourceCategories(
  resources: RawNetworkResource[]
): ResourceCategoryBreakdown[] {
  const categoryMap = new Map<
    ResourceCategoryBreakdown['category'],
    { count: number; transferSizeBytes: number; decodedSizeBytes: number }
  >();

  const standardCategories: ResourceCategoryBreakdown['category'][] = [
    'document',
    'script',
    'stylesheet',
    'image',
    'font',
    'fetch',
    'other',
  ];

  for (const cat of standardCategories) {
    categoryMap.set(cat, { count: 0, transferSizeBytes: 0, decodedSizeBytes: 0 });
  }

  for (const res of resources) {
    const cat = classifyResourceType(res.initiatorType, res.name);
    const existing = categoryMap.get(cat)!;
    existing.count++;
    existing.transferSizeBytes += Math.max(0, res.transferSize || 0);
    existing.decodedSizeBytes += Math.max(0, res.decodedBodySize || 0);
  }

  return standardCategories.map((category) => {
    const data = categoryMap.get(category)!;
    return {
      category,
      count: data.count,
      transferSizeBytes: data.transferSizeBytes,
      decodedSizeBytes: data.decodedSizeBytes,
    };
  });
}

/**
 * Evaluates observed page resource metrics against defined performance budgets.
 */
export function evaluateResourceBudgets(
  metrics: {
    resources: RawNetworkResource[];
    domNodeCount: number;
    maxDomDepth: number;
  },
  customBudget: ResourceBudgetConfig = {}
): PerformanceBudgetReport {
  const budget: Required<ResourceBudgetConfig> = {
    ...DEFAULT_RESOURCE_BUDGETS,
    ...customBudget,
  };

  const categories = aggregateResourceCategories(metrics.resources);
  const violations: ResourceBudgetViolation[] = [];

  const totalSizeBytes = categories.reduce((sum, c) => sum + c.transferSizeBytes, 0);
  const totalRequests = metrics.resources.length;

  // 1. Total Transfer Size Budget
  if (totalSizeBytes > budget.maxTotalSizeBytes) {
    violations.push({
      metric: 'total_transfer_size',
      budgetLimit: budget.maxTotalSizeBytes,
      actualValue: totalSizeBytes,
      unit: 'bytes',
      severity: totalSizeBytes > budget.maxTotalSizeBytes * 1.5 ? 'error' : 'warning',
      message: `Total transfer size (${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB) exceeds budget of ${(budget.maxTotalSizeBytes / 1024 / 1024).toFixed(2)} MB.`,
    });
  }

  // 2. JavaScript Size Budget
  const jsCategory = categories.find((c) => c.category === 'script');
  const jsSizeBytes = jsCategory ? jsCategory.transferSizeBytes : 0;
  if (jsSizeBytes > budget.maxJsSizeBytes) {
    violations.push({
      metric: 'javascript_size',
      budgetLimit: budget.maxJsSizeBytes,
      actualValue: jsSizeBytes,
      unit: 'bytes',
      severity: jsSizeBytes > budget.maxJsSizeBytes * 1.3 ? 'error' : 'warning',
      message: `JavaScript transfer size (${(jsSizeBytes / 1024).toFixed(1)} KB) exceeds budget of ${(budget.maxJsSizeBytes / 1024).toFixed(1)} KB.`,
    });
  }

  // 3. CSS Size Budget
  const cssCategory = categories.find((c) => c.category === 'stylesheet');
  const cssSizeBytes = cssCategory ? cssCategory.transferSizeBytes : 0;
  if (cssSizeBytes > budget.maxCssSizeBytes) {
    violations.push({
      metric: 'css_size',
      budgetLimit: budget.maxCssSizeBytes,
      actualValue: cssSizeBytes,
      unit: 'bytes',
      severity: 'warning',
      message: `CSS transfer size (${(cssSizeBytes / 1024).toFixed(1)} KB) exceeds budget of ${(budget.maxCssSizeBytes / 1024).toFixed(1)} KB.`,
    });
  }

  // 4. Image Size Budget
  const imageCategory = categories.find((c) => c.category === 'image');
  const imageSizeBytes = imageCategory ? imageCategory.transferSizeBytes : 0;
  if (imageSizeBytes > budget.maxImageSizeBytes) {
    violations.push({
      metric: 'image_size',
      budgetLimit: budget.maxImageSizeBytes,
      actualValue: imageSizeBytes,
      unit: 'bytes',
      severity: 'warning',
      message: `Images transfer size (${(imageSizeBytes / 1024 / 1024).toFixed(2)} MB) exceeds budget of ${(budget.maxImageSizeBytes / 1024 / 1024).toFixed(2)} MB.`,
    });
  }

  // 5. Total Request Count
  if (totalRequests > budget.maxTotalRequests) {
    violations.push({
      metric: 'request_count',
      budgetLimit: budget.maxTotalRequests,
      actualValue: totalRequests,
      unit: 'count',
      severity: totalRequests > budget.maxTotalRequests * 1.5 ? 'error' : 'warning',
      message: `Page makes ${totalRequests} HTTP requests, exceeding the budget limit of ${budget.maxTotalRequests}.`,
    });
  }

  // 6. DOM Node Count
  if (metrics.domNodeCount > budget.maxDomNodes) {
    violations.push({
      metric: 'dom_nodes',
      budgetLimit: budget.maxDomNodes,
      actualValue: metrics.domNodeCount,
      unit: 'count',
      severity: metrics.domNodeCount > budget.maxDomNodes * 1.5 ? 'error' : 'warning',
      message: `Page contains ${metrics.domNodeCount} DOM elements, exceeding the budget limit of ${budget.maxDomNodes}.`,
    });
  }

  // 7. Max DOM Depth
  if (metrics.maxDomDepth > budget.maxDomDepth) {
    violations.push({
      metric: 'dom_depth',
      budgetLimit: budget.maxDomDepth,
      actualValue: metrics.maxDomDepth,
      unit: 'count',
      severity: 'warning',
      message: `Maximum DOM nesting depth is ${metrics.maxDomDepth}, exceeding recommended limit of ${budget.maxDomDepth}.`,
    });
  }

  const hasErrors = violations.some((v) => v.severity === 'error');

  return {
    passed: violations.length === 0 || !hasErrors,
    violations,
    totalSizeBytes,
    totalRequests,
    domNodeCount: metrics.domNodeCount,
    maxDomDepth: metrics.maxDomDepth,
    categories,
  };
}
