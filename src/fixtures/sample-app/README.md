# PROOFix Sample Verification Fixture

This fixture is designed for automated verification benchmarking with known deterministic test results:

1. **Home Page (`/`)**: Healthy route, loads 200 OK, interactive counter UI.
2. **About Page (`/about`)**: Healthy secondary route with valid navigation links.
3. **Broken Route Link (`/broken-route`)**: Intentionally dead link that responds with HTTP 404 Not Found.
4. **Backend API (`/api/data`)**: Intentionally fails with HTTP 500 (simulating an unhandled database connection timeout).
5. **Runtime Error Page (`/runtime-error`)**: Throws an unhandled client-side JavaScript TypeError when clicked.
