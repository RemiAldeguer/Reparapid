/**
 * Public legal content shared by the storefront and contract snapshots.
 * Keep previous accepted snapshots in their records when updating this version.
 */
export const LEGAL_VERSION = '2026-11-23.2';
export const LEGAL_SOURCES_CHECKED_AT = '2026-11-22';

export const LEGAL_OPERATOR = Object.freeze({
  legalName: 'VESTY GAMES 3',
  tradeName: 'Maxxi Games',
  legalForm: 'SARL',
  siren: '799620570',
  siret: '79962057000017',
  registry: 'RCS Créteil 799 620 570',
  address: '30–30 bis avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre',
  shippingAddress: '30 bis avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre',
  email: 'contact@reparapid.fr',
  phone: '01 58 46 82 51',
  mediator: null,
});

export const WITHDRAWAL_TEMPLATE = `FORMULAIRE DE RÉTRACTATION

À utiliser uniquement pour notifier votre décision de vous rétracter d’un contrat, lorsque ce droit est applicable.

Destinataire : VESTY GAMES 3, enseigne Maxxi Games — service RépaRapid, 30–30 bis avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre, France. Courriel : contact@reparapid.fr.

Je vous informe de ma décision d’exercer mon droit de rétractation pour le contrat suivant, portant sur une prestation de diagnostic ou de réparation :

Prestation concernée : ........................................................

Date de commande ou d’acceptation du devis : ....................................

Référence du dossier ou du devis, si connue : ...................................

Nom et prénom du consommateur : ................................................

Adresse du consommateur : ......................................................

Date : ........................................................................

Signature du consommateur, uniquement si ce formulaire est envoyé sur papier :

...............................................................................`;

