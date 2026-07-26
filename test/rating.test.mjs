/**
 * Test del motore di classifica. Si esegue con:  node --test test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bradleyTerry,
  computeRankings,
  standardErrors,
  rankWithTies,
  strengthToElo,
  pickPair,
} from '../src/rating.js';

/** Generatore pseudo-casuale deterministico, così i test non sono capricciosi. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

test('recupera l\'ordine vero delle forze da confronti simulati', () => {
  const truth = { a: 4.0, b: 2.0, c: 1.0, d: 0.5, e: 0.25 };
  const items = Object.keys(truth);
  const rng = mulberry32(42);

  const wins = new Map(items.map((i) => [i, 0]));
  const pairN = new Map();

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const [x, y] = [items[i], items[j]];
      const n = 400;
      const p = truth[x] / (truth[x] + truth[y]);
      let winsX = 0;
      for (let k = 0; k < n; k++) if (rng() < p) winsX++;
      pairN.set(pairKey(x, y), n);
      wins.set(x, wins.get(x) + winsX);
      wins.set(y, wins.get(y) + (n - winsX));
    }
  }

  const { strength, converged } = bradleyTerry(items, wins, pairN, { prior: 0.5 });
  assert.ok(converged, 'l\'algoritmo MM deve convergere');

  const order = [...strength.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  assert.deepEqual(order, ['a', 'b', 'c', 'd', 'e']);

  // I rapporti fra le forze devono avvicinarsi a quelli veri (scala ancorata
  // dall'avversario virtuale, quindi si confrontano i rapporti su 'c' = 1).
  for (const id of items) {
    const estimated = strength.get(id) / strength.get('c');
    const expected = truth[id] / truth.c;
    assert.ok(
      Math.abs(Math.log(estimated / expected)) < 0.2,
      `${id}: stimato ${estimated.toFixed(3)}, atteso ${expected.toFixed(3)}`
    );
  }
});

test('un design imbattuto ottiene un punteggio finito', () => {
  const items = ['a', 'b', 'c'];
  const wins = new Map([['a', 20], ['b', 5], ['c', 5]]);
  const pairN = new Map([
    [pairKey('a', 'b'), 10],
    [pairKey('a', 'c'), 10],
    [pairKey('b', 'c'), 10],
  ]);

  const { strength } = bradleyTerry(items, wins, pairN, { prior: 1 });
  const pa = strength.get('a');
  assert.ok(Number.isFinite(pa) && pa > 0, `forza non finita: ${pa}`);
  assert.ok(pa > strength.get('b'), 'chi vince sempre deve stare in testa');
  assert.ok(Number.isFinite(strengthToElo(pa)));
});

test('senza alcun voto tutti i design sono in parità a 1500', () => {
  const ids = ['a', 'b', 'c'];
  const { byDenomination, families, totalVotes } = computeRankings([], ids, [5, 10], {});

  assert.equal(totalVotes, 0);
  for (const denom of [5, 10]) {
    for (const row of byDenomination.get(denom)) {
      assert.ok(Math.abs(row.elo - 1500) < 1e-6, `${row.designId}: ${row.elo}`);
      assert.equal(row.played, 0);
    }
  }
  for (const f of families) assert.ok(Math.abs(f.elo - 1500) < 1e-6);
});

test('la classifica per taglio è indipendente dagli altri tagli', () => {
  const ids = ['a', 'b'];
  const stats = [
    // Sul 5 € vince a, sul 10 € vince b: le due classifiche devono invertirsi.
    { denomination: 5, designLo: 'a', designHi: 'b', winsLo: 90, winsHi: 10 },
    { denomination: 10, designLo: 'a', designHi: 'b', winsLo: 10, winsHi: 90 },
  ];
  const { byDenomination, families } = computeRankings(stats, ids, [5, 10]);

  assert.equal(byDenomination.get(5)[0].designId, 'a');
  assert.equal(byDenomination.get(10)[0].designId, 'b');

  // Vittorie speculari ⇒ le due famiglie devono risultare pari.
  assert.ok(
    Math.abs(families[0].elo - families[1].elo) < 1e-6,
    `famiglie non in parità: ${families[0].elo} vs ${families[1].elo}`
  );
  assert.equal(families[0].played, 200);
});

test('il punteggio di famiglia media i sei tagli in scala logaritmica', () => {
  const ids = ['a', 'b'];
  const denoms = [5, 10, 20, 50, 100, 200];
  // 'a' domina ovunque tranne che sul 200 €, dove perde con lo stesso margine.
  const stats = denoms.map((d) => ({
    denomination: d,
    designLo: 'a',
    designHi: 'b',
    winsLo: d === 200 ? 20 : 80,
    winsHi: d === 200 ? 80 : 20,
  }));

  const { families, byDenomination } = computeRankings(stats, ids, denoms);
  const a = families.find((f) => f.designId === 'a');

  assert.equal(a.rank, 1, 'a deve restare primo pur perdendo un taglio');
  assert.equal(a.played, 600);

  // Il 200 € deve restare il suo taglio peggiore: la media non lo nasconde.
  const forzePerTaglio = denoms.map((d) => ({
    denom: d,
    forza: byDenomination.get(d).find((r) => r.designId === 'a').strength,
  }));
  const peggiore = [...forzePerTaglio].sort((x, y) => x.forza - y.forza)[0];
  assert.equal(peggiore.denom, 200);

  const meanLog =
    denoms.reduce(
      (acc, d) => acc + byDenomination.get(d).find((r) => r.designId === 'a').logStrength,
      0
    ) / denoms.length;
  assert.ok(Math.abs(a.logStrength - meanLog) < 1e-9);
});

test('la scala Elo mantiene la promessa fatta a chi legge', () => {
  // La pagina "Metodo" e il README dichiarano due numeri precisi: 100 punti di
  // distacco valgono circa il 64% di probabilità di vittoria, 400 punti valgono
  // 10 a 1. Sono la traduzione che il visitatore usa per interpretare i
  // punteggi, quindi vanno verificati e non solo scritti.
  const probabilita = (scarto) => {
    const pB = 1;
    const pA = Math.exp((scarto * Math.LN10) / 400); // inversa di strengthToElo
    return pA / (pA + pB);
  };

  assert.equal(Math.round(strengthToElo(Math.exp(0))), 1500);
  assert.ok(Math.abs(probabilita(100) - 0.64) < 0.005, probabilita(100));
  assert.ok(Math.abs(probabilita(400) - 10 / 11) < 1e-9, probabilita(400));

  // E la conversione deve essere coerente con sé stessa: due forze in rapporto
  // 10 a 1 devono distare esattamente 400 punti.
  assert.ok(Math.abs(strengthToElo(10) - strengthToElo(1) - 400) < 1e-9);
});

test('pickPair preferisce le coppie mai votate', () => {
  const pairs = [['a', 'b'], ['a', 'c'], ['b', 'c']];
  const counts = new Map([
    ['5|a|b', 500],
    ['5|a|c', 500],
    ['5|b|c', 0],
  ]);
  const strength = new Map([['a', 1], ['b', 1], ['c', 1]]);

  let fresh = 0;
  const rng = mulberry32(7);
  for (let i = 0; i < 200; i++) {
    if (pickPair(pairs, counts, strength, 5, new Set(), rng).key === '5|b|c') fresh++;
  }
  assert.ok(fresh > 150, `la coppia nuova è uscita solo ${fresh} volte su 200`);
});

test('pickPair non ripropone una coppia già vista, e riparte quando finiscono', () => {
  const pairs = [['a', 'b'], ['a', 'c']];
  const counts = new Map();
  const strength = new Map([['a', 1], ['b', 1], ['c', 1]]);
  const rng = mulberry32(3);

  const seen = new Set(['5|a|b']);
  for (let i = 0; i < 50; i++) {
    assert.equal(pickPair(pairs, counts, strength, 5, seen, rng).key, '5|a|c');
  }

  const all = new Set(['5|a|b', '5|a|c']);
  const result = pickPair(pairs, counts, strength, 5, all, rng);
  assert.equal(result.exhausted, true);
  assert.ok(['5|a|b', '5|a|c'].includes(result.key));
});

test('i tagli sconosciuti nei dati non inquinano le classifiche', () => {
  const ids = ['a', 'b'];
  const stats = [
    { denomination: 5, designLo: 'a', designHi: 'b', winsLo: 10, winsHi: 0 },
    { denomination: 500, designLo: 'a', designHi: 'b', winsLo: 999, winsHi: 0 },
  ];
  const { byDenomination, totalVotes } = computeRankings(stats, ids, [5]);
  assert.equal(totalVotes, 10, 'il taglio da 500 € non esiste e va ignorato');
  assert.equal(byDenomination.get(5)[0].played, 10);
});

/* ------------------------------------------- uncertainty and equal footing */

