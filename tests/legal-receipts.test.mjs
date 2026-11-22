import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proposalReceiptText} from '../src/legal-receipts.ts';

const proposal = () => ({id: 'proposal-synthetic', kind: 'repair', description: 'Remplacement du connecteur.',
  repairAmount: 89.9, returnFee: 12.5, decision: 'repair', decidedAt: '2026-11-22T12:30:00.000Z',
  bankInstructions: 'PRIVATE_BANK', diagnosis: 'PRIVATE_DIAGNOSIS',
  legal: {version: '2026-11-22', acceptedAt: '2026-11-22T12:30:00.000Z', document: 'CONDITIONS FIGÉES À LA COMMANDE',
    earlyStartRequested: false, earlyStartAcknowledged: false, customerName: 'Client fictif', customerEmail: 'client@example.invalid'},
});
test('contract receipt retains the server terms snapshot, explicit amount and consent without private fields', () => {
  const text = proposalReceiptText('REP-TEST', proposal(), 'contract');
  for (const expected of ['CONDITIONS FIGÉES À LA COMMANDE', '89,90', 'Client fictif', 'client@example.invalid',
    'proposal-synthetic', '2026-11-22T12:30:00.000Z', 'non demandé']) assert.ok(text.includes(expected), expected);
  assert.ok(!text.includes('PRIVATE_'));
});
test('withdrawal receipt reproduces the persisted declaration and timestamp without assuming a refund', () => {
  const record = proposal();
  record.withdrawal = {id: 'withdrawal-synthetic', requestedAt: '2026-11-22T14:45:00.000Z',
    customerName: 'Client lors de la déclaration', customerEmail: 'declaration@example.invalid',
    statement: 'Je vous notifie ma rétractation de ce contrat.'};
  const text = proposalReceiptText('REP-TEST', record, 'withdrawal');
  for (const expected of ['withdrawal-synthetic', record.withdrawal.requestedAt, record.withdrawal.statement,
    record.withdrawal.customerName, record.withdrawal.customerEmail]) assert.ok(text.includes(expected), expected);
  assert.ok(!text.includes('PRIVATE_'));
  assert.ok(text.includes('aucun remboursement automatique'));
});
test('a receipt is never fabricated when the corresponding server record is absent', () => {
  assert.throws(() => proposalReceiptText('REP-TEST', {...proposal(), legal: undefined}, 'contract'));
  assert.throws(() => proposalReceiptText('REP-TEST', proposal(), 'withdrawal'));
});