export const LEGAL_DOCUMENTS = {
  cgu: {
    title: 'Conditions générales d’utilisation',
    intro: 'RépaRapid est le service de demande et de suivi de réparation exploité par VESTY GAMES 3 sous l’enseigne Maxxi Games. Ces conditions encadrent l’utilisation du site et de l’espace client. Les prestations payantes relèvent aussi des conditions générales de vente et du devis accepté. Les coordonnées du médiateur de la consommation sont une information à compléter par Maxxi Games ; aucun médiateur n’est actuellement renseigné sur ce site.',
    sections: [
      {
        id: 'service',
        title: '1. Le service RépaRapid',
        paragraphs: [
          'Le site permet de consulter la présentation de l’atelier et les guides, de préparer une demande pour une console, de créer un compte ou de se connecter, de retrouver une fiche d’envoi et de suivre ses dossiers. Après réception et examen, le magasin peut publier une proposition puis recueillir le choix du client.',
          'L’enregistrement d’une demande ne confirme ni la possibilité de réparer, ni un prix définitif, ni un délai particulier. Il n’achète aucun transport et ne déclenche aucun prélèvement. Une réparation payante nécessite une proposition et un accord distincts dans les conditions des CGV.',
        ],
      },
      {
        id: 'compte',
        title: '2. Création et utilisation du compte',
        paragraphs: [
          'L’utilisateur fournit des coordonnées exactes et actualisées, notamment pour le contact et le retour de l’appareil. Il doit être majeur et capable de contracter ou agir avec l’autorisation de son représentant légal. Il doit être propriétaire de l’appareil ou autorisé par son propriétaire à demander les opérations concernées.',
          'Le compte est personnel. L’utilisateur protège son mot de passe, se déconnecte sur un appareil partagé et signale rapidement un accès suspect à contact@reparapid.fr. Il ne communique pas ses identifiants de jeu, de paiement ou de messagerie dans les champs libres du dossier. Un accès technique éventuellement nécessaire à un appareil doit être convenu séparément avec l’atelier.',
          'L’atelier applique des mesures de protection adaptées. Un accès réalisé avec les identifiants du compte n’est pas automatiquement considéré comme une preuve incontestable d’une action de son titulaire ; une contestation peut être examinée à partir des éléments disponibles.',
        ],
      },
      {
        id: 'dossiers',
        title: '3. Demandes, informations et suivi',
        paragraphs: [
          'Le client décrit les symptômes et les interventions antérieures connues sans transmettre de données inutiles ou appartenant à des tiers. Il vérifie les informations récapitulées avant d’envoyer une demande et informe l’atelier d’une erreur constatée ensuite.',
          'Le statut « En attente d’envoi » signifie que le dossier a été enregistré ; il ne prouve pas la réception du colis. La fiche imprimable sert à identifier la demande. L’adresse et les instructions affichées doivent être vérifiées avant l’expédition. Si l’adresse n’est pas confirmée, le client contacte le magasin avant tout envoi.',
          'Le suivi client présente les informations publiées pour son dossier. Les notes techniques et données internes de l’atelier ne font pas toutes partie de cette présentation. Le client peut contacter le magasin pour une précision ; une notification ou un statut ne remplace pas un devis, une facture ou une preuve de transport.',
        ],
      },
      {
        id: 'usage',
        title: '4. Usages autorisés et sécurité',
        paragraphs: [
          'L’utilisateur accède uniquement aux dossiers et fonctions qui lui sont destinés. Il respecte les droits des autres personnes et le fonctionnement du service.',
        ],
        bullets: [
          'Ne pas tenter d’accéder à un autre compte, à des dossiers de tiers ou aux fonctions réservées au magasin.',
          'Ne pas contourner les protections, altérer des données, transmettre de code malveillant ou surcharger volontairement le service.',
          'Ne pas usurper une identité, produire de justificatif trompeur ou déclarer sciemment un paiement qui n’a pas été effectué.',
          'Ne transmettre que les informations et contenus utiles au dossier, dont l’utilisation ne porte pas atteinte aux droits d’autrui.',
        ],
      },
      {
        id: 'disponibilite',
        title: '5. Disponibilité et assistance',
        paragraphs: [
          'Le service peut être temporairement interrompu pour maintenance, mise à jour ou incident. L’atelier s’efforce de rétablir l’accès dans des conditions adaptées et reste joignable aux coordonnées indiquées. Une difficulté d’accès n’annule pas un droit déjà exercé ou un engagement contractuel ; le client peut utiliser le courriel ou le courrier postal pour ses démarches.',
          'La présentation de contenus ou de liens externes ne garantit pas la disponibilité des services de leurs éditeurs. Les guides donnent des informations générales : avant toute intervention, il faut vérifier le modèle, les consignes du fabricant et les risques propres à l’appareil, notamment à ses batteries. Leur consultation ne crée pas de contrat de réparation.',
        ],
      },
      {
        id: 'propriete-intellectuelle',
        title: '6. Contenus et propriété intellectuelle',
        paragraphs: [
          'Les textes, visuels et éléments du site sont protégés selon les droits de leurs titulaires. Leur consultation et les usages autorisés par la loi restent permis. Une reproduction ou exploitation dépassant ces droits nécessite l’autorisation du titulaire concerné. Les marques de fabricants et modèles cités appartiennent à leurs propriétaires ; leur présence ne signifie pas que l’atelier est agréé par ces fabricants.',
          'Le client conserve les droits sur les contenus qu’il transmet. Il autorise leur utilisation dans la seule mesure nécessaire à la gestion de sa demande, au diagnostic, à la réparation et à la preuve des échanges, sans cession générale de ses droits au bénéfice du magasin.',
        ],
      },
      {
        id: 'donnees',
        title: '7. Données personnelles et confidentialité',
        paragraphs: [
          'VESTY GAMES 3 est responsable des traitements nécessaires à la gestion du compte, des demandes, des prestations et des échanges avec ses clients. Selon leur finalité, ces opérations reposent sur les démarches précontractuelles et l’exécution du contrat, les obligations légales ou l’intérêt légitime à assurer la sécurité et à défendre les droits de l’entreprise. L’acceptation des CGU ne constitue pas un consentement global à des usages publicitaires.',
          'Les coordonnées, informations de dossier et éléments de preuve utiles sont accessibles aux personnes habilitées et aux prestataires intervenant pour les besoins du service, notamment l’hébergement et, lorsque ces fonctions sont activées, l’envoi de notifications et le transport. Le site ne publie pas les dossiers clients. Les données ne doivent être conservées que pour les finalités annoncées et les durées légales ou nécessaires correspondantes ; les durées détaillées et les éventuels transferts doivent être précisés dans l’information sur la protection des données de l’exploitant.',
          'Pour demander l’accès, la rectification, l’effacement, la limitation, l’opposition ou la portabilité de ses données, selon les conditions applicables à chaque droit, le client peut écrire à contact@reparapid.fr ou à l’adresse de VESTY GAMES 3. Une suppression de compte ne supprime pas les pièces que la loi impose de conserver ou qui restent nécessaires à un litige. Le client peut également adresser une réclamation à la CNIL, sur cnil.fr. Cette rubrique ne remplace pas une information complète sur chaque traitement.',
        ],
      },
      {
        id: 'suspension',
        title: '8. Suspension et fermeture du compte',
        paragraphs: [
          'En cas d’usage illicite, de fraude ou de risque pour la sécurité, l’exploitant peut restreindre l’accès de manière proportionnée, immédiatement si l’urgence le justifie. Il en indique le motif lorsque cela est possible sans compromettre une enquête, la sécurité ou une obligation légale, et permet à l’utilisateur de présenter ses observations.',
          'Le client peut demander la fermeture de son compte par courriel. Une fermeture ou suspension ne transfère pas la propriété d’un appareil, n’annule pas une prestation en cours et ne prive pas le client de ses documents ou de ses recours. L’atelier organise par un autre moyen les échanges, la restitution et les demandes relatives aux données qui demeurent nécessaires.',
        ],
      },
      {
        id: 'responsabilite-modifications',
        title: '9. Responsabilité, modifications et litiges',
        paragraphs: [
          'Chaque partie répond des manquements qui lui sont imputables dans les conditions légales. Ces CGU ne suppriment ni ne réduisent les droits impératifs du consommateur à obtenir réparation d’un préjudice. Les règles propres à la garde, aux interventions et aux transports figurent dans les CGV.',
          'La date de version figure en tête de ces conditions. Une nouvelle version s’applique aux usages et engagements futurs ; elle ne modifie pas rétroactivement un devis déjà accepté ni les preuves conservées avec celui-ci. Une modification importante du fonctionnement du compte est portée à la connaissance de l’utilisateur par un moyen adapté.',
          'Les réclamations peuvent être adressées à contact@reparapid.fr ou par courrier à VESTY GAMES 3. Les règles de médiation et de compétence prévues aux CGV s’appliquent aux litiges de consommation concernés. Le droit français s’applique, sous réserve des protections impératives dont bénéficie le consommateur. Aucune compétence exclusive des tribunaux de Paris n’est imposée.',
        ],
      },
    ],
  },
  cgv: {
    title: 'Conditions générales de vente et de réparation',
    intro: 'Ces conditions concernent les prestations proposées aux consommateurs par VESTY GAMES 3, SARL exploitant l’enseigne Maxxi Games et le service RépaRapid. Le contrat de réparation est conclu avec cette société. Elles décrivent le parcours réel : demande, envoi, diagnostic, proposition, choix du client, paiement convenu et restitution. Les coordonnées du médiateur de la consommation sont une information à compléter par Maxxi Games ; aucun organisme n’est désigné dans le présent document. Les droits légaux du consommateur demeurent applicables.',
    sections: [
      {
        id: 'champ-application',
        title: '1. Champ d’application et documents contractuels',
        paragraphs: [
          'Ces CGV s’appliquent au particulier qui agit pour des besoins étrangers à son activité professionnelle. Une demande professionnelle nécessite des conditions adaptées convenues avec le magasin. Le client doit être majeur et capable de contracter, ou représenté dans les conditions légales, et disposer des droits nécessaires sur l’appareil confié.',
          'Le contrat comprend les présentes CGV dans la version remise au client, le devis ou la proposition acceptée et tout accord particulier établi entre les parties. Le devis précise les caractéristiques de la prestation et les conditions propres au dossier. Les conditions particulières ne peuvent pas écarter les protections impératives du consommateur.',
          'Le fait de créer un compte, de consulter un tarif indicatif, de remplir une demande ou d’imprimer une fiche d’envoi ne vaut pas acceptation d’une réparation payante. Aucune réparation supplémentaire ni cession de l’appareil ne résulte du seul silence du client.',
        ],
      },
      {
        id: 'demande-envoi',
        title: '2. Demande et préparation de l’envoi',
        paragraphs: [
          'Le client choisit son modèle, décrit les symptômes et renseigne les coordonnées nécessaires au traitement de la demande. Le dossier commence au statut « En attente d’envoi ». La prise en charge physique ne débute qu’à la réception effective par l’atelier. Le client conserve la référence et une copie des documents utiles.',
          'Avant l’expédition, il imprime la fiche, vérifie l’adresse d’envoi confirmée dans son dossier et protège l’appareil avec un emballage adapté. Il précise les éléments réellement joints. Il évite de joindre accessoires, supports de stockage amovibles, jeux ou objets personnels inutiles aux opérations demandées ; en cas de doute, il consulte l’atelier.',
          'La fiche ne constitue ni une étiquette prépayée ni une assurance transport. Sauf accord différent, le client organise et règle l’acheminement initial. Si l’adresse de réception n’est pas confirmée sur le site, il contacte le magasin avant d’envoyer. Une remise en magasin peut être organisée avec l’atelier.',
        ],
      },
      {
        id: 'reception-diagnostic',
        title: '3. Réception, état initial et diagnostic',
        paragraphs: [
          'À réception, l’atelier identifie le dossier et peut relever l’état apparent, les accessoires et les anomalies constatées. Des photographies et tests utiles peuvent documenter cette réception et le diagnostic. Les dommages préexistants et interventions antérieures sont pris en compte sans valoir renonciation générale du client à ses droits.',
          'L’examen recherche l’origine des symptômes et les possibilités de remise en état. Un démontage, un test, une réinitialisation ou une opération susceptible d’affecter les données ou l’état de l’appareil doit faire l’objet de l’information et de l’autorisation adaptées à ses conséquences. Les réserves techniques connues sont exposées au client avant les travaux concernés.',
          'Un diagnostic, un devis ou des frais d’examen ne peuvent être facturés que si leur caractère payant, leur montant TTC ou leur calcul et leurs conditions ont été communiqués et acceptés préalablement. En particulier, un forfait d’examen en cas d’appareil irréparable doit être annoncé dès la remise de l’appareil. Aucun montant forfaitaire de diagnostic n’est fixé par les présentes CGV. Sans accord préalable sur un coût, celui-ci ne peut pas être ajouté après l’examen.',
        ],
      },
      {
        id: 'devis-prix',
        title: '4. Proposition, prix et frais distincts',
        paragraphs: [
          'Après diagnostic, le magasin publie ou communique une proposition indiquant l’appareil concerné, les travaux proposés, les pièces prévues, les réserves utiles, le prix total de réparation toutes taxes comprises et le délai auquel il s’engage. Les coûts supplémentaires connus, notamment les frais de retour éventuels, sont présentés distinctement avant l’engagement correspondant. Si un prix ne peut pas être calculé à l’avance, sa méthode de calcul doit être précisée et acceptée avant une prestation payante.',
          'Les montants sont exprimés en euros. Une estimation affichée avant examen n’est pas un devis définitif. « À confirmer après diagnostic » signifie que le prix n’est pas encore arrêté ; seul un montant explicite de 0 € signifie que la prestation concernée est offerte. Les frais de retour peuvent être offerts ou varier selon le dossier ; aucun montant universel n’est prévu.',
          'La proposition indique sa période de validité. À défaut d’une indication claire, le client peut en demander confirmation avant de s’engager. Un changement de travaux, de pièces, de prix ou d’une condition essentielle après accord nécessite une nouvelle proposition et un nouvel accord exprès. L’atelier ne peut pas imposer unilatéralement un supplément.',
        ],
      },
      {
        id: 'choix-client',
        title: '5. Accord, refus et preuve du contrat',
        paragraphs: [
          'Le client peut accepter le devis de réparation, refuser les travaux et demander la restitution, ou accepter séparément une offre de rachat pour pièces lorsque cette option est proposée. Il vérifie le récapitulatif avant de confirmer. Pour une réparation payante, l’acceptation reconnaît expressément l’obligation de régler le prix convenu, même lorsque le paiement intervient ultérieurement.',
          'La réparation est commandée lors de l’acceptation expresse du devis encore valable. Cet accord n’autorise que les opérations et le prix convenus, sous réserve des règles de rétractation et d’exécution anticipée ci-dessous. En cas de refus, seules les prestations et les frais préalablement convenus peuvent rester dus ; le refus n’autorise pas le magasin à conserver définitivement ou à démonter l’appareil pour son propre compte.',
          'Le client reçoit ou peut conserver, sur support durable, la confirmation du contrat et les informations requises avant le début d’exécution, notamment le devis accepté, les CGV applicables et le formulaire de rétractation. Le site enregistre avec la décision la version et le texte des CGV applicables. Les échanges et enregistrements électroniques peuvent servir de preuve dans les conditions légales ; ils restent susceptibles de contestation.',
        ],
      },
      {
        id: 'retractation',
        title: '6. Droit de rétractation pour les contrats à distance',
        paragraphs: [
          'Lorsqu’un contrat de prestation est conclu à distance, le consommateur peut en principe se rétracter sans motif pendant quatorze jours à compter de sa conclusion. Pour une réparation, cette date correspond à l’acceptation du devis. Si une prestation payante de diagnostic est conclue séparément, elle possède sa propre date de conclusion et son propre délai. Le délai se calcule selon les règles légales ; un contrat conclu en magasin ne bénéficie pas automatiquement de ce droit.',
          'Avant l’expiration du délai, le client peut envoyer le formulaire figurant à la fin de ces CGV ou adresser une déclaration exprimant clairement sa décision par courriel à contact@reparapid.fr ou par courrier à VESTY GAMES 3, 30–30 bis avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre. Il précise ses coordonnées, la référence du dossier et le contrat concerné. Le formulaire n’est pas obligatoire et une lettre recommandée n’est pas imposée. Il est utile de conserver une preuve de la démarche.',
          'Le magasin examine la demande et traite ses conséquences légales sans conditionner la notification à son accord préalable. La démarche ne déclenche pas automatiquement une opération bancaire. Un défaut d’information sur la rétractation peut entraîner la prolongation du délai dans les conditions de l’article L. 221-20 du Code de la consommation.',
        ],
      },
      {
        id: 'execution-anticipee',
        title: '7. Commencer avant la fin des quatorze jours',
        paragraphs: [
          'Le client peut demander expressément que la prestation commence avant la fin du délai de rétractation. Cette demande est facultative et distincte de l’acceptation des CGV ou du devis. Il reconnaît alors que son droit de rétractation disparaîtra seulement lorsque la prestation aura été entièrement exécutée par le professionnel. Accepter le devis ou autoriser le début des travaux ne supprime pas immédiatement ce droit.',
          'Sans demande expresse de commencement anticipé, l’atelier attend l’expiration du délai applicable avant de commencer la prestation concernée. La demande et la reconnaissance du client doivent être conservées. L’urgence personnelle à récupérer une console ou l’envoi d’un colis ne constituent pas l’exception légale réservée à certaines réparations urgentes au domicile.',
          'Si le client se rétracte après un début d’exécution qu’il a expressément demandé et avant exécution complète, il peut devoir un montant proportionnel au service réellement fourni jusqu’à la notification, calculé sur le prix total convenu selon l’article L. 221-25. Aucune somme n’est due à ce titre lorsque la demande expresse n’a pas été recueillie ou que l’information légalement requise n’a pas été donnée. Il n’existe pas de pénalité forfaitaire de rétractation.',
        ],
      },
      {
        id: 'effets-retractation',
        title: '8. Conséquences de la rétractation',
        paragraphs: [
          'Une rétractation valablement exercée met fin au contrat concerné et aux contrats accessoires dans les conditions légales. Le magasin cesse les opérations restant à effectuer, organise avec le client la restitution de son appareil et précise les éventuelles sommes légalement exigibles. Les modalités du transport de restitution sont annoncées avant tout accord payant ; les CGV ne créent pas un forfait de retour automatique en cas de rétractation.',
          'Les sommes à rembourser sont restituées dans le délai légal, en principe au plus tard quatorze jours après l’information de la décision de rétractation. Le même moyen de paiement est utilisé, sauf accord exprès pour un autre moyen sans frais pour le client. La part de prestation légalement due après exécution anticipée est traitée conformément à l’article L. 221-25, sans priver le client du reste de son remboursement.',
        ],
      },
      {
        id: 'reparation-pieces',
        title: '9. Réparation et pièces',
        paragraphs: [
          'L’atelier réalise les travaux convenus et les contrôles adaptés. Le devis précise, lorsque cela est utile, la nature des pièces proposées, notamment leur caractère neuf ou issu du réemploi et leur compatibilité. Une substitution qui modifie une caractéristique convenue nécessite l’information et l’accord du client. L’atelier ne se présente pas comme réparateur agréé d’un fabricant sans habilitation correspondante.',
          'Une pièce apportée par le client doit être identifiée séparément d’une pièce fournie par l’atelier. Le magasin explique avant intervention les limites de compatibilité ou de qualité constatées et peut refuser un montage inadapté ou dangereux. L’acceptation d’une pièce client n’exonère pas le magasin d’un manquement dans son conseil ou dans son travail.',
          'Le sort des pièces remplacées est convenu avec le client avant leur réemploi ou leur élimination, sous réserve d’un échange standard accepté et des règles applicables aux déchets. Une autorisation de réparation ne constitue pas une cession générale des composants ou accessoires de l’appareil.',
        ],
      },
      {
        id: 'delais',
        title: '10. Délais et difficultés d’exécution',
        paragraphs: [
          'Le délai contractuel est celui indiqué au devis ou dans l’accord particulier. Les annonces générales de rapidité concernent les opérations qu’elles décrivent et ne dispensent pas l’atelier de préciser un délai adapté au dossier ; le transport s’ajoute lorsqu’il est identifié comme tel. À défaut de date ou de délai convenu, la prestation doit être fournie sans retard injustifié et au plus tard trente jours après la conclusion du contrat, selon l’article L. 216-1.',
          'En cas de retard prévisible, de pièce indisponible, de difficulté technique ou d’impossibilité de réaliser les travaux convenus, le magasin informe le client et lui présente les solutions envisageables. Un nouveau délai ou des travaux différents ne peuvent pas être imposés par une clause de prolongation illimitée. Les droits du consommateur ne sont pas suspendus par une simple mise à jour du statut.',
          'En cas de manquement au délai, le client dispose des recours légaux, notamment la suspension du paiement dans les conditions prévues par la loi et la résolution après un délai supplémentaire raisonnable resté sans effet. La résolution peut être immédiate dans les cas légaux, notamment un refus d’exécuter ou le non-respect d’une date essentielle. Lorsqu’elle intervient selon l’article L. 216-6, les sommes versées sont remboursées au plus tard dans les quatorze jours prévus par l’article L. 216-7, sans préjudice d’une indemnisation éventuelle.',
        ],
      },
      {
        id: 'paiement',
        title: '11. Paiement et justificatifs',
        paragraphs: [
          'Le formulaire de demande et l’acceptation du devis n’effectuent aucun encaissement automatique. Le prix de réparation est réglé selon les moyens, l’échéance et les instructions communiqués par le magasin et convenus avec le client. La facture ou le justificatif remis distingue les opérations concernées ; les coûts internes de l’atelier ne remplacent pas le prix TTC du devis accepté.',
          'Lorsque le dossier prévoit un retour payant par virement, le montant et les instructions sont accessibles au client concerné. Le client peut déclarer son virement, mais seule la vérification du magasin confirme la réception effective. Si les frais sont de 0 €, aucun virement de retour n’est demandé. Les frais de retour, le paiement d’une réparation et le prix d’un rachat pour pièces sont des opérations distinctes.',
          'Une erreur, un doublon ou un paiement contesté doit être signalé avec la référence utile, sans transmettre de mot de passe ni de numéro complet de carte bancaire. Le magasin vérifie la situation et corrige les montants indûment perçus. Aucun service payant ni majoration non annoncé et non accepté ne peut être ajouté par la seule publication d’un statut.',
        ],
      },
      {
        id: 'restitution-transport',
        title: '12. Retrait, retour et transport',
        paragraphs: [
          'Après une réparation terminée, le client choisit depuis son espace le retrait en magasin ou l’envoi à l’adresse qu’il confirme. Cet envoi est inclus, sans frais supplémentaires de livraison pour le client. Le magasin confirme la remise sur place ou renseigne le suivi de l’expédition. Cette inclusion ne concerne pas les frais de retour préalablement convenus après refus du devis ou diagnostic irréparable.',
          'Lorsque l’appareil est prêt ou que le client demande sa restitution, les parties conviennent d’un retrait en magasin ou d’un retour. Le client vérifie l’adresse et les modalités. Le prix et les conditions d’un transport organisé par le magasin sont acceptés avant la facturation et l’expédition ; la gratuité éventuelle est mentionnée explicitement.',
          'Pour un retour payant convenu, l’expédition est organisée après confirmation de réception des frais par le magasin, sauf accord différent ou droit impératif applicable. Un retard de confirmation doit pouvoir être signalé et vérifié. L’appareil reste la propriété du client tant qu’aucune cession distincte n’a été valablement convenue. Toute rétention suppose que ses conditions légales soient réunies ; elle ne peut servir à imposer une somme non due.',
          'Le magasin demeure responsable des obligations qu’il assume dans le contrat à distance, y compris lorsqu’il confie leur exécution à un prestataire, sous les causes légales d’exonération. Les risques du transport ne sont pas systématiquement transférés au client dès la remise au transporteur ; les règles légales applicables au mode d’acheminement et à sa commande restent réservées.',
          'À réception, le client est invité à vérifier le colis et l’appareil, à signaler rapidement une anomalie et à conserver les éléments utiles. Des réserves précises auprès du transporteur peuvent faciliter les démarches. L’absence de réserves immédiates ou le dépassement d’un délai de signalement conseillé ne suppriment pas, à eux seuls, les droits légaux du client contre le magasin.',
        ],
      },
      {
        id: 'irreparable-rachat',
        title: '13. Appareil irréparable et rachat pour pièces',
        paragraphs: [
          'Si l’appareil ne peut pas être réparé dans les conditions envisagées, le magasin expose au client la conclusion utile du diagnostic et les options disponibles. Le client peut demander sa restitution, avec les seuls coûts d’examen ou de retour préalablement convenus. Le caractère irréparable ne transfère pas la propriété au magasin.',
          'Une éventuelle offre de rachat pour pièces est une opération distincte de la réparation. Elle doit identifier l’appareil et les éléments cédés, son état, le prix offert, les modalités de paiement et le moment du transfert de propriété. Le client reste libre de la refuser. Son accord exprès est nécessaire ; un refus de devis, une absence de réponse ou une demande de retour ne valent pas acceptation du rachat.',
          'Avant une cession, le client sauvegarde ses contenus et retire ses comptes et supports personnels lorsque cela est possible. Le magasin et le client conviennent du traitement nécessaire si l’état de l’appareil empêche ces opérations. La cession du matériel ne cède pas les comptes, licences personnelles ou données du client. Les obligations d’identification et de traçabilité légalement applicables aux biens d’occasion demeurent à la charge des parties concernées.',
        ],
      },
      {
        id: 'garanties-responsabilite',
        title: '14. Qualité de la prestation, garanties et responsabilité',
        paragraphs: [
          'Le magasin répond de la bonne exécution des prestations convenues dans les conditions légales. Un diagnostic erroné, une mauvaise exécution des travaux ou un dommage imputable à sa garde ou à son intervention peut engager sa responsabilité. La constatation d’une panne différente ne suffit pas, à elle seule, à établir qu’elle lui est imputable ; elle doit être examinée au regard des circonstances et des règles de preuve applicables.',
          'Le client qui constate un défaut peut contacter l’atelier afin qu’il examine la situation et propose la solution légalement appropriée. Selon les conditions légales, ses recours peuvent comprendre une exécution correcte, une réduction du prix, une résolution et une indemnisation. Les CGV ne plafonnent pas par principe sa réparation au seul prix payé et ne l’obligent pas à renoncer aux autres recours pour demander un examen.',
          'Une réparation indépendante ne bénéficie pas automatiquement du même régime qu’une vente d’appareil. La garantie légale de conformité peut notamment concerner les pièces qui constituent l’objet principal d’un contrat ou font l’objet d’une vente distincte ; elle ne s’applique pas automatiquement aux fournitures seulement accessoires à une prestation. Les autres droits légaux, dont la garantie des vices cachés lorsqu’elle s’applique, sont préservés. La qualification dépend de l’opération réellement convenue.',
          'Aucune durée de garantie commerciale générale n’est créée par ces CGV. Si le magasin propose une garantie commerciale pour une intervention ou une pièce, un document en précise le contenu, la durée, les modalités, le garant et les limites permises, sans réduire les garanties et droits légaux. Les risques identifiés avant intervention, tels qu’une oxydation ou une fragilité préexistante, doivent être expliqués précisément ; ils ne justifient pas une exonération globale pour tout dommage.',
        ],
      },
      {
        id: 'donnees-appareil',
        title: '15. Données, comptes et confidentialité de l’appareil',
        paragraphs: [
          'Avant l’envoi, le client effectue autant que possible une sauvegarde de ses données et sauvegardes de jeux, retire les supports non nécessaires et déconnecte les comptes sensibles. Il avertit l’atelier si l’appareil ne permet pas ces opérations. La récupération, la copie ou la conservation des données n’est pas une prestation incluse sans accord particulier.',
          'Certaines interventions peuvent nécessiter une réinitialisation, une mise à jour ou un remplacement de stockage. L’atelier informe le client des conséquences prévisibles et recueille l’accord requis avant ces opérations. Il limite l’accès aux contenus à ce qui est nécessaire aux opérations autorisées et ne doit pas exploiter les données ou comptes pour une autre finalité.',
          'Le conseil de sauvegarder ne dispense pas le magasin de ses propres obligations de prudence, de confidentialité et de sécurité. Aucune clause n’exclut sa responsabilité pour toute perte de données indépendamment de sa cause. Les demandes concernant les données du compte et des dossiers peuvent être adressées à contact@reparapid.fr ; les principes d’information et les droits sont aussi rappelés dans les CGU et les mentions légales.',
        ],
      },
      {
        id: 'objets-non-reclames',
        title: '16. Appareil non réclamé',
        paragraphs: [
          'Le client organise le retrait ou le retour de son appareil et garde ses coordonnées à jour. En l’absence de réponse, le magasin peut le relancer et conserver une trace de ses démarches. Aucun frais de garde automatique n’est fixé par les présentes CGV ; un éventuel service de garde payant doit faire l’objet de conditions préalablement communiquées et valablement convenues.',
          'L’absence de réponse ou de retrait pendant trente ou quatre-vingt-dix jours ne permet pas au magasin de s’approprier, de revendre ou de détruire librement la console. Les objets confiés pour réparation et non retirés relèvent notamment de la loi du 31 décembre 1903 : pour les objets concernés, le délai général est d’un an et la vente suppose la procédure et l’autorisation judiciaires prévues par cette loi. Un rachat ou une cession volontaire reste un accord séparé et exprès.',
        ],
      },
      {
        id: 'reclamations-mediation',
        title: '17. Réclamations et médiation de la consommation',
        paragraphs: [
          'Le client peut adresser sa réclamation, en indiquant la référence du dossier et la solution recherchée, à contact@reparapid.fr ou à VESTY GAMES 3 — Maxxi Games, 30–30 bis avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre. Le magasin examine les éléments transmis et répond par un moyen adapté. Cette démarche ne limite pas les recours légaux.',
          'Le consommateur dispose du droit de recourir gratuitement à un médiateur de la consommation pour les litiges éligibles, après avoir tenté de résoudre le différend par une réclamation écrite auprès du professionnel, dans les conditions des articles L. 612-1 et suivants du Code de la consommation. Le recours au médiateur ne peut pas être imposé comme une renonciation à saisir le juge.',
          'Information à compléter par Maxxi Games : nom du médiateur de la consommation effectivement choisi, adresse postale et adresse de son site internet. Aucun médiateur n’est actuellement renseigné. L’obligation de désigner un dispositif compétent et de communiquer ses coordonnées reste à la charge de VESTY GAMES 3 ; la présente indication ne remplace pas ces coordonnées et ne vaut pas adhésion à un organisme.',
        ],
      },
      {
        id: 'droit-litiges',
        title: '18. Droit applicable, tribunaux et version',
        paragraphs: [
          'Le contrat est soumis au droit français, sans priver le consommateur des dispositions impératives qui lui sont applicables. Le consommateur peut saisir les juridictions compétentes selon les règles légales, notamment celles prévues par l’article R. 631-3 du Code de la consommation. Aucune compétence exclusive des tribunaux de Paris, de Créteil ou du siège du professionnel ne lui est imposée.',
          'Si une stipulation est déclarée inapplicable ou abusive, elle ne lie pas le consommateur dans les conditions prévues par la loi ; les autres stipulations subsistent lorsque le contrat peut être maintenu. Les droits impératifs s’appliquent même s’ils ne sont pas reproduits dans ce document.',
          'La version applicable est celle remise et acceptée lors de l’engagement concerné. Une mise à jour ne modifie pas rétroactivement un devis accepté. Les règles futures ou encore en cours de transposition ne constituent pas une garantie commerciale supplémentaire créée par ces CGV.',
        ],
      },
      {
        id: 'formulaire-retractation',
        title: '19. Formulaire de rétractation à conserver',
        paragraphs: WITHDRAWAL_TEMPLATE.split('\n\n'),
      },
    ],
  },
  mentions: {
    title: 'Mentions légales',
    intro: 'RépaRapid est un service édité et exploité par VESTY GAMES 3 sous l’enseigne Maxxi Games. Cette page identifie le professionnel et les contacts utiles. Les informations expressément signalées comme restant à compléter doivent être renseignées par l’exploitant ; elles ne sont pas remplacées par une donnée supposée.',
    sections: [
      {
        id: 'editeur',
        title: '1. Éditeur et exploitant',
        paragraphs: [
          'Dénomination : VESTY GAMES 3. Forme juridique : société à responsabilité limitée (SARL). Enseigne : Maxxi Games. Service : RépaRapid.',
          'SIREN : 799 620 570. SIRET : 799 620 570 00017. Immatriculation : RCS Créteil 799 620 570. Adresse : 30–30 bis avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre, France.',
          'Contact : contact@reparapid.fr — téléphone : 01 58 46 82 51. Adresse habituelle d’envoi des consoles : 30 bis avenue de Fontainebleau, 94270 Le Kremlin-Bicêtre, sous réserve de la confirmation et des instructions figurant dans le dossier avant l’expédition.',
          'Informations à compléter par VESTY GAMES 3 : montant du capital social et, si applicable, numéro individuel d’identification à la TVA. Ces éléments ne sont pas présumés à partir des autres identifiants.',
        ],
      },
      {
        id: 'publication',
        title: '2. Direction de la publication',
        paragraphs: [
          'La publication est placée sous la responsabilité du représentant légal de VESTY GAMES 3. Son nom et sa qualité précise sont des informations à compléter par la société ; aucun nom de personne physique non confirmé n’est publié ici.',
        ],
      },
      {
        id: 'hebergement',
        title: '3. Hébergement de cette application',
        paragraphs: [
          'Cette application RépaRapid est hébergée au moyen des services Cloudflare Workers et D1 de Cloudflare, Inc., 101 Townsend Street, San Francisco, California 94107, États-Unis. Contact public : +1 888 993 5273. Site : https://www.cloudflare.com/.',
          'Cette indication concerne l’application de demande et de suivi de réparation ; elle ne prétend pas identifier l’hébergement de tout autre site exploitant le nom RépaRapid. Les conditions de traitement et les éventuels transferts de données doivent être décrits par l’exploitant dans son information sur la protection des données.',
        ],
      },
      {
        id: 'contacts-droits',
        title: '4. Contact, réclamations et données personnelles',
        paragraphs: [
          'Pour une question sur le service, un dossier, un contenu publié ou une réclamation, écrire à contact@reparapid.fr ou à l’adresse postale de VESTY GAMES 3. Une référence de dossier facilite le traitement ; aucun mot de passe, code de connexion ou numéro complet de carte bancaire ne doit être transmis.',
          'VESTY GAMES 3 est responsable des traitements liés au compte et aux demandes de réparation. Les personnes concernées peuvent exercer leurs droits dans les conditions du RGPD à la même adresse et saisir la CNIL sur https://www.cnil.fr/. Les CGU présentent les principales finalités et les contacts ; elles ne remplacent pas l’information complète sur les bases légales, destinataires, durées et transferts applicables à chaque traitement.',
        ],
      },
      {
        id: 'mediateur',
        title: '5. Médiation de la consommation : information à compléter',
        paragraphs: [
          'Information à compléter par Maxxi Games : nom, adresse postale et site internet du médiateur de la consommation effectivement choisi par VESTY GAMES 3. Aucun médiateur n’est actuellement renseigné dans cette application. Cette mention signale l’information manquante et ne remplace pas l’obligation de l’exploitant de désigner un médiateur compétent et de communiquer ses coordonnées.',
          'Le client peut adresser préalablement une réclamation écrite au magasin. Les CGV rappellent les principes de la médiation et les droits de recours, sans imposer de compétence territoriale exclusive au consommateur.',
        ],
      },
      {
        id: 'contenus-liens',
        title: '6. Contenus, marques et liens',
        paragraphs: [
          'Les contenus du site sont soumis aux droits de leurs titulaires et aux exceptions légales. Les marques et modèles cités restent la propriété de leurs titulaires. Aucun agrément constructeur ne résulte de leur citation. Les liens vers des sites tiers permettent de consulter les contenus de leurs éditeurs, qui définissent leurs propres conditions et informations de confidentialité.',
          'Une erreur peut être signalée au contact de l’exploitant. Les informations contractuelles propres à une prestation sont celles remises au client et convenues avec lui ; une modification de cette page ne modifie pas rétroactivement le contrat accepté.',
        ],
      },
    ],
  },
};

