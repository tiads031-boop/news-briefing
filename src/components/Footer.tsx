import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="disclaimers">
        <p>{t('footer.disclaimer1')}</p>
        <p>{t('footer.disclaimer2')}</p>
      </div>
    </footer>
  );
}
