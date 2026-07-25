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
];

export const DEFAULT_LANG = 'it';

const ECB_URL =
  'https://www.ecb.europa.eu/euro/banknotes/future_banknotes/html/design-proposals.en.html';

export const STRINGS = {
  /* ------------------------------------------------------------- italiano */
  it: {
    'meta.title': "Quale sarà la banconota più bella d'Europa?",
    'meta.description':
      'Vota a due a due le dieci proposte di design per le future banconote in euro e scopri la classifica calcolata con il modello Bradley–Terry.',

    'brand.title': "Banconota d'Europa",
    'brand.tagline': 'le 10 proposte per il futuro euro, una sfida alla volta',

    'nav.vote': 'Vota',
    'nav.ranking': 'Classifica',
    'nav.designs': 'I design',
    'nav.method': 'Metodo',

    'vote.hintHtml':
      'Si confrontano sempre <strong>due banconote dello stesso taglio</strong>, ' +
      'fronte e retro. Scegli quella che ti piace di più.',
    'vote.skip': 'Non saprei, passa oltre',
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

    'rank.title': 'Classifica',
    'scope.general': 'Generale',
    'scope.design': 'Per design',
    'scope.denomination': 'Per taglio',
    'rank.noteGeneralHtml':
      "Tutte e 60 le banconote in un'unica graduatoria — dieci proposte per sei " +
      'tagli. I confronti avvengono però sempre fra banconote dello stesso ' +
      'taglio, quindi ogni punteggio dice quanto quella banconota è forte ' +
      '<strong>rispetto alle altre del suo taglio</strong>: la classifica le ' +
      'mette in fila, non afferma che un 5 € batterebbe un 200 €.',
    'rank.noteDesign':
      'Le dieci proposte, ciascuna con la media delle sue sei banconote.',
    'rank.summaryNone': 'Nessun voto ancora. {mode}',
    'rank.summarySome': '{n} confronti raccolti. {mode}',
    'rank.modeShared': 'Classifica condivisa da tutti i votanti.',
    'rank.modeLocal':
      'Modalità locale: questa classifica conta solo i tuoi voti, salvati in questo browser.',
    'rank.denomLabel': 'Taglio',
    'rank.proposal': 'Proposta {letter}',
    'rank.recordOne': '1 vittoria su {n} · {p}%',
    'rank.recordMany': '{w} vittorie su {n} · {p}%',
    'rank.recordNone': 'nessun voto',

    'matrix.title': 'Chi batte chi',
    'matrix.note':
      'Probabilità che il design della riga batta quello della colonna, secondo ' +
      'il modello. Le celle più intense sono i pronostici più netti.',

    'designs.title': 'Le dieci proposte',
    'designs.ledeHtml':
      'La BCE ha selezionato dieci proposte, cinque sul tema <em>cultura europea</em> ' +
      'e cinque sul tema <em>fiumi e uccelli</em>. Ogni proposta copre tutti e sei ' +
      'i tagli, da 5 a 200 euro, fronte e retro.',

    'themeName.culture': 'Cultura europea',
    'themeName.nature': 'Fiumi e uccelli',

    'alt.note': 'Proposta {letter}, banconota da {denom} euro, {side}',

    'footer.theme': 'Tema',
    'theme.auto': 'Auto',
    'theme.light': 'Chiaro',
    'theme.dark': 'Scuro',
    'footer.language': 'Lingua',
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
      Il <code>±</code> accanto al punteggio è l'errore standard: finché è
      grande, la posizione è ancora provvisoria.</p>

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
    'nav.ranking': 'Ranking',
    'nav.designs': 'The designs',
    'nav.method': 'Method',

    'vote.hintHtml':
      'You always compare <strong>two banknotes of the same denomination</strong>, ' +
      'front and back. Pick the one you like more.',
    'vote.skip': "Can't decide, skip this one",
    'vote.countOne': 'You have cast 1 vote',
    'vote.countMany': 'You have cast {n} votes',
    'vote.kbdHtml':
      'Keyboard: <kbd>←</kbd> or <kbd>→</kbd> to vote, <kbd>space</kbd> to skip.',
    'side.front': 'front',
    'side.back': 'back',

    'banner.notConfigured':
      'No backend configured: your votes stay in this browser and the ranking is yours alone.',
    'banner.unreachable':
      'Backend unreachable: your votes stay in this browser until the connection is back.',
    'banner.voteFailed':
      'Your vote was not recorded: check your connection and try again.',

    'rank.title': 'Ranking',
    'scope.general': 'Overall',
    'scope.design': 'By design',
    'scope.denomination': 'By denomination',
    'rank.noteGeneralHtml':
      'All 60 banknotes in a single ranking — ten proposals across six ' +
      'denominations. Comparisons always happen between banknotes of the same ' +
      'denomination, so each score says how strong that banknote is ' +
      '<strong>against the others of its own denomination</strong>: the ranking ' +
      'lines them up, it does not claim a €5 note would beat a €200 one.',
    'rank.noteDesign':
      'The ten proposals, each averaged across its six banknotes.',
    'rank.summaryNone': 'No votes yet. {mode}',
    'rank.summarySome': '{n} comparisons collected. {mode}',
    'rank.modeShared': 'Ranking shared by all voters.',
    'rank.modeLocal':
      'Local mode: this ranking counts only your own votes, stored in this browser.',
    'rank.denomLabel': 'Denomination',
    'rank.proposal': 'Design {letter}',
    'rank.recordOne': '1 win out of {n} · {p}%',
    'rank.recordMany': '{w} wins out of {n} · {p}%',
    'rank.recordNone': 'no votes',

    'matrix.title': 'Who beats whom',
    'matrix.note':
      'Probability that the design in the row beats the one in the column, ' +
      'according to the model. Stronger cells are the more one-sided calls.',

    'designs.title': 'The ten proposals',
    'designs.ledeHtml':
      'The ECB shortlisted ten proposals, five on the theme <em>European culture</em> ' +
      'and five on <em>rivers and birds</em>. Each proposal covers all six ' +
      'denominations, from €5 to €200, front and back.',

    'themeName.culture': 'European culture',
    'themeName.nature': 'Rivers and birds',

    'alt.note': 'Design {letter}, €{denom} banknote, {side}',

    'footer.theme': 'Theme',
    'theme.auto': 'Auto',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'footer.language': 'Language',
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
      The <code>±</code> next to the score is the standard error: while it is
      large, the position is still provisional.</p>

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
    'nav.ranking': 'Classement',
    'nav.designs': 'Les graphismes',
    'nav.method': 'Méthode',

    'vote.hintHtml':
      'On compare toujours <strong>deux billets de la même coupure</strong>, ' +
      'recto et verso. Choisissez celui qui vous plaît le plus.',
    'vote.skip': 'Je ne saurais dire, passer',
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

    'rank.title': 'Classement',
    'scope.general': 'Général',
    'scope.design': 'Par graphisme',
    'scope.denomination': 'Par coupure',
    'rank.noteGeneralHtml':
      'Les 60 billets dans un classement unique — dix propositions pour six ' +
      'coupures. Les comparaisons se font cependant toujours entre billets de la ' +
      'même coupure : chaque score dit donc la force de ce billet ' +
      '<strong>face aux autres de sa coupure</strong>. Le classement les met en ' +
      "file, il n'affirme pas qu'un billet de 5 € battrait un 200 €.",
    'rank.noteDesign':
      'Les dix propositions, chacune avec la moyenne de ses six billets.',
    'rank.summaryNone': 'Aucun vote pour le moment. {mode}',
    'rank.summarySome': '{n} comparaisons recueillies. {mode}',
    'rank.modeShared': 'Classement partagé par tous les votants.',
    'rank.modeLocal':
      'Mode local : ce classement ne compte que vos propres votes, enregistrés dans ce navigateur.',
    'rank.denomLabel': 'Coupure',
    'rank.proposal': 'Graphisme {letter}',
    'rank.recordOne': '1 victoire sur {n} · {p} %',
    'rank.recordMany': '{w} victoires sur {n} · {p} %',
    'rank.recordNone': 'aucun vote',

    'matrix.title': 'Qui bat qui',
    'matrix.note':
      'Probabilité que le graphisme de la ligne batte celui de la colonne, ' +
      'selon le modèle. Les cases les plus intenses sont les pronostics les plus nets.',

    'designs.title': 'Les dix propositions',
    'designs.ledeHtml':
      'La BCE a retenu dix propositions, cinq sur le thème <em>culture européenne</em> ' +
      'et cinq sur <em>fleuves et oiseaux</em>. Chaque proposition couvre les six ' +
      'coupures, de 5 à 200 euros, recto et verso.',

    'themeName.culture': 'Culture européenne',
    'themeName.nature': 'Fleuves et oiseaux',

    'alt.note': 'Graphisme {letter}, billet de {denom} euros, {side}',

    'footer.theme': 'Thème',
    'theme.auto': 'Auto',
    'theme.light': 'Clair',
    'theme.dark': 'Sombre',
    'footer.language': 'Langue',
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
      1. Le <code>±</code> à côté du score est l'erreur type : tant qu'elle est
      grande, la position reste provisoire.</p>

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
    'nav.ranking': 'Rangliste',
    'nav.designs': 'Die Entwürfe',
    'nav.method': 'Methode',

    'vote.hintHtml':
      'Verglichen werden immer <strong>zwei Banknoten derselben Stückelung</strong>, ' +
      'Vorder- und Rückseite. Wählen Sie die, die Ihnen besser gefällt.',
    'vote.skip': 'Unentschieden, überspringen',
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

    'rank.title': 'Rangliste',
    'scope.general': 'Gesamt',
    'scope.design': 'Nach Entwurf',
    'scope.denomination': 'Nach Stückelung',
    'rank.noteGeneralHtml':
      'Alle 60 Banknoten in einer einzigen Rangliste — zehn Vorschläge in sechs ' +
      'Stückelungen. Verglichen wird jedoch immer nur innerhalb derselben ' +
      'Stückelung. Jede Punktzahl sagt also, wie stark diese Banknote ' +
      '<strong>gegenüber den anderen ihrer Stückelung</strong> ist: Die Rangliste ' +
      'reiht sie auf, sie behauptet nicht, ein 5-€-Schein schlüge einen 200-€-Schein.',
    'rank.noteDesign':
      'Die zehn Vorschläge, jeweils als Mittel ihrer sechs Banknoten.',
    'rank.summaryNone': 'Noch keine Stimmen. {mode}',
    'rank.summarySome': '{n} Vergleiche gesammelt. {mode}',
    'rank.modeShared': 'Rangliste, die alle Abstimmenden teilen.',
    'rank.modeLocal':
      'Lokaler Modus: Diese Rangliste zählt nur Ihre eigenen, in diesem Browser gespeicherten Stimmen.',
    'rank.denomLabel': 'Stückelung',
    'rank.proposal': 'Entwurf {letter}',
    'rank.recordOne': '1 Sieg von {n} · {p} %',
    'rank.recordMany': '{w} Siege von {n} · {p} %',
    'rank.recordNone': 'keine Stimmen',

    'matrix.title': 'Wer schlägt wen',
    'matrix.note':
      'Wahrscheinlichkeit, dass der Entwurf der Zeile den der Spalte schlägt, ' +
      'laut Modell. Kräftigere Felder sind die eindeutigeren Prognosen.',

    'designs.title': 'Die zehn Vorschläge',
    'designs.ledeHtml':
      'Die EZB hat zehn Vorschläge ausgewählt, fünf zum Thema <em>europäische Kultur</em> ' +
      'und fünf zu <em>Flüsse und Vögel</em>. Jeder Vorschlag deckt alle sechs ' +
      'Stückelungen ab, von 5 bis 200 Euro, Vorder- und Rückseite.',

    'themeName.culture': 'Europäische Kultur',
    'themeName.nature': 'Flüsse und Vögel',

    'alt.note': 'Entwurf {letter}, {denom}-Euro-Banknote, {side}',

    'footer.theme': 'Design',
    'theme.auto': 'Auto',
    'theme.light': 'Hell',
    'theme.dark': 'Dunkel',
    'footer.language': 'Sprache',
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
      entsprechen 10 zu 1. Das <code>±</code> neben der Punktzahl ist der
      Standardfehler: Solange er groß ist, bleibt die Position vorläufig.</p>

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