/** Primary references; informational only, never fetched while rendering a page. */
export const LEGAL_SOURCES = Object.freeze([
  { title: 'Code de la consommation : information avant le contrat (L221-5)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044563141/2026-07-23' },
  { title: 'Commande électronique et obligation de paiement (L221-14)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226854/' },
  { title: 'Confirmation du contrat sur support durable (L221-13)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044563210/' },
  { title: 'Délai de rétractation des prestations à distance (L221-18)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226842/' },
  { title: 'Rétractation en ligne depuis le 19 juin 2026 (L221-21)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053310520/' },
  { title: 'Modalités de la fonctionnalité de rétractation (D221-5)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053303365/' },
  { title: 'Commencement anticipé et montant proportionnel (L221-25)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044563179/' },
  { title: 'Exceptions au droit de rétractation (L221-28)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044563170/' },
  { title: 'DGCCRF : réparation et service après-vente', url: 'https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/le-service-apres-vente' },
  { title: 'Délais, résolution et remboursement (L216-1 à L216-8)', url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000032221247/' },
  { title: 'Coordonnées du médiateur de la consommation (R616-1)', url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032808378/' },
  { title: 'Loi du 31 décembre 1903 : objets confiés et non retirés', url: 'https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006071001/' },
  { title: 'CNIL : informer les personnes et protéger les données', url: 'https://www.cnil.fr/fr/passer-laction/rgpd-les-premieres-etapes' },
  { title: 'Service Public : état de la transposition du droit à la réparation', url: 'https://www.service-public.gouv.fr/particuliers/actualites/A19033' },
  { title: 'Cloudflare : identité et coordonnées officielles', url: 'https://www.cloudflare.com/policies/terms/' },
]);

/** A deterministic, self-contained text copy for downloads and accepted snapshots. */
export function legalDocumentText(kind) {
  if (!Object.hasOwn(LEGAL_DOCUMENTS, kind)) throw new RangeError('Document juridique inconnu.');
  const document = LEGAL_DOCUMENTS[kind];
  const operator = `${LEGAL_OPERATOR.legalName} — ${LEGAL_OPERATOR.legalForm} — enseigne ${LEGAL_OPERATOR.tradeName}\n${LEGAL_OPERATOR.registry} — SIRET ${LEGAL_OPERATOR.siret}\n${LEGAL_OPERATOR.address}\n${LEGAL_OPERATOR.email} — ${LEGAL_OPERATOR.phone}`;
  const sections = document.sections.map((section) => [
    section.title,
    ...section.paragraphs,
    ...(section.bullets ?? []).map((item) => `• ${item}`),
  ].join('\n\n'));
  return [document.title, `Version du ${LEGAL_VERSION}`, operator, document.intro, ...sections].join('\n\n');
}

export const LEGAL_CGV_TEXT = legalDocumentText('cgv');
