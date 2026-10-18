import { Browser, BrowserContext, Page, chromium } from 'playwright';

export interface TestbedFixtureOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
}

export async function createBrowserFixture(options: TestbedFixtureOptions = {}) {
  const { headless = true, viewport = { width: 1280, height: 720 } } = options;

  let browser: Browser;
  try {
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch {
    browser = await chromium.launch({
      channel: 'msedge',
      headless,
    });
  }

  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  return {
    browser,
    context,
    page,
    cleanup: async () => {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}
