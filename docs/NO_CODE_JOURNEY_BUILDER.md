# PROOFix No-Code User Journey Builder

The **No-Code User Journey Builder** enables product managers, QA analysts, and non-programmers to construct, edit, and execute end-to-end browser verification flows visually—**without writing a single line of Playwright code**.

---

## 1. Quick Start: Creating Your First Journey

1. Open your project dashboard in PROOFix and navigate to the **User Journeys** tab.
2. Click **New Journey** or choose one of the pre-built templates (e.g. *User Sign In Flow* or *E-Commerce Product Checkout Flow*).
3. The visual workspace opens with an ordered sequence of step cards.
4. Click **Add Step** (Nav, Click, Fill, Assert, Wait, or Shot) to append actions to the journey.
5. In the right-hand **Step Configuration Inspector**, select your element target using accessible labels or button roles.
6. Click **Run Journey** to execute the test and watch live per-step execution status!

---

## 2. Supported Action Types

Every action maps directly to a strictly validated Playwright operation under the hood:

| Category | Action | Visual Configuration | Safe Playwright Mapping |
| :--- | :--- | :--- | :--- |
| **Navigation** | `navigate` | Target URL (e.g. `/store`, `/login`) | `await page.goto(url)` |
| **Interaction** | `click` | Accessible Role & Name (`button`, `link`, etc.) | `await page.getByRole(role, { name }).click()` |
| **Interaction** | `fill` | Form Field Label or Placeholder + Value | `await page.getByLabel(label).fill(value)` |
| **Interaction** | `select_option` | Dropdown locator + Option value | `await page.locator(sel).selectOption(val)` |
| **Interaction** | `hover` | Target Element locator | `await page.locator(sel).hover()` |
| **Interaction** | `press_key` | Keyboard key (e.g. `Enter`, `Tab`, `Escape`) | `await page.keyboard.press(key)` |
| **Assertion** | `assert_visible` | Target Element | `expect(locator).toBeVisible()` |
| **Assertion** | `assert_text` | Expected text string + Match mode (`exact`, `contains`) | `expect(locator).toHaveText(expected)` |
| **Assertion** | `assert_url` | Expected URL substring or path | `expect(page).toHaveURL(expected)` |
| **Assertion** | `assert_form_value` | Expected input value | `expect(locator).toHaveValue(expected)` |
| **Observability** | `wait_for_timeout` | Bounded duration in ms ($\le 30,000\text{ms}$) | Bounded sleep guard |
| **Observability** | `take_screenshot` | Custom screenshot label | Attached snapshot indexed per step |

---

## 3. Accessible Selector Recommendations

PROOFix emphasizes accessible, user-centric locators over fragile CSS paths:

1. **Role & Accessible Name (Best Practice)**: Matches what screen readers and assistive technology perceive. For example: `Role: "button"`, `Name: "Sign In"`.
2. **Form Field Label**: Matches `<label for="...">` or wrapping labels. Example: `"Email Address"`.
3. **Placeholder**: Matches input placeholder attributes. Example: `"Enter your password"`.
4. **Test ID**: Matches `data-testid="..."` attributes for testability.
5. **CSS Selector**: Supported for complex custom DOM elements with strict sanitization.

---

## 4. Security & Safety Model

- **Zero Arbitrary Code Execution**: No `eval()`, `new Function()`, or shell commands are permitted.
- **Protocol Guard**: Navigation to dangerous schemes (`javascript:`, `file:`, `data:`, `blob:`) is strictly prohibited.
- **Allowed Hosts Whitelist**: Journeys cannot navigate to arbitrary external phishing domains.
- **Execution Limits**: All waits are strictly capped at $30,000\text{ms}$ ($30\text{s}$) to prevent infinite execution loops. Total journey duration is bounded by a configurable timeout (default $60\text{s}$).
- **Access Control & Multi-Tenancy**: Saved journeys are isolated by user ownership. Unauthorized users cannot inspect, rename, duplicate, or delete journeys belonging to another user.

---

## 5. Failure Isolation & Troubleshooting

When a journey encounters a failure:
1. **Per-Step Results**: The failing step is highlighted in red with explicit **Expected** vs. **Observed** context.
2. **Visibility After Failure**: Completed earlier steps remain recorded as **Passed**, while subsequent steps receive the explicit status **Skipped**.
3. **Failure Screenshots**: If configured, high-resolution browser snapshots are automatically captured at the exact moment of failure.
4. **Optional Steps**: Individual steps can be marked as `optional: true`, allowing the journey to continue even if non-critical elements (e.g. promo banners) fail.
