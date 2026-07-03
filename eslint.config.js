import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';

export default tseslint.config(
  globalIgnores(['dist', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message: '禁止硬编码色值，使用语义 token（bg/surface/text/pri…）',
        },
        {
          selector: "Literal[value=/rounded-\\[/]",
          message: '禁止任意圆角值，使用 rounded-sm/md/lg/xl（乘法 token）',
        },
        {
          selector: "Literal[value=/shadow-\\[/]",
          message: '禁止任意阴影值，使用 shadow-popover/modal/drawer/tooltip/card/lift 等语义 token',
        },
      ],
    },
  },
  {
    // 文件式路由约定：路由文件导出 Route（createFileRoute 结果）+ 一个仅供 component 使用的本地页面组件。
    // react-refresh 启发式对这种"定义组件却只导出 Route"的形态误报，而 TanStack Router 自带路由级 HMR，
    // 故对 routes/ 关闭该规则（其余目录仍全量守护）。
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // shadcn 生成的 UI 基元（button 导出 buttonVariants、sheet 导出 SheetContent 等）：
    // 组件 + variants/常量同文件导出是官方约定，且这些文件不手改，豁免 react-refresh 单导出约束。
    files: ['src/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);
