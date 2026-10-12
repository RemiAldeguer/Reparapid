import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App,ErrorBoundary} from './App';
import './styles.css';
import './auth.css';
import {AuthGate} from './auth';
import {ClientPortal} from './client-portal';
import {PublicHome} from './public-home';
const root=document.getElementById('root');
if(!root)throw new Error('Élément racine introuvable.');
function RouteGate() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {const update = () => setHash(window.location.hash); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update);}, []);
  const route = hash.split('?')[0].replace(/\/$/, '');
  if (!route || route === '#' || route === '#/accueil') return <PublicHome/>;
  return route === '#/espace-client' ? <ClientPortal/> : <AuthGate><App/></AuthGate>;
}
createRoot(root).render(<ErrorBoundary><RouteGate/></ErrorBoundary>);
