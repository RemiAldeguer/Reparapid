import React from 'react';
import {PageHeader} from './pages';
import {PublicRepairPackageSettingsPanel} from './public-repair-package-settings';

export function RepairPackages() {
  return <div className="repair-package-page">
    <PageHeader eyebrow="VOTRE GRILLE TARIFAIRE" title="Les forfaits de réparation" description="Gérez les interventions et les prix TTC proposés aux clients sur le site."/>
    <PublicRepairPackageSettingsPanel/>
  </div>;
}
