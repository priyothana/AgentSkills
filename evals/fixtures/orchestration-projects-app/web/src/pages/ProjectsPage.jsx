import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

export function ProjectsPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api('/projects', { signal: controller.signal })
      .then(setProjects)
      .catch((err) => { if (err.name !== 'AbortError') setError(err); });
    return () => controller.abort();
  }, []);

  if (error) return <p role="alert">{t('projects.loadFailed')}</p>;

  return (
    <main>
      <h1>{t('projects.title')}</h1>
      <ul>
        {projects.map((p) => (
          <li key={p.id}><Link to={`/projects/${p.id}`}>{p.name}</Link></li>
        ))}
      </ul>
    </main>
  );
}
