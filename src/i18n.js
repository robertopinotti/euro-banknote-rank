/**
 * Traduzioni dell'interfaccia.
 *
 * I testi dei dieci design stanno altrove (`design-texts.js`) perché sono
 * traduzioni ufficiali della BCE, generate da script: qui c'è solo ciò che è
 * stato scritto per questo sito.
 *
 * Chiavi con suffisso `Html` contengono marcatura e vanno inserite con
 * `innerHTML`; tutte le altre sono testo semplice. La distinzione è nel nome
 * apposta: sbagliarla è il modo classico di aprire un buco XSS, e così si vede
 * a colpo d'occhio quali stringhe finiscono nel DOM come marcatura.
 */

export const LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
];

export const DEFAULT_LANG = 'it';

const ECB_URL =
  'https://www.ecb.europa.eu/euro/banknotes/future_banknotes/html/design-proposals.en.html';

const REPO_URL = 'https://github.com/robertopinotti/euro-banknote-rank';

export const STRINGS = {
  /* ------------------------------------------------------------- italiano */
  it: {
    'meta.title': "Quale sarà la banconota più bella d'Europa?",
    'meta.description':
      'Vota a due a due le dieci proposte di design per le future banconote in euro e scopri la classifica calcolata con il modello Bradley–Terry.',

    'brand.title': "Banconota d'Europa",
    'brand.tagline': 'le 10 proposte per il futuro euro, una sfida alla volta',

    'nav.vote': 'Vota',
    'vote.title': 'Vota le banconote',
    'nav.ranking': 'Classifica',
    'nav.designs': 'Disegni',
    'nav.method': 'Metodo',

    'vote.hintHtml':
      'Si confrontano sempre <strong>due banconote dello stesso taglio</strong>, ' +
      'fronte e retro. Scegli quella che ti piace di più.',
    'vote.skip': 'Non saprei, passa oltre',
    'vote.countZero': 'Non hai ancora votato',
    'vote.countOne': 'Hai espresso 1 voto',
    'vote.countMany': 'Hai espresso {n} voti',
    'vote.kbdHtml':
      'Da tastiera: <kbd>←</kbd> o <kbd>→</kbd> per votare, <kbd>spazio</kbd> per saltare.',
    'side.front': 'fronte',
    'side.back': 'retro',

    'banner.notConfigured':
      'Backend non configurato: i voti restano in questo browser e la classifica è solo tua.',
    'banner.unreachable':
      'Backend non raggiungibile: i voti restano in questo browser finché il collegamento non torna.',
    'banner.voteFailed':
      'Il voto non è stato registrato: controlla la connessione e riprova.',
    'banner.stale':
      "Classifica non aggiornabile in questo momento: questa è l'ultima copia condivisa che il sito ha ricevuto. I voti che esprimi ora restano in questo browser.",

    'rank.title': 'Classifica',
    'scope.note': 'Per banconota',
    'rank.scopeLabel': 'Tipo di classifica',
    'scope.design': 'Per disegno',
    'rank.noteDesign':
      'I dieci disegni, ciascuno con la media delle sue sei banconote.',
    'rank.summaryNone': 'Nessun voto ancora. {mode}',
    'rank.summarySome': '{n} confronti raccolti. {mode}',
    'rank.modeShared': 'Classifica condivisa da tutti i votanti.',
    'rank.modeLocal':
      'Modalità locale: questa classifica conta solo i tuoi voti, salvati in questo browser.',
    'rank.modeStale': 'Ultima classifica condivisa ricevuta, non aggiornata in questo momento.',
    'rank.proposal': 'Disegno {letter}',
    'rank.proposalDenom': 'Disegno {letter} • {denom} €',
    'rank.showMore': 'Mostra altre {n}',

    'designs.title': 'Le dieci proposte',
    'designs.ledeHtml':
      'La BCE ha selezionato dieci proposte, cinque sul tema <em>cultura europea</em> ' +
      'e cinque sul tema <em>fiumi e uccelli</em>. Ogni proposta copre tutti e sei ' +
      'i tagli, da 5 a 200 euro, fronte e retro.',

    'themeName.culture': 'Cultura europea',
    'themeName.nature': 'Fiumi e uccelli',

    'alt.note': 'Disegno {letter}, banconota da {denom} euro, {side}',
    'vote.cardLabel': 'Vota il disegno {letter}, banconota da {denom} euro',
    'a11y.newChallenge': 'Nuova sfida: disegno {a} contro disegno {b}, banconota da {denom} euro',
    'a11y.skip': 'Vai al contenuto',

    'footer.theme': 'Tema',
    'theme.auto': 'Auto',
    'theme.light': 'Chiaro',
    'theme.dark': 'Scuro',
    'footer.language': 'Lingua',
    'footer.creditHtml':
      'Creato da Roberto Pinotti · ' +
      `<a href="${REPO_URL}" target="_blank" rel="noopener">codice sorgente su GitHub</a>`,
    'footer.attributionHtml':
      'Le immagini sono <strong>proposte di design</strong> per una possibile ' +
      'futura serie di banconote in euro. Fonte: Banca centrale europea — ' +
      `<a href="${ECB_URL}" target="_blank" rel="noopener">Future euro banknote design proposals</a>. ` +
      'Riprodotte a fini informativi. Progetto indipendente, senza alcun legame ' +
      "con la BCE o l'Eurosistema, né alcuna loro approvazione.",

    'method.title': 'Come si calcola la classifica',
    'method.bodyHtml': `
      <h2>Perché confronti a due</h2>
      <p>Chiedere un voto da 1 a 10 su sessanta immagini non funziona: ognuno usa
      la scala a modo suo, e chi vota per primo condiziona chi vota dopo. Un
      confronto fra due sole banconote è invece una domanda a cui tutti
      rispondono nello stesso modo. Il problema si sposta sul come mettere
      insieme migliaia di confronti sparsi in una classifica unica.</p>

      <h2>Il modello Bradley–Terry</h2>
      <p>A ogni design si associa una <em>forza</em> <code>p</code>, un numero
      positivo. La probabilità che il design <code>i</code> venga preferito al
      design <code>j</code> è</p>
      <p class="formula">P(i batte j) = p<sub>i</sub> / (p<sub>i</sub> + p<sub>j</sub>)</p>
      <p>Le forze non si osservano: si stimano cercando i valori che rendono più
      probabili i voti effettivamente raccolti. Il calcolo usa l'algoritmo MM di
      Hunter, che parte da forze tutte uguali e le aggiorna con</p>
      <p class="formula">p<sub>i</sub> &larr; W<sub>i</sub> / &Sigma;<sub>j&ne;i</sub> [ N<sub>ij</sub> / (p<sub>i</sub> + p<sub>j</sub>) ]</p>
      <p>dove <code>W<sub>i</sub></code> sono le vittorie totali di <code>i</code> e
      <code>N<sub>ij</sub></code> il numero di confronti fra <code>i</code> e
      <code>j</code>. Ogni passaggio migliora l'aderenza ai dati, e in poche
      decine di iterazioni il risultato è stabile.</p>
      <p>Il vantaggio rispetto alla semplice percentuale di vittorie è che il
      modello tiene conto di <em>chi</em> hai battuto: vincere contro il design
      più forte vale più che vincere contro l'ultimo in classifica. E il
      risultato non dipende dall'ordine in cui arrivano i voti — rimescolandoli
      la classifica resta identica.</p>

      <h2>Il punteggio mostrato</h2>
      <p>Le forze si leggono meglio sulla scala Elo, la stessa degli scacchi:</p>
      <p class="formula">R = 1500 + (400 / ln 10) &middot; ln p</p>
      <p>Così 1500 è il centro del campo e <strong>100 punti di distacco valgono
      circa il 64% di probabilità di vittoria</strong>, 400 punti valgono 10 a 1.
      Il punteggio va letto insieme al numero di confronti raccolti, scritto in
      cima alla classifica: con poche decine di voti le posizioni si ribaltano
      facilmente, e solo dopo qualche centinaio diventano stabili.</p>

      <h2>Chi ha ancora pochi voti</h2>
      <p>Un design che ha vinto i primi tre confronti avrebbe forza infinita: il
      modello, da solo, non saprebbe dove fermarsi. Si aggiungono quindi due
      confronti fittizi per design contro un avversario immaginario di forza
      media, uno vinto e uno perso. È poca cosa rispetto a centinaia di voti
      veri, ma basta a tenere tutti i punteggi finiti e a evitare che un design
      votato tre volte scavalchi uno votato trecento.</p>

      <h2>Dal singolo taglio alla proposta intera</h2>
      <p>Ogni taglio ha la sua classifica, calcolata solo con i confronti fra
      banconote di quel taglio. Il punteggio complessivo di una proposta è la
      media delle sue sei forze, calcolata sui logaritmi — è la scala in cui il
      modello è lineare, e impedisce che un singolo taglio molto forte trascini
      da solo tutta la famiglia.</p>

      <h2>Quali coppie ti vengono proposte</h2>
      <p>Non a caso puro. Il sito privilegia le coppie ancora poco votate e quelle
      fra design di forza simile, che sono le più informative: sapere come va a
      finire un confronto già scontato non aggiunge niente. La scelta resta
      comunque casuale con questi pesi, così votanti diversi non vedono tutti la
      stessa sfida.</p>

      <h2>Limiti, detti chiaramente</h2>
      <ul>
        <li>Il campione è chi capita su questo sito: non è rappresentativo della
        popolazione europea, e la classifica non va letta come un sondaggio.</li>
        <li>L'identificativo del votante sta nel browser. Frena i doppioni
        accidentali e gli script, non un votante determinato a insistere.</li>
        <li>Questo sito non ha alcun rapporto con la BCE e non influisce sulla
        scelta ufficiale. Per quella c'è
        <a href="${ECB_URL}" target="_blank" rel="noopener">il sondaggio della BCE</a>.</li>
      </ul>`,
  },

  /* -------------------------------------------------------------- inglese */
  en: {
    'meta.title': "Which will be Europe's most beautiful banknote?",
    'meta.description':
      'Vote two at a time on the ten design proposals for the future euro banknotes and see the ranking computed with the Bradley–Terry model.',

    'brand.title': 'Banknote of Europe',
    'brand.tagline': 'the 10 proposals for the future euro, one duel at a time',

    'nav.vote': 'Vote',
    'vote.title': 'Vote on the banknotes',
    'nav.ranking': 'Ranking',
    'nav.designs': 'Designs',
    'nav.method': 'Method',

    'vote.hintHtml':
      'You always compare <strong>two banknotes of the same denomination</strong>, ' +
      'front and back. Pick the one you like more.',
    'vote.skip': "Can't decide, skip this one",
    'vote.countZero': "You haven't voted yet",
    'vote.countOne': 'You have cast 1 vote',
    'vote.countMany': 'You have cast {n} votes',
    'vote.kbdHtml':
      'Keyboard: <kbd>←</kbd> or <kbd>→</kbd> to vote, <kbd>space</kbd> to skip.',
    'side.front': 'front',
    'side.back': 'reverse',

    'banner.notConfigured':
      'No backend configured: your votes stay in this browser and the ranking is yours alone.',
    'banner.unreachable':
      'Backend unreachable: your votes stay in this browser until the connection is back.',
    'banner.voteFailed':
      'Your vote was not recorded: check your connection and try again.',
    'banner.stale':
      'The ranking cannot be refreshed right now: this is the last shared copy the site received. Votes you cast now stay in this browser.',

    'rank.title': 'Ranking',
    'scope.note': 'By banknote',
    'rank.scopeLabel': 'Ranking type',
    'scope.design': 'By design',
    'rank.noteDesign':
      'The ten designs, each averaged across its six banknotes.',
    'rank.summaryNone': 'No votes yet. {mode}',
    'rank.summarySome': '{n} comparisons collected. {mode}',
    'rank.modeShared': 'Ranking shared by all voters.',
    'rank.modeLocal':
      'Local mode: this ranking counts only your own votes, stored in this browser.',
    'rank.modeStale': 'Last shared ranking received; not being refreshed right now.',
    'rank.proposal': 'Design {letter}',
    'rank.proposalDenom': 'Design {letter} • €{denom}',
    'rank.showMore': 'Show {n} more',

    'designs.title': 'The ten proposals',
    'designs.ledeHtml':
      'The ECB shortlisted ten proposals, five on the theme <em>European culture</em> ' +
      'and five on <em>rivers and birds</em>. Each proposal covers all six ' +
      'denominations, from €5 to €200, front and back.',

    'themeName.culture': 'European culture',
    'themeName.nature': 'Rivers and birds',

    'alt.note': 'Design {letter}, €{denom} banknote, {side}',
    'vote.cardLabel': 'Vote for design {letter}, {denom} euro banknote',
    'a11y.newChallenge': 'New pair: design {a} against design {b}, {denom} euro banknote',
    'a11y.skip': 'Skip to content',

    'footer.theme': 'Theme',
    'theme.auto': 'Auto',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'footer.language': 'Language',
    'footer.creditHtml':
      'Created by Roberto Pinotti · ' +
      `<a href="${REPO_URL}" target="_blank" rel="noopener">source code on GitHub</a>`,
    'footer.attributionHtml':
      'The images are <strong>design proposals</strong> for a possible future ' +
      'series of euro banknotes. Source: European Central Bank — ' +
      `<a href="${ECB_URL}" target="_blank" rel="noopener">Future euro banknote design proposals</a>. ` +
      'Reproduced for information purposes. Independent project, with no link to ' +
      'and no endorsement from the ECB or the Eurosystem.',

    'method.title': 'How the ranking is computed',
    'method.bodyHtml': `
      <h2>Why pairwise comparisons</h2>
      <p>Asking for a 1-to-10 score on sixty images does not work: everyone uses
      the scale differently, and whoever votes first anchors those who follow. A
      comparison between just two banknotes is instead a question everyone
      answers the same way. The problem shifts to combining thousands of
      scattered comparisons into a single ranking.</p>

      <h2>The Bradley–Terry model</h2>
      <p>Each design is given a <em>strength</em> <code>p</code>, a positive
      number. The probability that design <code>i</code> is preferred to design
      <code>j</code> is</p>
      <p class="formula">P(i beats j) = p<sub>i</sub> / (p<sub>i</sub> + p<sub>j</sub>)</p>
      <p>The strengths are not observed: they are estimated by looking for the
      values that make the votes actually collected most likely. The computation
      uses Hunter's MM algorithm, which starts from equal strengths and updates
      them with</p>
      <p class="formula">p<sub>i</sub> &larr; W<sub>i</sub> / &Sigma;<sub>j&ne;i</sub> [ N<sub>ij</sub> / (p<sub>i</sub> + p<sub>j</sub>) ]</p>
      <p>where <code>W<sub>i</sub></code> is the total number of wins of
      <code>i</code> and <code>N<sub>ij</sub></code> the number of comparisons
      between <code>i</code> and <code>j</code>. Every pass improves the fit to
      the data, and within a few dozen iterations the result is stable.</p>
      <p>The advantage over a plain win percentage is that the model accounts for
      <em>whom</em> you beat: beating the strongest design counts for more than
      beating the last one. And the result does not depend on the order the votes
      arrive in — reshuffle them and the ranking is identical.</p>

      <h2>The score on screen</h2>
      <p>Strengths read better on the Elo scale, the one used in chess:</p>
      <p class="formula">R = 1500 + (400 / ln 10) &middot; ln p</p>
      <p>So 1500 is the middle of the field and <strong>a 100-point gap is worth
      about a 64% chance of winning</strong>, while 400 points are worth 10 to 1.
      Read the score together with the number of comparisons shown at the top of
      the ranking: with a few dozen votes positions flip easily, and only after a
      few hundred do they settle.</p>

      <h2>Designs with few votes so far</h2>
      <p>A design that won its first three comparisons would have infinite
      strength: the model alone would not know where to stop. Two fictitious
      comparisons per design are therefore added, against an imaginary opponent
      of average strength — one won, one lost. It is little next to hundreds of
      real votes, but it keeps every score finite and stops a design voted three
      times from overtaking one voted three hundred.</p>

      <h2>From one denomination to the whole proposal</h2>
      <p>Each denomination has its own ranking, computed only from comparisons
      between banknotes of that denomination. A proposal's overall score is the
      average of its six strengths, taken on the logarithms — that is the scale
      on which the model is linear, and it prevents a single very strong
      denomination from carrying the whole family on its own.</p>

      <h2>Which pairs you are shown</h2>
      <p>Not purely at random. The site favours pairs with few votes so far and
      pairs between designs of similar strength, which are the most informative:
      learning the outcome of a foregone comparison adds nothing. The choice
      still stays random under those weights, so different voters do not all see
      the same duel.</p>

      <h2>Limits, stated plainly</h2>
      <ul>
        <li>The sample is whoever happens to land on this site: it is not
        representative of the European population, and the ranking should not be
        read as a survey.</li>
        <li>The voter identifier lives in the browser. It curbs accidental
        duplicates and scripts, not a voter determined to insist.</li>
        <li>This site has no relationship with the ECB and no influence on the
        official choice. For that there is
        <a href="${ECB_URL}" target="_blank" rel="noopener">the ECB's own survey</a>.</li>
      </ul>`,
  },

  /* ------------------------------------------------------------- francese */
  fr: {
    'meta.title': "Quel sera le plus beau billet d'Europe ?",
    'meta.description':
      'Votez deux par deux sur les dix propositions de graphisme des futurs billets en euros et découvrez le classement calculé avec le modèle de Bradley–Terry.',

    'brand.title': "Billet d'Europe",
    'brand.tagline': "les 10 propositions pour le futur euro, un duel à la fois",

    'nav.vote': 'Voter',
    'vote.title': 'Votez pour les billets',
    'nav.ranking': 'Classement',
    'nav.designs': 'Graphismes',
    'nav.method': 'Méthode',

    'vote.hintHtml':
      'On compare toujours <strong>deux billets de la même coupure</strong>, ' +
      'recto et verso. Choisissez celui qui vous plaît le plus.',
    'vote.skip': 'Je ne sais pas, passer',
    'vote.countZero': "Vous n'avez pas encore voté",
    'vote.countOne': 'Vous avez exprimé 1 vote',
    'vote.countMany': 'Vous avez exprimé {n} votes',
    'vote.kbdHtml':
      'Au clavier : <kbd>←</kbd> ou <kbd>→</kbd> pour voter, <kbd>espace</kbd> pour passer.',
    'side.front': 'recto',
    'side.back': 'verso',

    'banner.notConfigured':
      "Aucun serveur configuré : vos votes restent dans ce navigateur et le classement n'est que le vôtre.",
    'banner.unreachable':
      'Serveur injoignable : vos votes restent dans ce navigateur en attendant le retour de la connexion.',
    'banner.voteFailed':
      "Votre vote n'a pas été enregistré : vérifiez votre connexion et réessayez.",
    'banner.stale':
      "Le classement ne peut pas être actualisé pour le moment : voici la dernière copie partagée reçue par le site. Les votes exprimés maintenant restent dans ce navigateur.",

    'rank.title': 'Classement',
    'scope.note': 'Par billet',
    'rank.scopeLabel': 'Type de classement',
    'scope.design': 'Par graphisme',
    'rank.noteDesign':
      'Les dix graphismes, chacun avec la moyenne de ses six billets.',
    'rank.summaryNone': 'Aucun vote pour le moment. {mode}',
    'rank.summarySome': '{n} comparaisons recueillies. {mode}',
    'rank.modeShared': 'Classement partagé par tous les votants.',
    'rank.modeLocal':
      'Mode local : ce classement ne compte que vos propres votes, enregistrés dans ce navigateur.',
    'rank.modeStale': 'Dernier classement partagé reçu ; pas actualisé pour le moment.',
    'rank.proposal': 'Graphisme {letter}',
    'rank.proposalDenom': 'Graphisme {letter} • {denom} €',
    'rank.showMore': 'Afficher {n} de plus',

    'designs.title': 'Les dix propositions',
    'designs.ledeHtml':
      'La BCE a retenu dix propositions, cinq sur le thème <em>culture européenne</em> ' +
      'et cinq sur <em>fleuves et oiseaux</em>. Chaque proposition couvre les six ' +
      'coupures, de 5 à 200 euros, recto et verso.',

    'themeName.culture': 'Culture européenne',
    'themeName.nature': 'Fleuves et oiseaux',

    'alt.note': 'Graphisme {letter}, billet de {denom} euros, {side}',
    'vote.cardLabel': 'Voter pour le graphisme {letter}, billet de {denom} euros',
    'a11y.newChallenge': 'Nouveau duel : graphisme {a} contre graphisme {b}, billet de {denom} euros',
    'a11y.skip': 'Aller au contenu',

    'footer.theme': 'Thème',
    'theme.auto': 'Auto',
    'theme.light': 'Clair',
    'theme.dark': 'Sombre',
    'footer.language': 'Langue',
    'footer.creditHtml':
      'Créé par Roberto Pinotti · ' +
      `<a href="${REPO_URL}" target="_blank" rel="noopener">code source sur GitHub</a>`,
    'footer.attributionHtml':
      'Les images sont des <strong>propositions de graphisme</strong> pour une ' +
      'éventuelle future série de billets en euros. Source : Banque centrale ' +
      `européenne — <a href="${ECB_URL}" target="_blank" rel="noopener">Future euro banknote design proposals</a>. ` +
      "Reproduites à titre d'information. Projet indépendant, sans aucun lien " +
      "avec la BCE ou l'Eurosystème, ni aucune approbation de leur part.",

    'method.title': 'Comment le classement est calculé',
    'method.bodyHtml': `
      <h2>Pourquoi des comparaisons deux à deux</h2>
      <p>Demander une note de 1 à 10 sur soixante images ne fonctionne pas :
      chacun se sert de l'échelle à sa façon, et les premiers votants influencent
      les suivants. Une comparaison entre deux billets seulement est en revanche
      une question à laquelle tout le monde répond de la même manière. Le
      problème se déplace : il faut réunir des milliers de comparaisons éparses
      en un classement unique.</p>

      <h2>Le modèle de Bradley–Terry</h2>
      <p>À chaque graphisme est associée une <em>force</em> <code>p</code>, un
      nombre positif. La probabilité que le graphisme <code>i</code> soit préféré
      au graphisme <code>j</code> vaut</p>
      <p class="formula">P(i bat j) = p<sub>i</sub> / (p<sub>i</sub> + p<sub>j</sub>)</p>
      <p>Les forces ne s'observent pas : on les estime en cherchant les valeurs
      qui rendent les votes effectivement recueillis les plus probables. Le calcul
      utilise l'algorithme MM de Hunter, qui part de forces toutes égales et les
      met à jour par</p>
      <p class="formula">p<sub>i</sub> &larr; W<sub>i</sub> / &Sigma;<sub>j&ne;i</sub> [ N<sub>ij</sub> / (p<sub>i</sub> + p<sub>j</sub>) ]</p>
      <p>où <code>W<sub>i</sub></code> est le nombre total de victoires de
      <code>i</code> et <code>N<sub>ij</sub></code> le nombre de comparaisons
      entre <code>i</code> et <code>j</code>. Chaque passage améliore l'ajustement
      aux données, et en quelques dizaines d'itérations le résultat est stable.</p>
      <p>L'avantage sur un simple pourcentage de victoires : le modèle tient
      compte de <em>qui</em> vous avez battu. Battre le graphisme le plus fort
      vaut davantage que battre le dernier du classement. Et le résultat ne
      dépend pas de l'ordre d'arrivée des votes — mélangez-les, le classement
      reste identique.</p>

      <h2>Le score affiché</h2>
      <p>Les forces se lisent mieux sur l'échelle Elo, celle des échecs :</p>
      <p class="formula">R = 1500 + (400 / ln 10) &middot; ln p</p>
      <p>1500 est ainsi le centre du peloton et <strong>100 points d'écart valent
      environ 64 % de chances de l'emporter</strong>, 400 points valent 10 contre
      1. Le score se lit avec le nombre de comparaisons indiqué en haut du
      classement : avec quelques dizaines de votes les positions basculent
      facilement, et elles ne se stabilisent qu'après quelques centaines.</p>

      <h2>Ceux qui ont encore peu de votes</h2>
      <p>Un graphisme ayant gagné ses trois premières comparaisons aurait une
      force infinie : le modèle seul ne saurait pas où s'arrêter. On ajoute donc
      deux comparaisons fictives par graphisme, contre un adversaire imaginaire
      de force moyenne — une gagnée, une perdue. C'est peu de chose face à des
      centaines de votes réels, mais cela suffit à garder tous les scores finis
      et à éviter qu'un graphisme voté trois fois ne dépasse un graphisme voté
      trois cents fois.</p>

      <h2>De la coupure à la proposition entière</h2>
      <p>Chaque coupure a son classement, calculé uniquement à partir des
      comparaisons entre billets de cette coupure. Le score global d'une
      proposition est la moyenne de ses six forces, prise sur les logarithmes —
      c'est l'échelle sur laquelle le modèle est linéaire, et cela empêche
      qu'une seule coupure très forte n'entraîne à elle seule toute la famille.</p>

      <h2>Quelles paires vous sont proposées</h2>
      <p>Pas au pur hasard. Le site privilégie les paires encore peu votées et
      celles entre graphismes de force voisine, les plus informatives : connaître
      l'issue d'une comparaison jouée d'avance n'apporte rien. Le choix reste
      néanmoins aléatoire sous ces poids, de sorte que les votants ne voient pas
      tous le même duel.</p>

      <h2>Limites, dites clairement</h2>
      <ul>
        <li>L'échantillon, c'est qui passe sur ce site : il n'est pas
        représentatif de la population européenne, et le classement ne doit pas
        se lire comme un sondage.</li>
        <li>L'identifiant du votant réside dans le navigateur. Il freine les
        doublons accidentels et les scripts, pas un votant décidé à insister.</li>
        <li>Ce site n'a aucun rapport avec la BCE et n'influe pas sur le choix
        officiel. Pour cela, il y a
        <a href="${ECB_URL}" target="_blank" rel="noopener">l'enquête de la BCE</a>.</li>
      </ul>`,
  },

  /* -------------------------------------------------------------- tedesco */
  de: {
    'meta.title': 'Welche wird Europas schönste Banknote?',
    'meta.description':
      'Stimmen Sie paarweise über die zehn Gestaltungsvorschläge für die künftigen Euro-Banknoten ab und sehen Sie die mit dem Bradley–Terry-Modell berechnete Rangliste.',

    'brand.title': 'Banknote Europas',
    'brand.tagline': 'die 10 Vorschläge für den künftigen Euro, ein Duell nach dem anderen',

    'nav.vote': 'Abstimmen',
    'vote.title': 'Über die Banknoten abstimmen',
    'nav.ranking': 'Rangliste',
    'nav.designs': 'Entwürfe',
    'nav.method': 'Methode',

    'vote.hintHtml':
      'Verglichen werden immer <strong>zwei Banknoten derselben Stückelung</strong>, ' +
      'Vorder- und Rückseite. Wählen Sie die, die Ihnen besser gefällt.',
    'vote.skip': 'Unentschieden, überspringen',
    'vote.countZero': 'Sie haben noch nicht abgestimmt',
    'vote.countOne': 'Sie haben 1 Stimme abgegeben',
    'vote.countMany': 'Sie haben {n} Stimmen abgegeben',
    'vote.kbdHtml':
      'Tastatur: <kbd>←</kbd> oder <kbd>→</kbd> zum Abstimmen, <kbd>Leertaste</kbd> zum Überspringen.',
    'side.front': 'Vorderseite',
    'side.back': 'Rückseite',

    'banner.notConfigured':
      'Kein Backend konfiguriert: Ihre Stimmen bleiben in diesem Browser, die Rangliste ist nur Ihre eigene.',
    'banner.unreachable':
      'Backend nicht erreichbar: Ihre Stimmen bleiben in diesem Browser, bis die Verbindung zurück ist.',
    'banner.voteFailed':
      'Ihre Stimme wurde nicht gespeichert: Prüfen Sie die Verbindung und versuchen Sie es erneut.',
    'banner.stale':
      'Die Rangliste kann gerade nicht aktualisiert werden: Dies ist die letzte gemeinsame Fassung, die die Website erhalten hat. Ihre jetzigen Stimmen bleiben in diesem Browser.',

    'rank.title': 'Rangliste',
    'scope.note': 'Nach Banknote',
    'rank.scopeLabel': 'Art der Rangliste',
    'scope.design': 'Nach Design',
    'rank.noteDesign':
      'Die zehn Designs, jeweils als Mittel ihrer sechs Banknoten.',
    'rank.summaryNone': 'Noch keine Stimmen. {mode}',
    'rank.summarySome': '{n} Vergleiche gesammelt. {mode}',
    'rank.modeShared': 'Rangliste, die alle Abstimmenden teilen.',
    'rank.modeLocal':
      'Lokaler Modus: Diese Rangliste zählt nur Ihre eigenen, in diesem Browser gespeicherten Stimmen.',
    'rank.modeStale': 'Zuletzt empfangene gemeinsame Rangliste; derzeit nicht aktualisiert.',
    'rank.proposal': 'Design {letter}',
    'rank.proposalDenom': 'Design {letter} • {denom} €',
    'rank.showMore': 'Weitere {n} anzeigen',

    'designs.title': 'Die zehn Vorschläge',
    'designs.ledeHtml':
      'Die EZB hat zehn Vorschläge ausgewählt, fünf zum Thema <em>europäische Kultur</em> ' +
      'und fünf zu <em>Flüsse und Vögel</em>. Jeder Vorschlag deckt alle sechs ' +
      'Stückelungen ab, von 5 bis 200 Euro, Vorder- und Rückseite.',

    'themeName.culture': 'Europäische Kultur',
    'themeName.nature': 'Flüsse und Vögel',

    'alt.note': 'Design {letter}, {denom}-Euro-Banknote, {side}',
    'vote.cardLabel': 'Für Design {letter} stimmen, {denom}-Euro-Banknote',
    'a11y.newChallenge': 'Neues Duell: Design {a} gegen Design {b}, {denom}-Euro-Banknote',
    'a11y.skip': 'Zum Inhalt springen',

    'footer.theme': 'Darstellung',
    'theme.auto': 'Auto',
    'theme.light': 'Hell',
    'theme.dark': 'Dunkel',
    'footer.language': 'Sprache',
    'footer.creditHtml':
      'Erstellt von Roberto Pinotti · ' +
      `<a href="${REPO_URL}" target="_blank" rel="noopener">Quellcode auf GitHub</a>`,
    'footer.attributionHtml':
      'Die Abbildungen sind <strong>Gestaltungsvorschläge</strong> für eine ' +
      'mögliche künftige Euro-Banknotenserie. Quelle: Europäische Zentralbank — ' +
      `<a href="${ECB_URL}" target="_blank" rel="noopener">Future euro banknote design proposals</a>. ` +
      'Wiedergabe zu Informationszwecken. Unabhängiges Projekt, ohne Verbindung ' +
      'zur EZB oder zum Eurosystem und ohne deren Billigung.',

    'method.title': 'Wie die Rangliste berechnet wird',
    'method.bodyHtml': `
      <h2>Warum paarweise Vergleiche</h2>
      <p>Eine Note von 1 bis 10 für sechzig Bilder zu verlangen funktioniert
      nicht: Jeder nutzt die Skala anders, und wer zuerst abstimmt, prägt die
      Späteren. Ein Vergleich zwischen nur zwei Banknoten ist dagegen eine Frage,
      die alle auf dieselbe Weise beantworten. Das Problem verschiebt sich darauf,
      Tausende verstreuter Vergleiche zu einer einzigen Rangliste zu fügen.</p>

      <h2>Das Bradley–Terry-Modell</h2>
      <p>Jedem Entwurf wird eine <em>Stärke</em> <code>p</code> zugeordnet, eine
      positive Zahl. Die Wahrscheinlichkeit, dass Entwurf <code>i</code> dem
      Entwurf <code>j</code> vorgezogen wird, ist</p>
      <p class="formula">P(i schlägt j) = p<sub>i</sub> / (p<sub>i</sub> + p<sub>j</sub>)</p>
      <p>Die Stärken sind nicht beobachtbar: Man schätzt sie, indem man die Werte
      sucht, unter denen die tatsächlich gesammelten Stimmen am wahrscheinlichsten
      sind. Die Berechnung nutzt Hunters MM-Algorithmus, der bei lauter gleichen
      Stärken beginnt und sie fortschreibt mit</p>
      <p class="formula">p<sub>i</sub> &larr; W<sub>i</sub> / &Sigma;<sub>j&ne;i</sub> [ N<sub>ij</sub> / (p<sub>i</sub> + p<sub>j</sub>) ]</p>
      <p>wobei <code>W<sub>i</sub></code> die Gesamtzahl der Siege von
      <code>i</code> ist und <code>N<sub>ij</sub></code> die Zahl der Vergleiche
      zwischen <code>i</code> und <code>j</code>. Jeder Durchgang verbessert die
      Anpassung an die Daten, und nach wenigen Dutzend Iterationen ist das
      Ergebnis stabil.</p>
      <p>Der Vorteil gegenüber einem bloßen Sieganteil: Das Modell berücksichtigt,
      <em>wen</em> man geschlagen hat. Den stärksten Entwurf zu schlagen zählt
      mehr als den letzten der Rangliste. Und das Ergebnis hängt nicht von der
      Reihenfolge der Stimmen ab — mischt man sie, bleibt die Rangliste
      dieselbe.</p>

      <h2>Die angezeigte Punktzahl</h2>
      <p>Stärken liest man besser auf der Elo-Skala, derselben wie im Schach:</p>
      <p class="formula">R = 1500 + (400 / ln 10) &middot; ln p</p>
      <p>1500 ist damit die Mitte des Feldes, und <strong>100 Punkte Abstand
      entsprechen rund 64 % Siegwahrscheinlichkeit</strong>, 400 Punkte
      entsprechen 10 zu 1. Die Punktzahl ist zusammen mit der Zahl der oben
      angezeigten Vergleiche zu lesen: Bei einigen Dutzend Stimmen kippen die
      Platzierungen leicht, erst nach einigen Hundert werden sie stabil.</p>

      <h2>Entwürfe mit noch wenigen Stimmen</h2>
      <p>Ein Entwurf, der seine ersten drei Vergleiche gewonnen hat, hätte
      unendliche Stärke: Das Modell allein wüsste nicht, wo es aufhören soll.
      Deshalb kommen je Entwurf zwei fiktive Vergleiche gegen einen gedachten
      Gegner mittlerer Stärke hinzu — einer gewonnen, einer verloren. Das ist
      wenig neben Hunderten echter Stimmen, hält aber alle Punktzahlen endlich
      und verhindert, dass ein dreimal gewählter Entwurf einen dreihundertmal
      gewählten überholt.</p>

      <h2>Von der Stückelung zum ganzen Vorschlag</h2>
      <p>Jede Stückelung hat ihre eigene Rangliste, berechnet nur aus Vergleichen
      zwischen Banknoten dieser Stückelung. Die Gesamtpunktzahl eines Vorschlags
      ist das Mittel seiner sechs Stärken, gebildet über die Logarithmen — das
      ist die Skala, auf der das Modell linear ist, und sie verhindert, dass eine
      einzelne sehr starke Stückelung die ganze Familie allein trägt.</p>

      <h2>Welche Paare Ihnen gezeigt werden</h2>
      <p>Nicht rein zufällig. Die Seite bevorzugt Paare mit bisher wenigen
      Stimmen und Paare zwischen Entwürfen ähnlicher Stärke, denn diese sind am
      aussagekräftigsten: Den Ausgang eines ohnehin klaren Vergleichs zu erfahren
      bringt nichts. Die Wahl bleibt unter diesen Gewichten dennoch zufällig,
      damit nicht alle dasselbe Duell zu sehen bekommen.</p>

      <h2>Grenzen, klar benannt</h2>
      <ul>
        <li>Die Stichprobe ist, wer zufällig auf diese Seite kommt: Sie ist nicht
        repräsentativ für die europäische Bevölkerung, und die Rangliste ist
        keine Umfrage.</li>
        <li>Die Kennung der Abstimmenden liegt im Browser. Sie bremst versehentliche
        Doppelstimmen und Skripte, nicht jemanden, der unbedingt weitermachen will.</li>
        <li>Diese Seite steht in keiner Beziehung zur EZB und hat keinen Einfluss
        auf die offizielle Entscheidung. Dafür gibt es
        <a href="${ECB_URL}" target="_blank" rel="noopener">die Umfrage der EZB</a>.</li>
      </ul>`,
  },
  /* ------------------------------------------------------------- spagnolo */
  es: {
    'meta.title': '¿Cuál será el billete más bonito de Europa?',
    'meta.description':
      'Vota de dos en dos las diez propuestas de diseño para los futuros billetes en euros y descubre la clasificación calculada con el modelo de Bradley–Terry.',

    'brand.title': 'Billete de Europa',
    'brand.tagline': 'las 10 propuestas para el futuro euro, un duelo cada vez',

    'nav.vote': 'Votar',
    'vote.title': 'Vota los billetes',
    'nav.ranking': 'Clasificación',
    'nav.designs': 'Diseños',
    'nav.method': 'Método',

    'vote.hintHtml':
      'Siempre se comparan <strong>dos billetes de la misma denominación</strong>, ' +
      'anverso y reverso. Elige el que más te guste.',
    'vote.skip': 'No sabría decidir, saltar',
    'vote.countZero': 'Aún no has votado',
    'vote.countOne': 'Has emitido 1 voto',
    'vote.countMany': 'Has emitido {n} votos',
    'vote.kbdHtml':
      'Con el teclado: <kbd>←</kbd> o <kbd>→</kbd> para votar, <kbd>espacio</kbd> para saltar.',
    'side.front': 'anverso',
    'side.back': 'reverso',

    'banner.notConfigured':
      'Sin servidor configurado: tus votos se quedan en este navegador y la clasificación es solo tuya.',
    'banner.unreachable':
      'Servidor inaccesible: tus votos se quedan en este navegador hasta que vuelva la conexión.',
    'banner.voteFailed':
      'Tu voto no se ha registrado: comprueba la conexión e inténtalo de nuevo.',
    'banner.stale':
      'La clasificación no puede actualizarse ahora mismo: esta es la última copia compartida que recibió el sitio. Los votos que emitas ahora se quedan en este navegador.',

    'rank.title': 'Clasificación',
    'scope.note': 'Por billete',
    'rank.scopeLabel': 'Tipo de clasificación',
    'scope.design': 'Por diseño',
    'rank.noteDesign':
      'Los diez diseños, cada uno con la media de sus seis billetes.',
    'rank.summaryNone': 'Todavía no hay votos. {mode}',
    'rank.summarySome': '{n} comparaciones recogidas. {mode}',
    'rank.modeShared': 'Clasificación compartida por todos los votantes.',
    'rank.modeLocal':
      'Modo local: esta clasificación solo cuenta tus votos, guardados en este navegador.',
    'rank.modeStale': 'Última clasificación compartida recibida; no se actualiza ahora mismo.',
    'rank.proposal': 'Diseño {letter}',
    'rank.proposalDenom': 'Diseño {letter} • {denom} €',
    'rank.showMore': 'Mostrar {n} más',

    'designs.title': 'Las diez propuestas',
    'designs.ledeHtml':
      'El BCE ha seleccionado diez propuestas, cinco sobre el tema <em>cultura europea</em> ' +
      'y cinco sobre <em>ríos y aves</em>. Cada propuesta abarca los seis ' +
      'valores, de 5 a 200 euros, anverso y reverso.',

    'themeName.culture': 'Cultura europea',
    'themeName.nature': 'Ríos y aves',

    'alt.note': 'Diseño {letter}, billete de {denom} euros, {side}',
    'vote.cardLabel': 'Votar el diseño {letter}, billete de {denom} euros',
    'a11y.newChallenge': 'Nuevo duelo: diseño {a} contra diseño {b}, billete de {denom} euros',
    'a11y.skip': 'Ir al contenido',

    'footer.theme': 'Tema',
    'theme.auto': 'Auto',
    'theme.light': 'Claro',
    'theme.dark': 'Oscuro',
    'footer.language': 'Idioma',
    'footer.creditHtml':
      'Creado por Roberto Pinotti · ' +
      `<a href="${REPO_URL}" target="_blank" rel="noopener">código fuente en GitHub</a>`,
    'footer.attributionHtml':
      'Las imágenes son <strong>propuestas de diseño</strong> para una posible ' +
      'futura serie de billetes en euros. Fuente: Banco Central Europeo — ' +
      `<a href="${ECB_URL}" target="_blank" rel="noopener">Future euro banknote design proposals</a>. ` +
      'Reproducidas con fines informativos. Proyecto independiente, sin vínculo ' +
      'alguno con el BCE ni el Eurosistema, ni respaldo por su parte.',

    'method.title': 'Cómo se calcula la clasificación',
    'method.bodyHtml': `
      <h2>Por qué comparaciones de dos en dos</h2>
      <p>Pedir una nota del 1 al 10 sobre sesenta imágenes no funciona: cada
      persona usa la escala a su manera, y quien vota primero condiciona a quien
      vota después. Una comparación entre solo dos billetes es, en cambio, una
      pregunta que todos responden igual. El problema se traslada a cómo reunir
      miles de comparaciones dispersas en una única clasificación.</p>

      <h2>El modelo de Bradley–Terry</h2>
      <p>A cada diseño se le asocia una <em>fuerza</em> <code>p</code>, un número
      positivo. La probabilidad de que el diseño <code>i</code> sea preferido al
      diseño <code>j</code> es</p>
      <p class="formula">P(i gana a j) = p<sub>i</sub> / (p<sub>i</sub> + p<sub>j</sub>)</p>
      <p>Las fuerzas no se observan: se estiman buscando los valores que hacen
      más probables los votos realmente recogidos. El cálculo emplea el
      algoritmo MM de Hunter, que parte de fuerzas iguales y las actualiza con</p>
      <p class="formula">p<sub>i</sub> &larr; W<sub>i</sub> / &Sigma;<sub>j&ne;i</sub> [ N<sub>ij</sub> / (p<sub>i</sub> + p<sub>j</sub>) ]</p>
      <p>donde <code>W<sub>i</sub></code> son las victorias totales de
      <code>i</code> y <code>N<sub>ij</sub></code> el número de comparaciones
      entre <code>i</code> y <code>j</code>. Cada pasada mejora el ajuste a los
      datos, y en unas pocas decenas de iteraciones el resultado es estable.</p>
      <p>La ventaja frente al simple porcentaje de victorias es que el modelo
      tiene en cuenta <em>a quién</em> has ganado: ganar al diseño más fuerte
      vale más que ganar al último de la clasificación. Y el resultado no depende
      del orden en que llegan los votos — al barajarlos, la clasificación no
      cambia.</p>

      <h2>La puntuación mostrada</h2>
      <p>Las fuerzas se leen mejor en la escala Elo, la misma del ajedrez:</p>
      <p class="formula">R = 1500 + (400 / ln 10) &middot; ln p</p>
      <p>Así 1500 es el centro del grupo y <strong>100 puntos de diferencia
      equivalen a alrededor del 64 % de probabilidad de ganar</strong>, 400
      puntos equivalen a 10 contra 1. La puntuación debe leerse junto con el
      número de comparaciones indicado arriba: con unas decenas de votos las
      posiciones cambian con facilidad, y solo tras unos cientos se
      estabilizan.</p>

      <h2>Los que aún tienen pocos votos</h2>
      <p>Un diseño que hubiera ganado sus tres primeras comparaciones tendría
      fuerza infinita: el modelo, por sí solo, no sabría dónde detenerse. Por eso
      se añaden dos comparaciones ficticias por diseño frente a un adversario
      imaginario de fuerza media, una ganada y otra perdida. Es poca cosa frente
      a cientos de votos reales, pero basta para mantener finitas todas las
      puntuaciones y evitar que un diseño votado tres veces adelante a uno votado
      trescientas.</p>

      <h2>De la denominación concreta a la propuesta entera</h2>
      <p>Cada denominación tiene su propia clasificación, calculada solo con
      las comparaciones entre billetes de esa denominación. La puntuación global de una
      propuesta es la media de sus seis fuerzas, tomada sobre los logaritmos —
      es la escala en la que el modelo es lineal, e impide que una única
      denominación muy fuerte arrastre por sí sola a toda la familia.</p>

      <h2>Qué parejas se te muestran</h2>
      <p>No al azar puro. El sitio prioriza las parejas aún poco votadas y las
      formadas por diseños de fuerza parecida, que son las más informativas:
      conocer el desenlace de una comparación cantada no aporta nada. La elección
      sigue siendo aleatoria con esos pesos, de modo que no todos los votantes
      ven el mismo duelo.</p>

      <h2>Límites, dichos con claridad</h2>
      <ul>
        <li>La muestra es quien llega a este sitio: no es representativa de la
        población europea, y la clasificación no debe leerse como una
        encuesta.</li>
        <li>El identificador del votante vive en el navegador. Frena los
        duplicados accidentales y los scripts, no a quien se empeñe en
        insistir.</li>
        <li>Este sitio no tiene relación alguna con el BCE ni influye en la
        elección oficial. Para eso está
        <a href="${ECB_URL}" target="_blank" rel="noopener">la encuesta del BCE</a>.</li>
      </ul>`,
  },

};

/* --------------------------------------------------------------- runtime */

const LANG_KEY = 'ebr:lang';
const VALID = new Set(LANGUAGES.map((l) => l.code));

/**
 * Lingua da usare: quella scelta in precedenza, altrimenti quella del browser
 * se è fra quelle tradotte, altrimenti l'italiano.
 */
export function detectLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && VALID.has(saved)) return saved;
  } catch {
    // storage non disponibile: si prosegue con la lingua del browser
  }
  for (const tag of navigator.languages || [navigator.language || '']) {
    const code = String(tag).slice(0, 2).toLowerCase();
    if (VALID.has(code)) return code;
  }
  return DEFAULT_LANG;
}

export function saveLang(code) {
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch {
    // senza storage la scelta vale solo per questa visita
  }
}

/**
 * Testo tradotto, con sostituzione dei segnaposto `{nome}`.
 * Se una chiave manca si ripiega sull'italiano invece di mostrare un buco.
 */
export function translate(lang, key, vars = {}) {
  const table = STRINGS[lang] || STRINGS[DEFAULT_LANG];
  const raw = table[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m
  );
}
