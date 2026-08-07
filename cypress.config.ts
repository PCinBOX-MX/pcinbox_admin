import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3001",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 120000,
    numTestsKeptInMemory: 0,
    experimentalMemoryManagement: true,
    setupNodeEvents(on, config) {
      on("task", {
        log(message) {
          console.log(JSON.stringify(message, null, 2));
          return null;
        },
      });
      return config;
    },
  },
});
