import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function findControllerFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return findControllerFiles(fullPath);
    }

    return entry.endsWith('.controller.ts') ? [fullPath] : [];
  });
}

describe('module controller RBAC coverage', () => {
  it('requires explicit role metadata on every non-empty module controller', () => {
    const modulesDir = join(__dirname, '..', 'modules');
    const controllersWithoutRoles = findControllerFiles(modulesDir)
      .filter((filePath) => readFileSync(filePath, 'utf8').trim().length > 0)
      .filter((filePath) => !readFileSync(filePath, 'utf8').includes('@Roles('))
      .map((filePath) => filePath.replace(`${join(__dirname, '..')}/`, ''));

    expect(controllersWithoutRoles).toEqual([]);
  });
});
