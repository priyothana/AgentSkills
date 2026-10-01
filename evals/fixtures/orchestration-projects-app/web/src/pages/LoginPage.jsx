import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { t } = useTranslation();
  return (
    <main>
      <h1>{t('login.title')}</h1>
      <a href="/auth/start">{t('login.continue')}</a>
    </main>
  );
}
