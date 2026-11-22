import './maxxi-social.css';

const maxxiSocialAccounts = [
  {network: 'Instagram', handle: '@maxxigames_kremlinbicetre', url: 'https://www.instagram.com/maxxigames_kremlinbicetre/', kind: 'instagram'},
  {network: 'TikTok', handle: '@maxxigameskremlinbicetre', url: 'https://www.tiktok.com/@maxxigameskremlinbicetre', kind: 'tiktok'},
] as const;

function SocialLogo({kind}: {kind: typeof maxxiSocialAccounts[number]['kind']}) {
  if (kind === 'instagram') return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false"><rect x="4" y="4" width="24" height="24" rx="7" stroke="currentColor" strokeWidth="2.5"/><circle cx="16" cy="16" r="5.5" stroke="currentColor" strokeWidth="2.5"/><circle cx="23.5" cy="8.5" r="1.5" fill="currentColor"/></svg>;
  return <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false"><path d="M18.4 3.5h4.2c.3 2.8 1.9 4.8 5.4 5.2V13a13 13 0 0 1-5.4-1.8v10.1a8 8 0 1 1-8-8h1v4.3a3.7 3.7 0 1 0 2.8 3.7V3.5Z"/></svg>;
}

export function MaxxiSocial() {
  return <section className="rp-social" id="rp-social" tabIndex={-1} aria-labelledby="rp-social-title">
    <div className="rp-shell">
      <div className="rp-section-heading">
        <div><span className="rp-eyebrow">LES RÉSEAUX DE MAXXI GAMES</span><h2 id="rp-social-title">Le magasin,<br/>aussi en ligne.</h2></div>
        <p>Actualités et événements du magasin :<br/>retrouvez Maxxi Games Le Kremlin-Bicêtre sur ses réseaux.</p>
      </div>
      <ul className="rp-social-accounts">
        {maxxiSocialAccounts.map(account => <li key={account.kind}>
          <a className="rp-social-account" href={account.url} target="_blank" rel="noopener noreferrer" aria-describedby="rp-social-note">
            <span className="rp-social-logo"><SocialLogo kind={account.kind}/></span>
            <div className="rp-social-account-copy"><h3>{account.network}</h3><span className="rp-social-store">Maxxi Games · Le Kremlin-Bicêtre</span><span className="rp-social-handle">{account.handle}</span></div>
            <span className="rp-social-account-action">Voir le compte<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M10 5H5v14h14v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          </a>
        </li>)}
      </ul>
      <p className="rp-social-note" id="rp-social-note">Les comptes s’ouvrent dans un nouvel onglet.</p>
    </div>
  </section>;
}
