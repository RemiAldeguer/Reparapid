import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notificationPreview} from '../server/notification-preview.mjs';
import {NOTIFICATION_EVENTS, renderRepairNotification} from '../server/repair-notifications.mjs';
import {notificationPreviewDocument} from '../src/notification-preview-document.mjs';

const query = (event, audience = 'client', variant) => new URLSearchParams({event, audience, ...(variant ? {variant} : {})});

test('Every lifecycle email has an isolated synthetic preview for both audiences', () => {
  for (const event of NOTIFICATION_EVENTS) for (const audience of ['client', 'shop']) {
    const preview = notificationPreview(query(event.key, audience));
    assert.equal(preview.eventType, event.key);
    assert.equal(preview.eventLabel, event.label);
    assert.equal(preview.audience, audience);
    assert.equal(preview.sample, true);
    assert.ok(preview.subject.includes(event.label));
    assert.ok(preview.html.includes('lang="fr"'));
    assert.match(preview.recipient, /@example\.invalid$/);
    assert.match(preview.sender, /@example\.invalid>$/);
    assert.match(preview.text, audience === 'client' ? /Consulter mon espace client/ : /Consulter le dossier/);
    assert.match(preview.text, /https:\/\/reparapid\.example\.invalid\//);
    assert.equal(preview.variant, preview.variants[0].key);
    assert.ok(!JSON.stringify(preview).includes('apiKey'));
  }
});

test('Previews use the production HTML and text renderer with fictitious data', () => {
  const preview = notificationPreview(query('diagnostic'));
  const rendered = renderRepairNotification({version: 2, audience: 'client', eventType: 'diagnostic',
    clientName: 'Camille Exemple', workshopName: 'RépaRapid · Maxxi Games', consoleName: 'Sony PlayStation 5',
    consoleCode: 'CON-EXEMPLE', repairCode: 'REP-EXEMPLE', oldStage: '', newStage: 'Diagnostic',
    portalUrl: 'https://reparapid.example.invalid/#/espace-client'});
  assert.deepEqual({subject: preview.subject, text: preview.text, html: preview.html}, rendered);
});

test('Conditional email variants expose public request, workshop, quote, decision and tracking branches', () => {
  const cases = [
    ['created', 'request', /Imprimez la fiche/],
    ['created', 'workshop', /Le dossier de réparation est enregistré/],
    ['proposal-published', 'repairable', /Le diagnostic et le devis sont disponibles/],
    ['proposal-published', 'unrepairable', /Le diagnostic indique que la console est irréparable/],
    ['proposal-decided', 'repair', /La réparation proposée est acceptée/],
    ['proposal-decided', 'return', /Le retour de la console est demandé/],
    ['proposal-decided', 'buyback', /Le rachat pour pièces proposé est accepté/],
    ['return-dispatched', 'tracked', /Suivi du retour : EXEMPLE-SUIVI/],
  ];
  for (const [event, variant, content] of cases) for (const audience of ['client', 'shop']) {
    const preview = notificationPreview(query(event, audience, variant));
    assert.equal(preview.variant, variant);
    assert.ok(preview.variants.some(item => item.key === variant && item.label));
    assert.match(preview.text, content);
  }
  assert.ok(!notificationPreview(query('return-dispatched', 'client', 'untracked')).text.includes('Suivi du retour'));
});

test('Preview inputs reject missing, unknown, duplicated and incompatible parameters', () => {
  for (const value of [
    '', 'event=diagnostic', 'event=diagnostic&audience=admin', 'event=unknown&audience=client',
    'event=diagnostic&audience=client&clientId=secret', 'event=diagnostic&audience=client&variant=repair',
    'event=diagnostic&event=tests&audience=client', 'event=diagnostic&audience=client&audience=shop',
    'event=created&audience=client&variant=request&variant=workshop', 'event=created&audience=client&variant=',
    'event=%3Cscript%3E&audience=client',
  ]) assert.throws(() => notificationPreview(new URLSearchParams(value)), /Aperçu d’e-mail invalide/);
});

test('Email progress reflects the actual stage, including acceptance before work starts', () => {
  for (const [event, stage] of [['attente-envoi', 'Envoi'], ['reception', 'Reçue'], ['diagnostic', 'Diagnostic'], ['attente-pieces', 'Diagnostic'], ['reparation', 'Atelier'], ['tests', 'Atelier'], ['terminee', 'Prête']]) {
    const {html} = notificationPreview(query(event));
    const current = /<td[^>]*aria-current="step"[^>]*>([\s\S]*?)<\/td>/.exec(html)?.[1] || '';
    assert.ok(current.includes(stage), `${event}: ${stage}`);
    assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
  }
  const {html} = notificationPreview(query('proposal-decided', 'client', 'repair'));
  const current = /<td[^>]*aria-current="step"[^>]*>([\s\S]*?)<\/td>/.exec(html)?.[1] || '';
  assert.ok(current.includes('Diagnostic'), 'accepting a quote does not start the intervention');
});

test('Returns, buybacks and withdrawals never imply a repaired console in the progress diagram', () => {
  for (const [event, variant] of [['irreparable'], ['abandonnee'], ['proposal-published', 'unrepairable'], ['proposal-decided', 'return'], ['proposal-decided', 'buyback'], ['return-transfer-declared'], ['return-payment-confirmed'], ['return-dispatched'], ['buyback-completed'], ['withdrawal-requested']]) {
    const {html} = notificationPreview(query(event, 'client', variant));
    assert.doesNotMatch(html, /aria-current="step"/);
    assert.match(html, /La suite de votre dossier/);
  }
});

test('Email branding uses a public first-party logo without customer identifiers and respects tenant identity', () => {
  const payload = {version: 2, eventType: 'diagnostic', audience: 'shop', workshopName: '<Atelier Exemple>', clientName: 'Camille',
    consoleName: 'Nintendo Switch', consoleCode: 'CON-EXEMPLE', repairCode: 'REP-EXEMPLE', oldStage: 'Réception', newStage: 'Diagnostic',
    portalUrl: 'https://reparapid.example.invalid/#/repairs/dossier-exemple'};
  const root = renderRepairNotification(payload).html;
  assert.match(root, /src="https:\/\/reparapid\.example\.invalid\/favicon-reparapid\.png"/);
  assert.match(root, /alt="Logo RépaRapid"/);
  const tenant = renderRepairNotification({...payload, portalUrl: 'https://reparapid.example.invalid/?atelier=11111111-1111-4111-8111-111111111111#/repairs/dossier-exemple'}).html;
  assert.doesNotMatch(tenant, /<img|Maxxi Games|Logo RépaRapid/);
  assert.match(tenant, /&lt;Atelier Exemple&gt;/);
  assert.doesNotMatch(root, /<script|<form|<svg|tracking-pixel/i);
});

test('Visual previews permit only the fixed local logo and keep links, forms, scripts and other assets disabled', () => {
  const html = notificationPreview(query('diagnostic')).html;
  const document = notificationPreviewDocument(html, 'https://app.example.invalid');
  assert.match(document, /src="https:\/\/app\.example\.invalid\/favicon-reparapid\.png"/);
  assert.match(document, /default-src 'none'; img-src https:\/\/app\.example\.invalid\/favicon-reparapid\.png;/);
  assert.match(document, /base-uri 'none'; form-action 'none'/);
  assert.doesNotMatch(document, /href="/);
  assert.match(document, /aria-disabled="true"/);
  assert.doesNotMatch(document, /img-src[^;]*(?:\*|data:|https:;|\/api\/)/);
  assert.equal(notificationPreviewDocument(undefined, 'https://app.example.invalid'), undefined);
  for (const origin of ['https://user:password@app.example.invalid', 'javascript:alert(1)', 'file:///tmp/', 'https://app.example.invalid/path', 'https://app.example.invalid/?query=1']) {
    assert.throws(() => notificationPreviewDocument(html, origin), /Origine/);
  }
});
