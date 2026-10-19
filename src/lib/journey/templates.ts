import { UserJourney } from '../types/journey';

export interface JourneyTemplate {
  id: string;
  name: string;
  category: 'authentication' | 'ecommerce' | 'search' | 'forms';
  description: string;
  journey: Omit<UserJourney, 'id' | 'projectId' | 'ownerId' | 'createdAt' | 'updatedAt'>;
}

export const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  {
    id: 'template_auth_login',
    name: 'User Sign In & Session Verification',
    category: 'authentication',
    description: 'Fills user login credentials, submits the authentication form, and verifies dashboard access.',
    journey: {
      title: 'User Sign In Flow',
      description: 'Automated verification of sign in form validation and dashboard landing.',
      schemaVersion: '1.0.0',
      config: {
        baseUrl: 'http://localhost:4173',
        defaultTimeoutMs: 10000,
        stopOnFailure: true,
      },
      steps: [
        {
          id: 'tpl_s1',
          order: 1,
          title: 'Navigate to Login Page',
          action: 'navigate',
          params: { url: '/login' },
        },
        {
          id: 'tpl_s2',
          order: 2,
          title: 'Enter Email Address',
          action: 'fill',
          target: { type: 'label', value: 'Email Address' },
          params: { value: 'user@example.com' },
        },
        {
          id: 'tpl_s3',
          order: 3,
          title: 'Enter Account Password',
          action: 'fill',
          target: { type: 'placeholder', value: 'Password' },
          params: { value: 'securePass123!' },
        },
        {
          id: 'tpl_s4',
          order: 4,
          title: 'Click Sign In Button',
          action: 'click',
          target: { type: 'role_name', role: 'button', name: 'Sign In', value: 'Sign In' },
        },
        {
          id: 'tpl_s5',
          order: 5,
          title: 'Verify Dashboard Heading',
          action: 'assert_text',
          target: { type: 'css', value: 'h1.dashboard-title' },
          params: { expectedText: 'Welcome to Your Dashboard', matchMode: 'contains' },
        },
      ],
      tags: ['auth', 'smoke'],
    },
  },
  {
    id: 'template_ecommerce_checkout',
    name: 'Product Catalog & Add to Cart Flow',
    category: 'ecommerce',
    description: 'Navigates store catalog, selects a product, adds it to the cart, and verifies cart count.',
    journey: {
      title: 'E-Commerce Product Checkout Flow',
      description: 'End-to-end verification of catalog browsing, cart addition, and checkout drawer.',
      schemaVersion: '1.0.0',
      config: {
        baseUrl: 'http://localhost:4173',
        defaultTimeoutMs: 12000,
        stopOnFailure: true,
      },
      steps: [
        {
          id: 'tpl_c1',
          order: 1,
          title: 'Open Product Store',
          action: 'navigate',
          params: { url: '/store' },
        },
        {
          id: 'tpl_c2',
          order: 2,
          title: 'Click Featured Product Item',
          action: 'click',
          target: { type: 'css', value: '.product-card:first-child' },
        },
        {
          id: 'tpl_c3',
          order: 3,
          title: 'Click Add to Cart',
          action: 'click',
          target: { type: 'role_name', role: 'button', name: 'Add to Cart', value: 'Add to Cart' },
        },
        {
          id: 'tpl_c4',
          order: 4,
          title: 'Capture Cart Confirmation Snapshot',
          action: 'take_screenshot',
          params: { screenshotName: 'cart_added_state' },
        },
      ],
      tags: ['ecommerce', 'cart', 'checkout'],
    },
  },
];

/**
 * Creates a concrete UserJourney instance from a pre-built template.
 */
export function createJourneyFromTemplate(
  templateId: string,
  projectId: string,
  ownerId: string,
  customTitle?: string
): UserJourney {
  const tpl = JOURNEY_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) {
    throw new Error(`Template "${templateId}" not found.`);
  }

  const now = new Date().toISOString();
  return {
    ...JSON.parse(JSON.stringify(tpl.journey)),
    id: `jny_tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    projectId,
    ownerId,
    title: customTitle || tpl.journey.title,
    createdAt: now,
    updatedAt: now,
  };
}
