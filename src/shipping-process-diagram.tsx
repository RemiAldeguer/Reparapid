import type {ReactNode} from 'react';
import './shipping-process-diagram.css';

function ProcessDrawing({children}: {children: ReactNode}) {
  return <svg viewBox="0 0 112 100" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

function PrintDrawing() {
  return <ProcessDrawing><path d="M34 37V11h44v26" fill="#fff"/><path d="M27 38h58a7 7 0 0 1 7 7v25H20V45a7 7 0 0 1 7-7Z" fill="#eee9e5"/><path d="M29 48h6m43 0h5"/><path d="M33 61h46v31H33z" fill="#fff"/><path d="M33 61h46v11H33z" fill="#f3d6d2" stroke="none"/><path d="M41 66h19M41 82h28"/><path d="M34 74h44" stroke="#a32720" strokeDasharray="3 4"/><path d="M43 22h26M43 29h16"/></ProcessDrawing>;
}

function CutDrawing() {
  return <ProcessDrawing><path d="M36 9h48v24H36z" fill="#f9e4e0"/><path d="M45 19h29m-29 7h18"/><path d="M36 53h48v38H36z" fill="#fff"/><path d="M45 64h29m-29 8h21m-21 8h27"/><path d="M17 43h80" stroke="#a32720" strokeDasharray="3 4"/><g stroke="#a32720"><circle cx="15" cy="34" r="6"/><circle cx="15" cy="51" r="6"/><path d="m21 37 27 18m-27-7 27-18"/></g><path d="m62 37-3 5-3-5m0 12 3-5 3 5" stroke="#a32720"/></ProcessDrawing>;
}

function KeepDrawing() {
  return <ProcessDrawing><path d="m13 40 43-29 43 29" stroke="#74625d"/><path d="M24 35v55h64V35" fill="#f1eeeb" stroke="#74625d"/><path d="M24 35 56 13l32 22" fill="#f1eeeb" stroke="none"/><path d="M39 45h34v25H39z" fill="#fff"/><path d="M39 45h34v8H39z" fill="#f3d6d2" stroke="none"/><path d="M46 59h20m-20 6h13"/><path d="m46 80 6 5 11-12" stroke="#a32720" strokeWidth="2.5"/></ProcessDrawing>;
}

function PackDrawing() {
  return <ProcessDrawing><path d="m18 52 38-16 38 16-38 18Z" fill="#ead9c4" stroke="#94714e"/><path d="m29 45 3-19 33 5-2 24Z" fill="#eeeef1"/><path d="m31 28 30 4m-23 2-2 9m6-8-2 9m6-8-2 9" stroke="#a6a4ab"/><path d="m59 14 26 4-4 35-26-4Z" fill="#fff"/><path d="m63 24 16 2m-17 5 16 2m-17 5 12 2" stroke="#a32720"/><path d="M25 54q7-11 16-2t17 0 18 1 13 0" stroke="#a78d72" strokeDasharray="2 4"/><path d="m18 52 38 18v24L18 77Z" fill="#d5b48c" stroke="#94714e"/><path d="m56 70 38-18v25L56 94Z" fill="#e8caab" stroke="#94714e"/><path d="m18 52-9-9 36-16 11 9m38 16 9-9-15-7" stroke="#94714e"/><path d="m30 68 12 6m-12 0 8 4" stroke="#94714e"/></ProcessDrawing>;
}

const steps = [
  {title: 'Imprimez la fiche', text: 'Le document contient votre talon et la fiche destinée à l’atelier.', art: <PrintDrawing/>},
  {title: 'Découpez sur les pointillés', text: 'Séparez le talon du haut et la fiche atelier du bas.', art: <CutDrawing/>},
  {title: 'Gardez le talon', text: 'Conservez votre référence de dossier pour suivre la réparation.', destination: 'CHEZ VOUS', art: <KeepDrawing/>},
  {title: 'Glissez la fiche dans le colis', text: 'Placez toute la fiche atelier à l’intérieur, avec la console bien protégée.', destination: 'DANS LE COLIS', art: <PackDrawing/>},
];

export function ShippingProcessDiagram() {
  return <figure className="shipping-process" aria-label="Comment préparer votre envoi">
    <ol className="shipping-process-steps">{steps.map((step, index) => <li key={step.title} className={step.destination ? 'shipping-process-destination' : undefined}>
      <span className="shipping-process-number" aria-hidden="true">{index + 1}</span>
      <div className="shipping-process-art">{step.art}</div>
      <div className="shipping-process-copy">{step.destination && <span className="shipping-process-tag">{step.destination}</span>}<h4>{step.title}</h4><p>{step.text}</p></div>
    </li>)}</ol>
    <figcaption><strong>Le talon reste chez vous.</strong><br/>La fiche atelier accompagne la console.</figcaption>
  </figure>;
}
