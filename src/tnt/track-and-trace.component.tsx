import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layer } from '@carbon/react';
import Header from './components/header.component';
import TntTable from './components/tnt-table.component';
import styles from './track-and-trace.scss';

const TrackAndTrace = () => {
  const { t } = useTranslation();

  return (
    <main className="omrs-main">
      <Header title={t('trackAndTrace', 'Track and Trace')} />
      <Layer className={styles.tntContent}>
        <TntTable />
      </Layer>
    </main>
  );
};

export default TrackAndTrace;
