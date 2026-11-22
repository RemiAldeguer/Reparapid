import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notificationPreview} from '../server/notification-preview.mjs';
import {NOTIFICATION_EVENTS, renderRepairNotification} from '../server/repair-notifications.mjs';

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
