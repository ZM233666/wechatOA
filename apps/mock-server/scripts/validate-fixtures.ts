import { assertFixtureIntegrity, loadFixtures } from '../src/services/fixture.service';

function main(): void {
  const fixtures = loadFixtures();
  assertFixtureIntegrity(fixtures);
  console.log('All mock fixtures validated successfully.');
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown validation error';
  console.error(message);
  process.exit(1);
}
