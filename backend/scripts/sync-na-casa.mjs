#!/usr/bin/env node

import pg from 'pg';

const { Pool } = pg;

const FRONT_PAGE_URL = process.env.NA_CASA_URL || 'http://192.168.0.73/init/default/na_casa';
const TIME_ZONE = process.env.NA_CASA_TIME_ZONE || process.env.TZ || 'America/Sao_Paulo';
const APPLY_CHANGES = process.argv.includes('--apply') || process.env.NA_CASA_APPLY === 'true';
const DRY_RUN = process.argv.includes('--dry-run') || !APPLY_CHANGES;

const CAMAS_OFICIAIS = [
  { casa: 'MASCULINA', inicio: 1, fim: 50 },
  { casa: 'IDOSOS', inicio: 51, fim: 66 },
  { casa: 'MISTA_MULHERES', inicio: 77, fim: 96 },
  { casa: 'LGBT', inicio: 97, fim: 100 },
];

const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const PERSON_OVERRIDES = new Map([
  [normalizeForMatch('FRANCISCO DE ASSIS CORREA DA ROSA'), ['FRANCISCO DE ASSIS CORREA DE ROSA']],
  [normalizeForMatch('GERSON ITAMAR COSTA DE SOUZA'), ['ITAMAR DE SOUZA']],
]);

function fail(message) {
  console.error(`ERRO: ${message}`);
  process.exitCode = 1;
  process.exit(1);
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDiacritics(value) {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeForMatch(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeForMatch(value) {
  return normalizeForMatch(value)
    .split(' ')
    .filter((token) => token && !STOPWORDS.has(token));
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: '\'',
    nbsp: ' ',
  };

  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const lower = entity.toLowerCase();

    if (Object.prototype.hasOwnProperty.call(named, lower)) {
      return named[lower];
    }

    if (lower.startsWith('#x')) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _;
    }

    if (lower.startsWith('#')) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _;
    }

    return _;
  });
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]*>/g, ' '));
}

