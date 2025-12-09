import { render, type RenderOptions } from '@testing-library/react';
import { LanguageProvider } from '../i18n';
import type { ReactNode } from 'react';

function TestProviders({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: TestProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