test('the standard error falls as the comparisons pile up', () => {
  const ids = ['a', 'b'];
  const se = (n) => {
    const wins = new Map([['a', n / 2], ['b', n / 2]]);
    const pairN = new Map([['a|b', n]]);
    const { strength } = bradleyTerry(ids, wins, pairN);
    return standardErrors(ids, pairN, strength).get('a');
  };
  assert.ok(se(100) < se(10), `${se(100)} should be below ${se(10)}`);
  assert.ok(se(10) < se(0));
});

test('a design nobody has voted on still has a finite error', () => {
  // Only the regularisation term is left: info = 2·prior·1/(1+1)² = 0.5,
  // so se = 1/√0.5 = √2. It is the closed form that anchors the whole scale.
  const ids = ['a', 'b'];
  const { strength } = bradleyTerry(ids, new Map(), new Map());
  const se = standardErrors(ids, new Map(), strength).get('a');
  assert.ok(Math.abs(se - Math.SQRT2) < 1e-9, `se = ${se}`);
});

test('the error of a whole design is the error of a mean of six', () => {
  const ids = ['a', 'b'];
  const denoms = [5, 10, 20, 50, 100, 200];
  const stats = denoms.map((d) => ({
    denomination: d, designLo: 'a', designHi: 'b', winsLo: 7, winsHi: 3,
  }));
  const { byDenomination, families } = computeRankings(stats, ids, denoms);

  const a = families.find((f) => f.designId === 'a');
  const varSum = denoms.reduce((acc, d) => {
    const row = byDenomination.get(d).find((r) => r.designId === 'a');
    return acc + row.eloError ** 2;
  }, 0);
  assert.ok(Math.abs(a.eloError - Math.sqrt(varSum) / 6) < 1e-9);
});

