// Presentation only. Callers validate the portal URL before reaching this renderer.
// Keep tables and inline styles: these messages also need to work without web fonts or images.
const e = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim()
  .replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const red = '#a32720', ink = '#19191b', muted = '#65646a';
const stages = ['En attente d’envoi', 'Réception', 'Diagnostic', 'En attente de pièces', 'Réparation en cours', 'Tests de validation', 'Terminée'];
const stageIndexes = [0, 1, 2, 2, 3, 3, 4];

function progressIndex({eventType, newStage, proposalKind, decision}) {
  if (/^(return-|buyback-|withdrawal-)/.test(eventType) || ['irreparable', 'abandonnee'].includes(eventType)
    || proposalKind === 'unrepairable' || (decision && decision !== 'repair')) return -1;
  return stageIndexes[stages.indexOf(newStage)] ?? -1;
}

function progress(index) {
  if (index < 0) return '';
  return `<tr><td class="mail-pad" style="padding:0 32px 28px">
<p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:1.3px;color:${muted}">LE PARCOURS DE VOTRE CONSOLE</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse"><tr>
${['Envoi', 'Reçue', 'Diagnostic', 'Atelier', 'Prête'].map((label, i) => {
    const current = i === index, color = i <= index ? red : '#b8b6b3';
    return `<td${current ? ' aria-current="step"' : ''} valign="top" width="20%" style="width:20%;padding:10px 2px 0;border-top:3px solid ${color};text-align:center;color:${current ? red : i < index ? ink : muted}"><span style="font-size:17px;font-weight:bold">${String(i + 1).padStart(2, '0')}</span><br><span style="font-size:11px;line-height:17px;${current ? 'font-weight:bold;' : ''}">${label}</span>${current ? '<br><span style="font-size:10px">Actuelle</span>' : ''}</td>`;
  }).join('')}
</tr></table></td></tr>`;
}

function nextAction({audience, eventType, newStage, proposalKind, decision}) {
  const shop = audience === 'shop';
  switch (eventType) {
    case 'created': return newStage === stages[0]
      ? shop ? 'Une nouvelle demande est à suivre. Le client prépare son envoi ; confirmez la réception une fois la console arrivée.' : 'Téléchargez votre fiche, glissez la partie prévue dans le colis et conservez votre exemplaire.'
      : shop ? 'Ouvrez le dossier pour préparer sa prise en charge.' : 'Consultez votre dossier pour retrouver les informations de prise en charge.';
    case 'attente-envoi': return shop ? 'Confirmez la réception dans le dossier lorsque le colis arrive à l’atelier.' : 'Imprimez la fiche d’envoi depuis votre espace et préparez votre colis.';
    case 'reception': return shop ? 'La console est réceptionnée. Vous pouvez préparer son diagnostic.' : 'Votre console est entre les mains de l’atelier. Le prochain point sera le diagnostic.';
    case 'diagnostic': return shop ? 'Précisez le diagnostic, l’intervention proposée et son prix dans le dossier.' : 'Aucune action pour le moment. Vous serez informé lorsqu’une proposition sera disponible.';
    case 'proposal-published': return shop ? 'La proposition a été publiée. Retrouvez le choix du client dans ce dossier.' : proposalKind === 'unrepairable' ? 'Ouvrez votre dossier pour choisir le retour ou examiner une éventuelle offre de rachat pour pièces.' : 'Consultez le diagnostic et le prix, puis acceptez la réparation ou demandez le retour depuis votre dossier.';
    case 'proposal-decided': return decision === 'repair'
      ? shop ? 'L’accord client est enregistré. Vérifiez les conditions du dossier avant de commencer l’intervention.' : 'Votre accord est enregistré. L’atelier organise la suite de l’intervention.'
      : decision === 'buyback' ? shop ? 'L’offre de rachat est acceptée. Organisez sa finalisation avec le client.' : 'Le magasin vous accompagne pour finaliser le rachat convenu.'
      : shop ? 'Le client demande le retour. Consultez les frais et le paiement avant de préparer l’expédition.' : 'Retrouvez le montant et les instructions de virement des frais de retour dans votre dossier.';
    case 'attente-pieces': return shop ? 'Suivez la disponibilité des pièces avant de reprendre l’intervention.' : 'L’atelier reprendra l’intervention lorsque les pièces nécessaires seront disponibles.';
    case 'reparation': return shop ? 'Consignez l’intervention et préparez les contrôles de fonctionnement.' : 'L’atelier s’occupe de votre console. Retrouvez les prochaines nouvelles dans votre espace.';
    case 'tests': return shop ? 'Terminez les contrôles avant de déclarer la console prête à récupérer.' : 'Derniers contrôles en cours. L’atelier vous informera quand votre console sera prête.';
    case 'terminee': return shop ? 'Convenez du retrait ou du retour avec le client.' : 'Contactez l’atelier pour convenir du retrait ou du retour de votre console.';
    case 'return-transfer-declared': return shop ? 'Vérifiez le virement sur le compte du magasin avant de confirmer sa réception.' : 'Votre déclaration est enregistrée. Le magasin doit encore confirmer la réception du virement.';
    case 'return-payment-confirmed': return shop ? 'Le règlement est confirmé. Préparez le colis de retour.' : 'Le virement est confirmé. Le magasin peut préparer le retour de votre console.';
    case 'return-dispatched': return shop ? 'Retrouvez les informations d’expédition dans le dossier.' : 'Consultez les informations d’expédition et le suivi, s’il est renseigné, dans votre dossier.';
    case 'buyback-completed': return shop ? 'Le rachat convenu est finalisé. Son suivi reste accessible dans le dossier.' : 'Le rachat convenu est finalisé. Conservez les informations de votre dossier.';
    case 'withdrawal-requested': return shop ? 'Consultez la déclaration enregistrée et contactez le client pour organiser les suites.' : 'Votre déclaration est enregistrée. Retrouvez votre accusé de réception et contactez le magasin pour la suite.';
    default: return shop ? 'Consultez le dossier pour organiser la suite avec le client.' : 'Consultez votre dossier pour connaître les options proposées par l’atelier.';
  }
}

