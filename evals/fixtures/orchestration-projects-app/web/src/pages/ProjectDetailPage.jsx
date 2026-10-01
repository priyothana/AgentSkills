import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

export function ProjectDetailPage() {
  const { t, i18n } = useTranslation();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setProject(null);
    api(`/projects/${projectId}`, { signal: controller.signal })
      .then(setProject)
      .catch((err) => { if (err.name !== 'AbortError') setError(err); });
    return () => controller.abort();
  }, [projectId]);

  if (error) return <p role="alert">{t('project.loadFailed')}</p>;
  if (!project) return <p>{t('common.loading')}</p>;

  return (
    <main>
      <h1>{project.name}</h1>
      <p>
        {t('project.createdOn', {
          date: new Intl.DateTimeFormat(i18n.language).format(new Date(project.created_at)),
        })}
      </p>
    </main>
  );
}
