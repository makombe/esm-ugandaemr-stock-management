import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useLeftNav } from '@openmrs/esm-framework';
import TrackAndTrace from './track-and-trace.component';

const TnTRoot = () => {
  const spaBasePath = globalThis.spaBase;
  const tntBasename = globalThis.getOpenmrsSpaBase() + 'tnt';
  useLeftNav({
    name: 'tnt-left-panel-slot',
    basePath: spaBasePath,
  });
  return (
    <BrowserRouter basename={tntBasename}>
      <main>
        <Routes>
          <Route path="/" element={<TrackAndTrace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default TnTRoot;
