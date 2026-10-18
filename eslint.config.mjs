import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Next 16 no longer ships `next lint`, and eslint-config-next pulls in packages that fail
// `npm audit`, so this wires eslint directly (npm run lint, and CI).
export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'public/**', '**/*.tsbuildinfo'] },
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
