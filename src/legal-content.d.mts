export type LegalDocumentKind = 'cgu' | 'cgv' | 'mentions';

export interface LegalSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly bullets?: readonly string[];
}

export interface LegalDocument {
  readonly title: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
}

export interface LegalSource {
  readonly title: string;
  readonly url: string;
}

export const LEGAL_VERSION: '2026-11-22';
export const LEGAL_SOURCES_CHECKED_AT: '2026-11-22';
export const LEGAL_OPERATOR: Readonly<{
  legalName: 'VESTY GAMES 3';
  tradeName: 'Maxxi Games';
  legalForm: 'SARL';
  siren: '799620570';
  siret: '79962057000017';
  registry: 'RCS Créteil 799 620 570';
  address: string;
  shippingAddress: string;
  email: 'contact@reparapid.fr';
  phone: '01 58 46 82 51';
  mediator: null;
}>;
export const WITHDRAWAL_TEMPLATE: string;
export const LEGAL_DOCUMENTS: Readonly<Record<LegalDocumentKind, LegalDocument>>;
export const LEGAL_SOURCES: readonly LegalSource[];
export function legalDocumentText(kind: LegalDocumentKind): string;
export const LEGAL_CGV_TEXT: string;
