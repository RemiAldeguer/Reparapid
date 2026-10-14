import {money, type PublishedRepairPackage} from './domain';

export const repairPackagePrice = (item: PublishedRepairPackage) => `${item.priceMode === 'from' ? 'À partir de ' : ''}${money(item.amount)} TTC`;

export function RepairPackageOffers({packages}: {packages: PublishedRepairPackage[]}) {
  if (!packages.length) return null;
  return <section className="ri-package-offers" aria-labelledby="ri-packages-title">
    <span className="rp-eyebrow">SI CETTE INTERVENTION EST CONFIRMÉE</span>
    <h3 id="ri-packages-title">Les forfaits correspondant à vos symptômes.</h3>
    <div className="ri-package-grid">{packages.map(item => <article className="ri-package-card" key={item.id}>
      <span className="ri-package-fault">{item.fault}</span>
      <div><h4>{item.label}</h4><strong>{repairPackagePrice(item)}</strong></div>
      <p>{item.includes}</p>
    </article>)}</div>
    <p className="ri-package-note">L’atelier confirme l’intervention et le montant après diagnostic. Si plusieurs pannes sont signalées, le montant global est établi par l’atelier.</p>
  </section>;
}

export function RepairPackageSummary({packages, faultCount}: {packages: PublishedRepairPackage[]; faultCount: number}) {
  const single = packages.length === 1 && faultCount === 1 ? packages[0] : null;
  return <div className="ri-summary-price">
    <span>{single ? 'Forfait si cette intervention est confirmée' : 'Montant de la réparation'}</span>
    <strong>{single ? repairPackagePrice(single) : 'À confirmer après diagnostic'}</strong>
    {single && <><p className="ri-package-summary-label">{single.label}</p><p className="ri-package-note">{single.includes}</p></>}
    {!single && packages.length > 0 && <ul className="ri-package-summary-list">{packages.map(item => <li key={item.id}><span>{item.label}</span><b>{repairPackagePrice(item)}</b></li>)}</ul>}
    {packages.length > 0 && <small className="ri-package-note">L’atelier confirme le forfait adapté après diagnostic.</small>}
  </div>;
}