test('with no votes at all every design is level at 1500, and says so', () => {
  const ids = ['a', 'b', 'c'];
  const { families } = computeRankings([], ids, [5]);
  for (const f of families) {
    assert.ok(Math.abs(f.elo - 1500) < 1e-6);
    assert.ok(Number.isFinite(f.eloError) && f.eloError > 0);
  }
  const shown = rankWithTies(families);
  assert.deepEqual(shown.map((r) => r.displayRank), [1, 1, 1]);
});

test('rankWithTies shares the position, and numbers the next one properly', () => {
  const rows = [
    { elo: 1600, eloError: 15 },
    { elo: 1599, eloError: 15 },
    { elo: 1400, eloError: 15 },
  ];
  const shown = rankWithTies(rows);
  assert.deepEqual(shown.map((r) => r.displayRank), [1, 1, 3]);
  assert.deepEqual(shown.map((r) => r.tied), [true, true, false]);
});

test('being level is not contagious down the list', () => {
  // 1600 / 1585 / 1570 with se 15: the threshold is z·√(15²+15²) ≈ 21.2, so the
  // second joins the first (15 apart) and the third does NOT get in through the
  // second — it is 30 from the leader. Chained neighbour to neighbour this
  // would be one group of three, and on the per-banknote ranking, where
  // consecutive rows are a handful of points apart, one group of sixty.
  const rows = [
    { elo: 1600, eloError: 15 },
    { elo: 1585, eloError: 15 },
    { elo: 1570, eloError: 15 },
  ];
  assert.deepEqual(rankWithTies(rows).map((r) => r.displayRank), [1, 1, 3]);
});

test('rankWithTies does not touch the rows it is given', () => {
  const rows = [{ elo: 1600, eloError: 15, rank: 1 }, { elo: 1599, eloError: 15, rank: 2 }];
  const shown = rankWithTies(rows);
  assert.equal(rows[1].displayRank, undefined);
  assert.equal(shown[1].rank, 2, 'the strict position stays available');
});
