#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_DUMP_PATH = process.env.LEGACY_DUMP_PATH || 'C:\\Users\\Usuario\\Downloads\\backup_triagem_20260618_1513.sql';
const REPORT_ONLY = process.argv.includes('--report-only') || process.argv.includes('--dry-run');
const RESET_TARGETS = process.argv.includes('--reset');

const LEGACY_TABLES = [
  'iedc_usuario',
  'iedc_entradas',
  'iedc_bloqueio',
  'iedc_observacao',
  'iedc_triagem',
];

const USER_COLUMNS = [
  'id',
  'id_usuario',
  'nome_usuario',
  'apelido_usuario',
  'data_nasci_usuario',
  'local_nasci_usuario',
  'escolaridade',
  'tipo_documento',
  'num_documento',
  'telefone',
  'profissao',
  'medicamentos',
  'foto',
  'bloqueado',
  'na_casa',
  'em_espera',
  'sexo',
  'etnia',
  'procedencia',
  'is_active',
  'created_on',
  'created_by',
  'modified_on',
  'modified_by',
  'procedencia_regiao',
  'nome_da_mae',
  'numero_nis',
];

const ENTRADAS_COLUMNS = [
  'id',
  'id_usuario',
  'data_entrada',
  'origem',
  'is_active',
  'created_on',
  'created_by',
  'modified_on',
  'modified_by',
  'mes',
  'genero',
  'procedencia',
  'ocupacao',
  'procedencia_regiao',
  'data_nasci_usuario',
  'escolaridade',
  'etnia',
];

const BLOQUEIO_COLUMNS = [
  'id',
  'id_usuario',
  'dias_restantes',
  'data_bloqueio',
  'data_entrada',
  'data_saida',
  'origem',
  'tipo',
  'observacao',
  'is_active',
  'created_on',
  'created_by',
  'modified_on',
  'modified_by',
  'chave',
];

const OBS_COLUMNS = [
  'id',
  'id_usuario',
  'data_obs',
  'observacao',
  'origem',
  'is_active',
  'created_on',
  'created_by',
  'modified_on',
  'modified_by',
];

const TRIAGEM_COLUMNS = [
  'id',
  'id_usuario',
  'chave',
  'sexo',
  'reentrada',
  'dias_restantes',
  'filhos',
  'data_triagem',
  'data_entrada',
  'data_saida',
  'origem',
  'is_active',
  'created_on',
  'created_by',
  'modified_on',
  'modified_by',
];

function die(message) {
  console.error(message);
  process.exitCode = 1;
  process.exit(1);
}

function readDump(filePath) {
  if (!fs.existsSync(filePath)) {
    die(`Dump not found: ${filePath}`);
  }

  const utf8 = fs.readFileSync(filePath, 'utf8');
  const latin1 = fs.readFileSync(filePath, 'latin1');

  const utf8Matches = (utf8.match(/^INSERT INTO /gm) || []).length;
  const latin1Matches = (latin1.match(/^INSERT INTO /gm) || []).length;

  if (utf8Matches >= latin1Matches) {
    return utf8;
  }

  return latin1;
}

function splitTuples(valuesPart) {
  const rows = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (const ch of valuesPart) {
    if (inString) {
      current += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '\'') {
        inString = false;
      }
      continue;
    }

    if (ch === '\'') {
      inString = true;
      current += ch;
      continue;
    }

    if (ch === '(') {
      if (depth > 0) {
        current += ch;
      }
      depth += 1;
      continue;
    }

    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        rows.push(current);
        current = '';
      } else if (depth > 0) {
        current += ch;
      }
      continue;
    }

    if (depth > 0) {
      current += ch;
    }
  }

  return rows;
}

