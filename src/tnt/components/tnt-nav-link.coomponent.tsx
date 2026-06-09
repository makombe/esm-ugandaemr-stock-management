import { navigate, UserHasAccess } from '@openmrs/esm-framework';
import React from 'react';
import styles from './nav-link.scss';
import { WorkflowAutomation } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
const openmrsSpaBase = window['getOpenmrsSpaBase']();

type TnTNavLinkProps = {
  hideOverlay: (state: boolean) => void;
};
const TnTNavLink: React.FC<TnTNavLinkProps> = ({ hideOverlay }) => {
  const url = `${openmrsSpaBase}tnt`;
  const { t } = useTranslation();
  const title = t('tnt', 'TnT');

  const handleClick = (url: string) => {
    hideOverlay(false);
    navigate({ to: url });
  };

  return (
    <UserHasAccess privilege={'o3: View TnT Dashboard'}>
      <button type="button" onClick={() => handleClick(url)} className={styles.navLinkItem}>
        <WorkflowAutomation size={24} />
        <span>{title}</span>
      </button>
    </UserHasAccess>
  );
};

export default TnTNavLink;
