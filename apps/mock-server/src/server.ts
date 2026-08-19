import { createApp } from './app';
import { mockEnv } from './config/env';
import { assertFixtureIntegrity, loadFixtures } from './services/fixture.service';
import { logError, logInfo } from './utils/logger';

function bootstrap(): void {
  try {
    const fixtures = loadFixtures();
    assertFixtureIntegrity(fixtures);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown fixture error';
    logError(message);
    process.exit(1);
  }

  const app = createApp();
  app.listen(mockEnv.MOCK_PORT, mockEnv.MOCK_HOST, () => {
    logInfo(`Mock API Server listening on http://${mockEnv.MOCK_HOST}:${mockEnv.MOCK_PORT}`);
    logInfo(`Health check: http://127.0.0.1:${mockEnv.MOCK_PORT}${mockEnv.API_PREFIX}/health`);
    logInfo(`Static assets: http://127.0.0.1:${mockEnv.MOCK_PORT}/mock-assets/`);
  });
}

bootstrap();