function splitFields(rowText) {
  const fields = [];
  let current = '';
  let inString = false;
  let escape = false;

  for (const ch of rowText) {
    if (inString) {
      current += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '\'') {
        inString = false;
      }
      continue;
    }

    if (ch === '\'') {
      inString = true;
      current += ch;
      continue;
    }

    if (ch === ',') {
      fields.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  fields.push(current);
  return fields;
}

function unescapeMySqlString(value) {
  return value.replace(/\\([\\'"nrtb0Z])/g, (_, ch) => {
    switch (ch) {
      case '\\':
        return '\\';
      case '\'':
        return '\'';
      case '"':
        return '"';
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'b':
        return '\b';
      case '0':
        return '\0';
      case 'Z':
        return '\x1A';
      default:
        return ch;
    }
  });
}

function decodeValue(token) {
  const value = token.trim();
  if (!value || value === 'NULL') return null;
  if (value.startsWith('\'') && value.endsWith('\'')) {
    return unescapeMySqlString(value.slice(1, -1)).replace(/''/g, '\'');
  }
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return value;
}

function parseInsertLine(line, wantedTables) {
  const match = line.match(/^INSERT INTO `?([A-Za-z0-9_]+)`? VALUES (.*);$/);
  if (!match) return null;
  const table = match[1];
  if (!wantedTables.has(table)) return null;
  return { table, valuesPart: match[2] };
}

function rowsToObjects(columns, rows) {
  return rows.map((row) => {
    const obj = {};
    columns.forEach((column, index) => {
      obj[column] = row[index] ?? null;
    });
    return obj;
  });
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^null$/i.test(text)) return null;
  if (/^none$/i.test(text)) return null;
  if (text === '0') return null;
  return text.replace(/\s+/g, ' ');
}

function unwrapPipeText(value) {
  const text = cleanText(value);
  if (!text) return null;
  const stripped = text.replace(/^\|+|\|+$/g, '').trim();
  if (!stripped) return null;
  if (/^none$/i.test(stripped)) return null;
  if (stripped === '0') return null;
  return stripped;
}

function normalizeYesNo(value) {
  const text = cleanText(value);
  if (!text) return null;
  if (/^(T|TRUE|1|SIM)$/i.test(text)) return true;
  if (/^(F|FALSE|0|NAO|NÃO)$/i.test(text)) return false;
  return null;
}

function stripDigits(value) {
  const text = cleanText(value);
  if (!text) return null;
  const digits = text.replace(/\D+/g, '');
  return digits || null;
}

function parseLegacyDate(value) {
  const text = cleanText(value);
  if (!text) return null;
  const m1 = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m2) {
    const day = m2[1].padStart(2, '0');
    const month = m2[2].padStart(2, '0');
    const year = m2[3].padStart(4, '0');
    if (Number(day) >= 1 && Number(day) <= 31 && Number(month) >= 1 && Number(month) <= 12) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

function parseLegacyTimestamp(value) {
  const text = cleanText(value);
  if (!text) return null;
  const m1 = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}T${m1[4]}:${m1[5]}:${m1[6]}`;
  const dateOnly = parseLegacyDate(text);
  if (dateOnly) return `${dateOnly}T00:00:00`;
  return null;
}

function formatDaysBetween(start, end) {
  if (!start || !end) return null;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : null;
}

function normalizeDocument(person) {
  const docType = cleanText(person.tipo_documento)?.toUpperCase() || '';
  const docNumber = cleanText(person.num_documento);
  if (!docNumber) return { cpf: null, rg: null };

  const digits = stripDigits(docNumber);
  const looksLikeCpf = digits && digits.length === 11;
  if (docType.includes('CPF') || looksLikeCpf) {
    return { cpf: docNumber, rg: null };
  }

  return { cpf: null, rg: docNumber };
}

function inferTipoVaga(sexo) {
  const text = cleanText(sexo)?.toUpperCase() || '';
  if (text === 'F') return 'feminina';
  if (text === 'M') return 'masculina';
  return 'masculina';
}

function inferActiveState(latestObservation, latestTriagem) {
  const source = [latestTriagem?.observacao, latestObservation?.observacao].filter(Boolean).join(' | ').toLowerCase();
  const triagemActive = normalizeYesNo(latestTriagem?.is_active);
  if (triagemActive && (!latestTriagem?.data_saida || cleanText(latestTriagem.data_saida) === '')) {
    return true;
  }
  if (!source) return false;
  if (/(entrou na casa|entr\u00f3u na casa|entrou no albergue|autorizado a reentrar|liberado pelo monitor)/i.test(source)) return true;
  if (/(faltou no dia|bloqueado|saida da casa|saída da casa|retirado da casa|abandono|suspenso|desbloqueado)/i.test(source)) return false;
  return triagemActive === true;
}

function inferOcorrenciaTipo(text) {
  const value = (text || '').toLowerCase();
  if (/(sa[uú]de|hospital|m[eé]dico|medica)/i.test(value)) return 'saude';
  if (/(furto|roubo)/i.test(value)) return 'furto';
  if (/(dano|quebrou|depred|patrim)/i.test(value)) return 'dano_patrimonio';
  if (/(briga|conflito|amea[cç]a|agress|desrespeito|porte de arma|arma branca|furto|roubo)/i.test(value)) return 'conflito';
  return 'outros';
}

function inferSeveridade(text) {
  const value = (text || '').toLowerCase();
  if (/(agress[aã]o f[ií]sica|roubo|porte de arma|arma branca|critica|grave)/i.test(value)) return 'critica';
  if (/(amea[cç]a|desrespeito|agress[aã]o verbal|suspensa|suspenso)/i.test(value)) return 'alta';
  if (/(bloqueado|faltou|entrada|liberado|autorizado|prorroga)/i.test(value)) return 'baixa';
  return 'media';
}

function buildOccurrenceTitle(text) {
  const value = (text || '').toLowerCase();
  if (value.includes('entrou na casa')) return 'Entrada na casa';
  if (value.includes('entrou no albergue')) return 'Entrada no albergue';
  if (value.includes('faltou no dia')) return 'Falta na triagem';
  if (value.includes('bloqueado')) return 'Bloqueio registrado';
  if (value.includes('autorizado a reentrar')) return 'Reentrada autorizada';
  if (value.includes('liberado pelo monitor')) return 'Liberação pelo monitor';
  if (value.includes('prorrogação concedida') || value.includes('foi concedido mais')) return 'Prorrogação concedida';
  if (value.includes('saída da casa')) return 'Saída da casa';
  return 'Observação legada';
}

function inferBlockType(text, blockType) {
  const value = (text || '').toLowerCase();
  if (blockType === '1' || value.includes('faltou')) return 'abandono';
  if (/(amea[cç]a|agress[aã]o|desrespeito|brigou|roubo|furto|porte de arma|arma branca)/i.test(value)) return 'comportamento';
  if (/(suspensa|suspenso|administrativ|período de espera|periodo de espera)/i.test(value)) return 'administrativo';
  return 'outros';
}

function summarizePersonLegacy(person) {
  const parts = [
    person.escolaridade ? `escolaridade=${person.escolaridade}` : null,
    person.profissao ? `profissao=${person.profissao}` : null,
    person.tipo_documento ? `tipo_documento=${person.tipo_documento}` : null,
    person.num_documento ? `num_documento=${person.num_documento}` : null,
    person.procedencia ? `procedencia=${person.procedencia}` : null,
    person.procedencia_regiao ? `procedencia_regiao=${person.procedencia_regiao}` : null,
    person.local_nasci_usuario ? `naturalidade=${person.local_nasci_usuario}` : null,
    person.numero_nis ? `nis=${person.numero_nis}` : null,
  ].filter(Boolean);
  return parts.join('; ');
}

async function main() {
  const dumpPath = path.resolve(DEFAULT_DUMP_PATH);
  const text = readDump(dumpPath);
  const wantedTables = new Set(LEGACY_TABLES);

  const tableRows = new Map(LEGACY_TABLES.map((table) => [table, []]));
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseInsertLine(line.trim(), wantedTables);
    if (!parsed) continue;
    const rows = splitTuples(parsed.valuesPart).map((rowText) => splitFields(rowText).map(decodeValue));
    tableRows.get(parsed.table).push(...rows);
  }

  const usuarios = rowsToObjects(USER_COLUMNS, tableRows.get('iedc_usuario'));
  const entradas = rowsToObjects(ENTRADAS_COLUMNS, tableRows.get('iedc_entradas'));
  const bloqueios = rowsToObjects(BLOQUEIO_COLUMNS, tableRows.get('iedc_bloqueio'));
  const observacoes = rowsToObjects(OBS_COLUMNS, tableRows.get('iedc_observacao'));
  const triagens = rowsToObjects(TRIAGEM_COLUMNS, tableRows.get('iedc_triagem'));

  const entryIds = new Set(entradas.map((row) => Number(row.id_usuario)).filter((value) => Number.isFinite(value)));
  const userByLegacyId = new Map();
  for (const row of usuarios) {
    const legacyId = Number(row.id_usuario ?? row.id);
    if (!Number.isFinite(legacyId)) continue;
    const current = userByLegacyId.get(legacyId);
    if (!current) {
      userByLegacyId.set(legacyId, row);
      continue;
    }
    const currentModified = parseLegacyTimestamp(current.modified_on) || '';
    const nextModified = parseLegacyTimestamp(row.modified_on) || '';
    if (nextModified >= currentModified) {
      userByLegacyId.set(legacyId, row);
    }
  }

  const eligibleLegacyIds = [...entryIds].sort((a, b) => a - b);
  const missingLegacyIds = eligibleLegacyIds.filter((id) => !userByLegacyId.has(id));

  const triagemByLegacyId = new Map();
  for (const row of triagens) {
    const legacyId = Number(row.id_usuario);
    if (!Number.isFinite(legacyId) || !entryIds.has(legacyId)) continue;
    const current = triagemByLegacyId.get(legacyId);
    if (!current) {
      triagemByLegacyId.set(legacyId, row);
      continue;
    }
    const currentCreated = parseLegacyTimestamp(current.created_on) || '';
    const nextCreated = parseLegacyTimestamp(row.created_on) || '';
    if (nextCreated >= currentCreated) {
      triagemByLegacyId.set(legacyId, row);
    }
  }

  const obsByLegacyId = new Map();
  for (const row of observacoes) {
    const legacyId = Number(row.id_usuario);
    if (!Number.isFinite(legacyId) || !entryIds.has(legacyId)) continue;
    const list = obsByLegacyId.get(legacyId) || [];
    list.push(row);
    obsByLegacyId.set(legacyId, list);
  }

  const currentPeople = [];
  for (const legacyId of eligibleLegacyIds) {
    const legacyPerson = userByLegacyId.get(legacyId);
    const latestTriagem = triagemByLegacyId.get(legacyId) || null;
    const userObservations = obsByLegacyId.get(legacyId) || [];
    const latestObservation = userObservations.reduce((acc, row) => {
      const accTs = parseLegacyTimestamp(acc?.created_on || acc?.data_obs) || '';
      const rowTs = parseLegacyTimestamp(row.created_on || row.data_obs) || '';
      return rowTs >= accTs ? row : acc;
    }, null);

    const isPresent = inferActiveState(latestObservation, latestTriagem);
    const personName = cleanText(legacyPerson?.nome_usuario) || `LEGADO SEM CADASTRO #${legacyId}`;
    const docs = legacyPerson ? normalizeDocument(legacyPerson) : { cpf: null, rg: null };
    const dob = legacyPerson ? parseLegacyDate(legacyPerson.data_nasci_usuario) : null;
    const naturalidade = cleanText(legacyPerson?.local_nasci_usuario);
    const telefone = cleanText(legacyPerson?.telefone);
    const sexo = cleanText(legacyPerson?.sexo);
    const genero = cleanText(legacyPerson?.sexo) || cleanText(latestTriagem?.sexo) || cleanText(legacyPerson?.sexo);
    const etnia = cleanText(legacyPerson?.etnia) || cleanText(latestTriagem?.etnia);
    const procedencia = cleanText(legacyPerson?.procedencia) || cleanText(latestTriagem?.procedencia);
    const procedenciaRegiao = cleanText(legacyPerson?.procedencia_regiao);
    const occupation = cleanText(legacyPerson?.profissao);
    const medications = cleanText(legacyPerson?.medicamentos);
    const legacyNote = summarizePersonLegacy(legacyPerson || {});
    const parts = [];
    if (legacyNote) parts.push(`[LEGADO] ${legacyNote}`);
    if (latestTriagem) {
      parts.push(`ultima_triagem=${latestTriagem.data_triagem || ''}`);
      if (latestTriagem.chave !== null && latestTriagem.chave !== undefined) {
        parts.push(`chave=${latestTriagem.chave}`);
      }
      if (latestTriagem.reentrada) parts.push(`reentrada=${latestTriagem.reentrada}`);
    }
    if (latestObservation?.observacao) {
      parts.push(`ultimo_evento=${latestObservation.observacao}`);
    }
    if (!legacyPerson) {
      parts.push('cadastro_origem_nao_encontrado_no_dump_usuario');
    }

    currentPeople.push({
      legacy_id: legacyId,
      nome: personName,
      nome_social: cleanText(legacyPerson?.apelido_usuario),
      cpf: docs.cpf,
      rg: docs.rg,
      nis: cleanText(legacyPerson?.numero_nis),
      data_nascimento: dob,
      naturalidade,
      telefone,
      sexo,
      genero,
      cor: etnia,
      raca: etnia,
      sexualidade: null,
      endereco: procedenciaRegiao,
      cidade: procedencia,
      uf: null,
      cep: null,
      nome_mae: cleanText(legacyPerson?.nome_da_mae),
      nome_pai: null,
      contato_emergencia: null,
      telefone_emergencia: null,
      alergias: null,
      condicoes_cronicas: null,
      medicamentos_uso_continuo: medications,
      observacoes: parts.filter(Boolean).join(' | ') || null,
      status_cadastro: 'aprovado',
      tipo_vaga: inferTipoVaga(sexo || genero || latestTriagem?.sexo),
      foto_url: null,
      ativo: true,
      liberacao_antecipada: false,
      lgbt: false,
      data_liberacao_antecipada: null,
      presente: isPresent,
      created_at: parseLegacyTimestamp(legacyPerson?.created_on || latestTriagem?.created_on || latestObservation?.created_on) || new Date().toISOString(),
      updated_at: parseLegacyTimestamp(legacyPerson?.modified_on || latestTriagem?.modified_on || latestObservation?.modified_on) || new Date().toISOString(),
    });
  }

  const occurrenceRows = [];
  for (const legacyId of eligibleLegacyIds) {
    const list = obsByLegacyId.get(legacyId) || [];
    for (const row of list) {
      const textObs = cleanText(row.observacao) || '';
      occurrenceRows.push({
        legacy_id: Number(row.id),
        legacy_user_id: legacyId,
        tipo: inferOcorrenciaTipo(textObs),
        severidade: inferSeveridade(textObs),
        titulo: buildOccurrenceTitle(textObs),
        descricao: [
          textObs,
          row.origem ? `origem=${row.origem}` : null,
          `legacy_id=${row.id}`,
        ].filter(Boolean).join(' | '),
        data_ocorrencia: parseLegacyTimestamp(row.created_on || row.data_obs) || parseLegacyDate(row.data_obs) || new Date().toISOString(),
        criado_por: 'LEGADO',
      });
    }
  }

  const estadiaRows = [];
  for (const legacyId of eligibleLegacyIds) {
    const row = triagemByLegacyId.get(legacyId);
    if (!row) continue;
    const checkin = parseLegacyDate(row.data_entrada) || parseLegacyTimestamp(row.created_on) || new Date().toISOString().slice(0, 10);
    const checkout = parseLegacyDate(row.data_saida);
    const limite = checkout || parseLegacyDate(row.data_saida) || checkin.slice(0, 10);
    const daysProrrogacao = formatDaysBetween(parseLegacyDate(row.data_entrada), parseLegacyDate(row.data_saida));
    estadiaRows.push({
      legacy_id: Number(row.id),
      legacy_user_id: legacyId,
      data_checkin: checkin.length === 10 ? `${checkin}T00:00:00` : checkin,
      data_checkout: checkout ? `${checkout}T00:00:00` : null,
      data_limite: limite,
      numero_vaga: Number.isFinite(Number(row.chave)) && Number(row.chave) > 0 ? Number(row.chave) : 1,
      status: checkout ? 'finalizada' : 'ativa',
      observacoes_checkin: [
        row.origem ? `origem=${row.origem}` : null,
        row.reentrada ? `reentrada=${row.reentrada}` : null,
        row.filhos ? `filhos=${row.filhos}` : null,
        row.sexo ? `sexo=${row.sexo}` : null,
        row.chave ? `chave=${row.chave}` : null,
      ].filter(Boolean).join(' | ') || null,
      observacoes_checkout: row.data_saida ? `saida_legacy=${row.data_saida}` : null,
      funcionario_checkin: 'LEGADO',
      funcionario_checkout: 'LEGADO',
      prorrogada: Number.isFinite(daysProrrogacao) ? daysProrrogacao > 15 : false,
      dias_prorrogacao: Number.isFinite(daysProrrogacao) ? Math.max(daysProrrogacao - 15, 0) : 0,
      motivo_prorrogacao: row.origem ? `origem=${row.origem}` : null,
      motivo_saida: checkout ? 'voluntario' : null,
      cama_id: null,
      created_at: parseLegacyTimestamp(row.created_on) || new Date().toISOString(),
      updated_at: parseLegacyTimestamp(row.modified_on) || new Date().toISOString(),
    });
  }

  const blockRows = [];
  for (const row of bloqueios) {
    const legacyId = Number(row.id_usuario);
    if (!entryIds.has(legacyId)) continue;
    const textObs = cleanText(row.observacao) || '';
    const dataInicio = parseLegacyDate(row.data_bloqueio) || parseLegacyTimestamp(row.created_on) || new Date().toISOString().slice(0, 10);
    const dataFim = parseLegacyDate(row.data_saida);
    blockRows.push({
      legacy_id: Number(row.id),
      legacy_user_id: legacyId,
      tipo: inferBlockType(textObs, cleanText(row.tipo)),
      motivo: textObs || `Bloqueio legado #${row.id}`,
      data_inicio: dataInicio,
      data_fim: dataFim,
      dias_bloqueio: formatDaysBetween(dataInicio, dataFim),
      criado_por: 'LEGADO',
      ativo: normalizeYesNo(row.is_active) ?? true,
      observacoes: [
        row.origem ? `origem=${row.origem}` : null,
        row.tipo ? `tipo_legado=${row.tipo}` : null,
        row.chave ? `chave=${row.chave}` : null,
        `legacy_id=${row.id}`,
      ].filter(Boolean).join(' | ') || null,
      liberacao_antecipada: /(liberad|autorizad)/i.test(textObs),
      data_liberacao_antecipada: /(liberad|autorizad)/i.test(textObs) ? parseLegacyTimestamp(row.modified_on || row.created_on) : null,
      liberado_por: /(liberad|autorizad)/i.test(textObs) ? 'LEGADO' : null,
      created_at: parseLegacyTimestamp(row.created_on) || new Date().toISOString(),
      updated_at: parseLegacyTimestamp(row.modified_on) || new Date().toISOString(),
    });
  }

  const prorrogaRows = [];
  for (const occ of occurrenceRows) {
    if (!/prorroga/i.test(occ.titulo) && !/foi concedido mais/i.test(occ.descricao)) continue;
    const [legacyText] = occ.descricao.split(' | ');
    prorrogaRows.push({
      pessoa_legacy_id: occ.legacy_user_id,
      tipo: 'prorrogacao',
      status: 'aprovada',
      titulo: occ.titulo,
      justificativa: legacyText || occ.descricao,
      solicitado_por: 'LEGADO',
      data_solicitacao: occ.data_ocorrencia,
      analisado_por: 'LEGADO',
      data_analise: occ.data_ocorrencia,
      parecer: occ.descricao,
      dias_prorrogacao: 15,
      nova_data_limite: null,
      data_inicio_bloqueio: null,
      data_fim_bloqueio: null,
      motivo_bloqueio: null,
      observacoes: 'Importado do legado',
      created_at: occ.data_ocorrencia,
      updated_at: occ.data_ocorrencia,
    });
  }

  const summary = {
    dumpPath,
    tables: Object.fromEntries([...tableRows.entries()].map(([table, rows]) => [table, rows.length])),
    entryUsers: eligibleLegacyIds.length,
    missingCadastroUsers: missingLegacyIds,
    peopleToInsert: currentPeople.length,
    triagensToInsert: estadiaRows.length,
    bloqueiosToInsert: blockRows.length,
    ocorrenciasToInsert: occurrenceRows.length,
    prorrogaToInsert: prorrogaRows.length,
    activePeople: currentPeople.filter((person) => person.presente).length,
    coverage: (() => {
      const relevantUsers = eligibleLegacyIds.map((legacyId) => userByLegacyId.get(legacyId)).filter(Boolean);
      const fields = [
        'nome_usuario',
        'apelido_usuario',
        'data_nasci_usuario',
        'local_nasci_usuario',
        'escolaridade',
        'num_documento',
        'telefone',
        'profissao',
        'medicamentos',
        'bloqueado',
        'na_casa',
        'em_espera',
        'sexo',
        'etnia',
        'procedencia',
        'procedencia_regiao',
        'nome_da_mae',
        'numero_nis',
      ];
      const totals = {};
      for (const field of fields) {
        const filled = relevantUsers.filter((row) => cleanText(row?.[field]) !== null).length;
        totals[field] = {
          filled,
          total: relevantUsers.length,
          pct: relevantUsers.length ? Number(((filled / relevantUsers.length) * 100).toFixed(1)) : 0,
        };
      }
      return totals;
    })(),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (REPORT_ONLY) {
    return;
  }

  const { Pool } = await import('pg');
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'albergue',
  };

  if (!dbConfig.password) {
    die('DB_PASSWORD is required for import.');
  }

  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  const tablesToReset = ['solicitacoes', 'ocorrencias', 'bloqueios', 'estadias', 'pessoas'];
  try {
    await client.query('BEGIN');

    if (RESET_TARGETS) {
      await client.query(`TRUNCATE TABLE ${tablesToReset.join(', ')} RESTART IDENTITY CASCADE`);
    }

    const personIdByLegacyId = new Map();
    for (const person of currentPeople) {
      const result = await client.query(
        `INSERT INTO pessoas (
          nome, nome_social, cpf, rg, nis, data_nascimento, naturalidade, telefone, sexo, genero,
          cor, raca, sexualidade, endereco, cidade, uf, cep, nome_mae, nome_pai, contato_emergencia,
          telefone_emergencia, alergias, condicoes_cronicas, medicamentos_uso_continuo, observacoes,
          status_cadastro, tipo_vaga, foto_url, ativo, liberacao_antecipada, lgbt,
          data_liberacao_antecipada, presente, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,
          $26,$27,$28,$29,$30,$31,
          $32,$33,$34,$35
        ) RETURNING id`,
        [
          person.nome,
          person.nome_social,
          person.cpf,
          person.rg,
          person.nis,
          person.data_nascimento,
          person.naturalidade,
          person.telefone,
          person.sexo,
          person.genero,
          person.cor,
          person.raca,
          person.sexualidade,
          person.endereco,
          person.cidade,
          person.uf,
          person.cep,
          person.nome_mae,
          person.nome_pai,
          person.contato_emergencia,
          person.telefone_emergencia,
          person.alergias,
          person.condicoes_cronicas,
          person.medicamentos_uso_continuo,
          person.observacoes,
          person.status_cadastro,
          person.tipo_vaga,
          person.foto_url,
          person.ativo,
          person.liberacao_antecipada,
          person.lgbt,
          person.data_liberacao_antecipada,
          person.presente,
          person.created_at,
          person.updated_at,
        ],
      );
      personIdByLegacyId.set(person.legacy_id, result.rows[0].id);
    }

    const batchInsert = async (tableName, columns, rows, mapRow) => {
      const batchSize = 250;
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const chunk = rows.slice(offset, offset + batchSize);
        const values = [];
        const placeholders = [];
        let parameterIndex = 1;
        for (const row of chunk) {
          const mapped = mapRow(row);
          placeholders.push(`(${mapped.map(() => `$${parameterIndex++}`).join(', ')})`);
          values.push(...mapped);
        }
        await client.query(
          `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`,
          values,
        );
      }
    };

    await batchInsert(
      'estadias',
      [
        'pessoa_id',
        'data_checkin',
        'data_checkout',
        'data_limite',
        'numero_vaga',
        'status',
        'observacoes_checkin',
        'observacoes_checkout',
        'funcionario_checkin',
        'funcionario_checkout',
        'prorrogada',
        'dias_prorrogacao',
        'motivo_prorrogacao',
        'motivo_saida',
        'cama_id',
        'created_at',
        'updated_at',
      ],
      estadiaRows,
      (row) => [
        personIdByLegacyId.get(row.legacy_user_id),
        row.data_checkin,
        row.data_checkout,
        row.data_limite,
        row.numero_vaga,
        row.status,
        row.observacoes_checkin,
        row.observacoes_checkout,
        row.funcionario_checkin,
        row.funcionario_checkout,
        row.prorrogada,
        row.dias_prorrogacao,
        row.motivo_prorrogacao,
        row.motivo_saida,
        row.cama_id,
        row.created_at,
        row.updated_at,
      ],
    );

    await batchInsert(
      'bloqueios',
      [
        'pessoa_id',
        'tipo',
        'motivo',
        'data_inicio',
        'data_fim',
        'dias_bloqueio',
        'criado_por',
        'ativo',
        'observacoes',
        'liberacao_antecipada',
        'data_liberacao_antecipada',
        'liberado_por',
        'created_at',
        'updated_at',
      ],
      blockRows,
      (row) => [
        personIdByLegacyId.get(row.legacy_user_id),
        row.tipo,
        row.motivo,
        row.data_inicio,
        row.data_fim,
        row.dias_bloqueio,
        row.criado_por,
        row.ativo,
        row.observacoes,
        row.liberacao_antecipada,
        row.data_liberacao_antecipada,
        row.liberado_por,
        row.created_at,
        row.updated_at,
      ],
    );

    await batchInsert(
      'ocorrencias',
      ['pessoa_id', 'tipo', 'severidade', 'titulo', 'descricao', 'data_ocorrencia', 'criado_por'],
      occurrenceRows,
      (row) => [
        personIdByLegacyId.get(row.legacy_user_id),
        row.tipo,
        row.severidade,
        row.titulo,
        row.descricao,
        row.data_ocorrencia,
        row.criado_por,
      ],
    );

    if (prorrogaRows.length > 0) {
      await batchInsert(
        'solicitacoes',
        [
          'pessoa_id',
          'tipo',
          'status',
          'titulo',
          'justificativa',
          'solicitado_por',
          'data_solicitacao',
          'analisado_por',
          'data_analise',
          'parecer',
          'dias_prorrogacao',
          'nova_data_limite',
          'data_inicio_bloqueio',
          'data_fim_bloqueio',
          'motivo_bloqueio',
          'observacoes',
          'created_at',
          'updated_at',
        ],
        prorrogaRows,
        (row) => [
          personIdByLegacyId.get(row.pessoa_legacy_id),
          row.tipo,
          row.status,
          row.titulo,
          row.justificativa,
          row.solicitado_por,
          row.data_solicitacao,
          row.analisado_por,
          row.data_analise,
          row.parecer,
          row.dias_prorrogacao,
          row.nova_data_limite,
          row.data_inicio_bloqueio,
          row.data_fim_bloqueio,
          row.motivo_bloqueio,
          row.observacoes,
          row.created_at,
          row.updated_at,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(`Import finished. People inserted: ${currentPeople.length}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