export function renderNotificationEmail(message) {
  const {subject, greeting, eventLabel, description, workshopName, consoleName, consoleCode, repairCode, clientName, audience, tracking, url} = message;
  const root = !url.searchParams.has('atelier'), shop = audience === 'shop';
  const index = progressIndex(message), step = index < 0 ? 'INFO' : String(index + 1).padStart(2, '0');
  const action = shop ? 'Consulter le dossier' : 'Consulter mon espace client';
  const next = nextAction(message);
  const logo = root ? `<td width="58" style="width:58px;padding-right:16px"><img src="${e(url.origin)}/favicon-reparapid.png" width="56" height="56" alt="Logo RépaRapid" style="display:block;width:56px;height:56px;background:#ffffff;border:1px solid #ffffff;border-radius:8px"></td>` : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(subject)}</title>
<style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}img{border:0;outline:none;text-decoration:none}a:focus-visible{outline:3px solid #a32720;outline-offset:4px}@media only screen and (max-width:480px){.mail-pad{padding-left:20px!important;padding-right:20px!important}.mail-title{font-size:27px!important;line-height:33px!important}.mail-frame{padding:12px 8px!important}.mail-action{display:block!important;text-align:center!important}.mail-step{font-size:30px!important;width:52px!important}.mail-brand{font-size:24px!important}}</style></head>
<body style="margin:0;padding:0;width:100%;background:#f3f1ee;color:${ink};font-family:Arial,Helvetica,sans-serif;line-height:1.6">
<div style="display:none;font-size:1px;color:#f3f1ee;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${e(eventLabel)} · ${e(consoleName)} · ${e(repairCode)}. ${e(description)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f3f1ee"><tr><td class="mail-frame" align="center" style="padding:28px 12px">
<!--[if mso]><table role="presentation" width="640" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e2dfda;border-radius:12px;overflow:hidden">
<tr><td class="mail-pad" style="padding:26px 32px;background:${ink};border-radius:11px 11px 0 0;border-bottom:5px solid ${red}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr>${logo}<td style="vertical-align:middle;word-break:break-word"><strong class="mail-brand" style="font-size:28px;line-height:32px;letter-spacing:-1px;color:#ffffff">${root ? 'Répa<span style="color:#ed756e">Rapid</span>' : e(workshopName)}</strong><br><span style="font-size:11px;letter-spacing:1.1px;color:#d1cecc">${root ? 'L’ATELIER DE MAXXI GAMES' : 'LE SUIVI DE VOTRE RÉPARATION'}</span></td></tr></table>
</td></tr>
<tr><td class="mail-pad" style="padding:28px 32px 16px"><p style="margin:0 0 20px;font-size:11px;letter-spacing:1.3px;font-weight:bold;color:${red}">${shop ? 'CÔTÉ ATELIER' : 'VOTRE CONSOLE, ENTRE DE BONNES MAINS'}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr><td valign="top" class="mail-step" width="66" style="width:66px;font-size:${index < 0 ? '18' : '42'}px;line-height:1.15;font-weight:bold;color:${red};padding:5px 16px 0 0">${step}</td><td valign="top"><h1 class="mail-title" style="margin:0;font-size:32px;line-height:38px;letter-spacing:-.8px;color:${ink};font-weight:800;word-break:break-word">${e(eventLabel)}</h1><p style="margin:8px 0 0;font-size:12px;color:${muted}">${index < 0 ? 'La suite de votre dossier' : `Étape ${index + 1} sur 5 · Suivi de réparation`}</p></td></tr></table>
</td></tr>
<tr><td class="mail-pad" style="padding:4px 32px 24px"><p style="margin:0 0 10px;font-size:15px">${e(greeting)}</p><p style="margin:0;font-size:16px;line-height:26px;color:#46454a">${e(description)}</p></td></tr>
<tr><td class="mail-pad" style="padding:0 32px 26px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;background:#f5f4f1;border:1px solid #e7e4df;border-left:4px solid ${red};border-radius:8px"><tr><td style="padding:18px 20px;word-break:break-word">
<p style="margin:0 0 5px;font-size:10px;font-weight:bold;letter-spacing:1.4px;color:${muted}">DOSSIER ${e(repairCode)}</p><p style="margin:0;font-size:20px;line-height:26px;font-weight:bold;color:${ink}">${e(consoleName)}</p><p style="margin:5px 0 0;font-size:12px;color:${muted}">Console ${e(consoleCode)}${shop ? `<br>Client : <strong style="color:${ink}">${e(clientName)}</strong>` : ''}</p>
</td></tr></table></td></tr>
${progress(index)}
<tr><td class="mail-pad" style="padding:0 32px 30px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border-top:1px solid #e7e4df"><tr><td style="padding:22px 0 0"><p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:${ink}">${shop ? 'La prochaine action à l’atelier' : 'Et maintenant ?'}</p><p style="margin:0 0 20px;font-size:14px;line-height:23px;color:#46454a">${e(next)}</p>
${tracking ? `<p style="margin:0 0 20px;padding:12px 14px;background:#f5f4f1;border:1px solid #e7e4df;border-radius:6px;font-size:13px;word-break:break-all">${e(tracking)}</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0"><tr><td align="center" bgcolor="${red}" style="background:${red};border-radius:6px;mso-padding-alt:14px 22px"><a class="mail-action" href="${e(url.href)}" style="display:inline-block;padding:14px 22px;border:1px solid ${red};border-radius:6px;background:${red};color:#ffffff;font-size:14px;line-height:22px;font-weight:bold;text-decoration:none;mso-padding-alt:0">${e(action)}</a></td></tr></table>
<p style="margin:18px 0 0;font-size:11px;line-height:18px;color:${muted};word-break:break-all">Le bouton ne s’ouvre pas ? Retrouvez le dossier ici :<br><a href="${e(url.href)}" style="color:${red};text-decoration:underline;word-break:break-all">${e(url.href)}</a></p>
${message.accessNote ? `<p style="margin:12px 0 0;font-size:12px;color:${muted}">${e(message.accessNote)}</p>` : ''}
</td></tr></table></td></tr>
<tr><td class="mail-pad" style="padding:22px 32px;background:${ink};border-radius:0 0 11px 11px"><p style="margin:0;font-size:14px;font-weight:bold;color:#ffffff">${root ? 'Une seconde vie pour votre console.' : `L’équipe de ${e(workshopName)}`}</p><p style="margin:5px 0 0;font-size:11px;line-height:19px;color:#d1cecc">${root ? `RépaRapid · Maxxi Games<br>` : ''}Un message lié à votre dossier de réparation.<br>Besoin d’aide ? Retrouvez le contact de l’atelier dans votre espace.</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
<p style="max-width:600px;margin:16px auto 0;font-size:10px;line-height:17px;color:${muted};text-align:center">${shop ? 'Notification à destination du magasin. Informations réservées au suivi du dossier.' : 'Conservez la référence de votre dossier pour vos échanges avec l’atelier.'}</p>
</td></tr></table></body></html>`;
}