function getTodayString(timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseDiasRestantes(rawValue) {
  const normalized = normalizeWhitespace(rawValue);

  if (/ultimo dia/i.test(normalized)) {
    return 1;
  }

  const parsed = Number(normalized.replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getNameVariants(name) {
  const cleaned = normalizeWhitespace(name);
  const variants = new Set([cleaned]);

  const prefix = cleaned.replace(/\s*\(.*/, '').trim();
  if (prefix) {
    variants.add(prefix);
  }

  for (const match of cleaned.matchAll(/\(([^)]+)\)/g)) {
    const inside = normalizeWhitespace(match[1]);
    if (inside) {
      variants.add(inside);
    }
  }

  return [...variants].filter(Boolean);
}

function expectedCasaFromNumero(numero) {
  for (const range of CAMAS_OFICIAIS) {
    if (numero >= range.inicio && numero <= range.fim) {
      return range.casa;
    }
  }

  return null;
}

function parseFrontPage(html) {
  const tbodyMatch = html.match(/<tbody[^>]*id="lista_usuario"[^>]*>([\s\S]*?)<\/tbody>/i);

  if (!tbodyMatch) {
    fail('Nao foi possivel localizar a tabela de usuarios em na_casa.');
  }

  const tbody = tbodyMatch[1];
  const rowMatches = [...tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

  return rowMatches.map((rowMatch) => {
    const rowHtml = rowMatch[1];
    const cellMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];

    if (cellMatches.length < 6) {
      fail('Linha invalida encontrada ao ler a tabela na_casa.');
    }

    const nome = normalizeWhitespace(stripTags(cellMatches[2][1]));
    const chaveRaw = normalizeWhitespace(stripTags(cellMatches[4][1]));
    const diasRaw = normalizeWhitespace(stripTags(cellMatches[5][1]));
    const chave = Number.parseInt(chaveRaw, 10);

    if (!nome) {
      fail('Linha sem nome encontrada na tabela na_casa.');
    }

    if (!Number.isFinite(chave)) {
      fail(`Chave invalida para ${nome}: ${chaveRaw}`);
    }

    return {
      nome,
      chave,
      diasRestantes: parseDiasRestantes(diasRaw),
      diasRaw,
    };
  });
}

function buildDbNameIndex(people) {
  const index = new Map();

  for (const pessoa of people) {
    const variants = [pessoa.nome, pessoa.nome_social].flatMap((value) => (value ? getNameVariants(value) : []));

    for (const variant of variants) {
      const key = normalizeForMatch(variant);
      if (!key) {
        continue;
      }

      const current = index.get(key) || [];
      current.push(pessoa);
      index.set(key, current);
    }
  }

  return index;
}

function resolvePersonByOverride(row, dbIndex) {
  const rowVariants = getNameVariants(row.nome).map((variant) => normalizeForMatch(variant));

  for (const rowVariant of rowVariants) {
    const overrideCandidates = PERSON_OVERRIDES.get(rowVariant);

    if (!overrideCandidates) {
      continue;
    }

    for (const candidateName of overrideCandidates) {
      const candidateKey = normalizeForMatch(candidateName);
      const matches = dbIndex.get(candidateKey);

      if (!matches || matches.length === 0) {
        continue;
      }

      if (matches.length === 1) {
        return matches[0];
      }

      const exact = matches.find((person) => normalizeForMatch(person.nome) === candidateKey && !person.nome_social);
      if (exact) {
        return exact;
      }

      return matches[0];
    }
  }

  return null;
}

function buildPersonProfiles(people) {
  const tokenFrequency = new Map();

  for (const pessoa of people) {
    const tokens = new Set([
      ...tokenizeForMatch(pessoa.nome),
      ...tokenizeForMatch(pessoa.nome_social || ''),
    ]);

    for (const token of tokens) {
      tokenFrequency.set(token, (tokenFrequency.get(token) || 0) + 1);
    }
  }

  return people.map((pessoa) => {
    const tokens = new Set([
      ...tokenizeForMatch(pessoa.nome),
      ...tokenizeForMatch(pessoa.nome_social || ''),
    ]);

    return {
      pessoa,
      tokens,
    };
  });
}

function scorePersonMatch(rowTokens, rowNormalized, profile, tokenFrequency) {
  let score = 0;
  let matches = 0;

  for (const token of rowTokens) {
    if (profile.tokens.has(token)) {
      const frequency = tokenFrequency.get(token) || 1;
      score += 100 / frequency;
      matches += 1;
    }
  }

  if (matches === 0) {
    return -1;
  }

  const profileName = normalizeForMatch(profile.pessoa.nome);
  const profileSocial = normalizeForMatch(profile.pessoa.nome_social || '');

  if (profileName === rowNormalized || profileSocial === rowNormalized) {
    score += 500;
  }

  if (profileName.includes(rowNormalized) || rowNormalized.includes(profileName)) {
    score += 100;
  }

  if (profileSocial && (profileSocial.includes(rowNormalized) || rowNormalized.includes(profileSocial))) {
    score += 60;
  }

  score += Math.max(0, 20 - Math.abs(profile.tokens.size - rowTokens.length));
  score += matches * 5;

  return score;
}

function resolvePerson(row, dbIndex, profiles, tokenFrequency) {
  const override = resolvePersonByOverride(row, dbIndex);
  if (override) {
    return override;
  }

  const variants = getNameVariants(row.nome);

  for (const variant of variants) {
    const key = normalizeForMatch(variant);
    if (!key) {
      continue;
    }

    const matches = dbIndex.get(key);
    if (matches && matches.length === 1) {
      return matches[0];
    }

    if (matches && matches.length > 1) {
      const exact = matches.find((person) => normalizeForMatch(person.nome) === key);
      if (exact) {
        return exact;
      }
    }
  }

  const rowTokens = tokenizeForMatch(row.nome);
  const rowNormalized = normalizeForMatch(row.nome);

  let best = null;
  let bestScore = -1;
  let secondBest = -1;

  for (const profile of profiles) {
    const score = scorePersonMatch(rowTokens, rowNormalized, profile, tokenFrequency);

    if (score > bestScore) {
      secondBest = bestScore;
      bestScore = score;
      best = profile.pessoa;
      continue;
    }

    if (score > secondBest) {
      secondBest = score;
    }
  }

  if (best && bestScore >= 120 && (bestScore - secondBest) >= 10) {
    return best;
  }

  return null;
}

function resolveCama(row, camaMap) {
  const cama = camaMap.get(row.chave);

  if (!cama) {
    return null;
  }

  const casaEsperada = expectedCasaFromNumero(row.chave);

  if (casaEsperada && cama.casa !== casaEsperada) {
    fail(`Cama ${row.chave} encontrada, mas pertence a ${cama.casa} e nao a ${casaEsperada}.`);
  }

  return cama;
}

async function main() {
  const response = await fetch(FRONT_PAGE_URL);
  if (!response.ok) {
    fail(`Nao foi possivel ler a pagina na_casa (${response.status} ${response.statusText}).`);
  }

  const html = await response.text();
  const frontRows = parseFrontPage(html);

  if (frontRows.length !== 90) {
    fail(`Esperava 90 linhas na pagina na_casa, mas encontrei ${frontRows.length}.`);
  }

  const pool = new Pool({
    host: process.env.DB_ALBERGUE_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_ALBERGUE_PORT || '5432', 10),
    user: process.env.DB_ALBERGUE_USER || 'iedc_albergue_app',
    password: process.env.DB_ALBERGUE_PASSWORD,
    database: process.env.DB_ALBERGUE_NAME || 'iedc_albergue',
  });

  const client = await pool.connect();
  try {
    const { rows: people } = await client.query(`
      SELECT id, nome, nome_social, status_cadastro, ativo, presente, lgbt, tipo_vaga
      FROM pessoas
      WHERE ativo = true
    `);

    const { rows: camas } = await client.query(`
      SELECT id, numero, casa, status
      FROM camas
      ORDER BY numero ASC
    `);

    const dbIndex = buildDbNameIndex(people);
    const personProfiles = buildPersonProfiles(people);
    const tokenFrequency = new Map();

    for (const profile of personProfiles) {
      for (const token of profile.tokens) {
        tokenFrequency.set(token, (tokenFrequency.get(token) || 0) + 1);
      }
    }

    const camaMap = new Map(camas.map((cama) => [Number(cama.numero), cama]));

    if (camas.length !== 90) {
      fail(`Esperava 90 camas oficiais, mas encontrei ${camas.length}.`);
    }

    const alvo = [];
    const checkoutRows = [];
    const unresolved = [];
    const camasAusentes = [];
    const pessoasUsadas = new Set();

    for (const row of frontRows) {
      const pessoa = resolvePerson(row, dbIndex, personProfiles, tokenFrequency);

      if (!pessoa) {
        unresolved.push(row);
      }

      if (row.chave === 0) {
        checkoutRows.push({ ...row, pessoa });
        continue;
      }

      const cama = resolveCama(row, camaMap);

      if (!cama) {
        camasAusentes.push(row);
      }

      if (pessoa) {
        if (pessoasUsadas.has(pessoa.id)) {
          fail(`A pessoa ${pessoa.nome} apareceu mais de uma vez na fonte na_casa.`);
        }
        pessoasUsadas.add(pessoa.id);
      }

      alvo.push({ ...row, pessoa, cama });
    }

    if (unresolved.length > 0) {
      const detalhes = unresolved.map((row) => `${row.nome} [chave ${row.chave}]`).join('; ');
      fail(`Nao consegui localizar no banco: ${detalhes}`);
    }

    if (camasAusentes.length > 0) {
      const detalhes = camasAusentes.map((row) => `${row.nome} [chave ${row.chave}]`).join('; ');
      fail(`Nao consegui localizar as camas: ${detalhes}`);
    }

    const activeBefore = await client.query(
      `SELECT e.id, e.pessoa_id, p.nome
       FROM estadias e
       JOIN pessoas p ON p.id = e.pessoa_id
       WHERE e.status = 'ativa'`,
    );

    const activeIdsBefore = new Set(activeBefore.rows.map((row) => row.pessoa_id));
    const checkoutIds = new Set(checkoutRows.filter((row) => row.pessoa).map((row) => row.pessoa.id));
    const targetIds = new Set(alvo.map((row) => row.pessoa.id));

    const extras = activeBefore.rows.filter((row) => !targetIds.has(row.pessoa_id) && !checkoutIds.has(row.pessoa_id));
    if (extras.length > 0) {
      const detalhes = extras.map((row) => row.nome).join(', ');
      if (DRY_RUN) {
        console.log(`Estadias ativas fora da fonte na_casa (serao finalizadas no apply): ${detalhes}`);
      }
    }

    if (checkoutRows.length > 0 && DRY_RUN) {
      console.log(
        `Pessoas marcadas como chave 0 (serao tratadas como checkout): ${checkoutRows.map((row) => row.nome).join(', ')}`,
      );
    }

    const today = getTodayString(TIME_ZONE);
    const payloads = alvo.map((row) => {
      const dataLimite = addDays(today, row.diasRestantes);
      const dataCheckin = addDays(dataLimite, -30);

      return {
        pessoaId: row.pessoa.id,
        pessoaNome: row.pessoa.nome,
        camaId: row.cama ? row.cama.id : null,
        camaNumero: row.chave,
        camaCasa: row.cama ? row.cama.casa : null,
        dataCheckin: `${dataCheckin}T00:00:00`,
        dataLimite,
        numeroVaga: row.chave,
        diasRestantes: row.diasRestantes,
      };
    });

    if (DRY_RUN) {
      console.log(`Fonte carregada com ${frontRows.length} registros.`);
      console.log(`Banco possui ${people.length} pessoas ativas e ${camas.length} camas.`);
      console.log('Amostra da sincronizacao:');
      for (const item of payloads.slice(0, 10)) {
        console.log(
          `- ${item.pessoaNome} | cama ${item.camaNumero}${item.camaCasa ? ` (${item.camaCasa})` : ' (sem cama)' } | check-in ${item.dataCheckin.slice(0, 10)} | limite ${item.dataLimite} | dias ${item.diasRestantes}`,
        );
      }
      console.log('Dry-run concluido. Nenhuma alteracao foi aplicada.');
      return;
    }

    await client.query('BEGIN');

    try {
      for (const row of checkoutRows) {
        if (!row.pessoa) {
          continue;
        }

        const activeRow = activeBefore.rows.find((item) => item.pessoa_id === row.pessoa.id);
        if (!activeRow) {
          continue;
        }

        await client.query(
          `
            UPDATE estadias
            SET status = 'checkout_automatico',
                data_checkout = NOW(),
                funcionario_checkout = $1,
                observacoes_checkout = $2,
                motivo_saida = 'automatico',
                updated_at = NOW()
            WHERE id = $3
          `,
          [
            'sync-na-casa',
            `Checkout aplicado pela sincronizacao da fonte na_casa em ${today} (chave 0).`,
            activeRow.id,
          ],
        );

        await client.query(
          `UPDATE pessoas
           SET status_cadastro = 'inativo',
               presente = false,
               updated_at = NOW()
           WHERE id = $1`,
          [row.pessoa.id],
        );

        if (activeRow.cama_id) {
          await client.query(
            `UPDATE camas
             SET status = 'DISPONIVEL'
             WHERE id = $1`,
            [activeRow.cama_id],
          );
        }
      }

      for (const row of extras) {
        await client.query(
          `
            UPDATE estadias
            SET status = 'checkout_automatico',
                data_checkout = NOW(),
                funcionario_checkout = $1,
                observacoes_checkout = $2,
                motivo_saida = 'automatico',
                updated_at = NOW()
            WHERE id = $3
          `,
          [
            'sync-na-casa',
            `Finalizado pela sincronizacao da fonte na_casa em ${today}.`,
            row.id,
          ],
        );

        await client.query(
          `UPDATE pessoas
           SET status_cadastro = 'inativo',
               presente = false,
               updated_at = NOW()
           WHERE id = $1`,
          [row.pessoa_id],
        );

        if (row.cama_id) {
          await client.query(
            `UPDATE camas
             SET status = 'DISPONIVEL'
             WHERE id = $1`,
            [row.cama_id],
          );
        }
      }

      for (const item of payloads) {
        const existente = activeBefore.rows.find((row) => row.pessoa_id === item.pessoaId);

        if (existente) {
          await client.query(
            `
              UPDATE estadias
              SET cama_id = $1,
                  numero_vaga = $2,
                  data_checkin = $3,
                  data_limite = $4,
                  data_checkout = NULL,
                  status = 'ativa',
                  observacoes_checkin = $5,
                  observacoes_checkout = NULL,
                  funcionario_checkin = $6,
                  funcionario_checkout = NULL,
                  prorrogada = false,
                  dias_prorrogacao = 0,
                  motivo_prorrogacao = NULL,
                  motivo_saida = NULL,
                  updated_at = NOW()
              WHERE id = $7
            `,
            [
              item.camaId,
              item.numeroVaga,
              item.dataCheckin,
              item.dataLimite,
              `Sincronizado da fonte na_casa em ${today} | chave=${item.camaNumero} | dias_restantes=${item.diasRestantes}`,
              'sync-na-casa',
              existente.id,
            ],
          );
        } else {
          await client.query(
            `
              INSERT INTO estadias (
                pessoa_id,
                cama_id,
                data_checkin,
                data_limite,
                numero_vaga,
                status,
                observacoes_checkin,
                funcionario_checkin,
                prorrogada,
                dias_prorrogacao,
                created_at,
                updated_at
              ) VALUES ($1, $2, $3, $4, $5, 'ativa', $6, $7, false, 0, NOW(), NOW())
            `,
            [
              item.pessoaId,
              item.camaId,
              item.dataCheckin,
              item.dataLimite,
              item.numeroVaga,
              `Sincronizado da fonte na_casa em ${today} | chave=${item.camaNumero} | dias_restantes=${item.diasRestantes}`,
              'sync-na-casa',
            ],
          );
        }

        await client.query(
          `UPDATE pessoas
           SET status_cadastro = 'ativa',
               presente = true,
               updated_at = NOW()
           WHERE id = $1`,
          [item.pessoaId],
        );

        await client.query(
          `UPDATE camas
           SET status = 'OCUPADA'
           WHERE id = $1`,
          [item.camaId],
        );
      }

      const camasOcupadas = new Set(payloads.map((item) => item.camaId).filter(Boolean));
      for (const cama of camas) {
        if (!camasOcupadas.has(cama.id)) {
          await client.query(
            `UPDATE camas
             SET status = 'DISPONIVEL'
             WHERE id = $1`,
            [cama.id],
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    console.log(`Sincronizacao concluida: ${payloads.length} pessoas e ${camas.length} camas alinhadas.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
