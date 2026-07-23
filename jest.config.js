module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // .claude/worktrees guarda copias de trabajo del repo: sus tests son
  // duplicados de otra rama y no deben correr junto a los del árbol actual.
  testPathIgnorePatterns: ['/node_modules/', '/.claude/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};