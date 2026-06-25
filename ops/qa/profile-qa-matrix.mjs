#!/usr/bin/env node

const roles = {
  suporte: 'suporte',
  gestora: 'gestora',
  coordenadorAlbergue: 'coordenador_albergue',
  auxiliarCoordenacaoAlbergue: 'auxiliar_coordenacao_albergue',
  diretorAlbergue: 'diretor_albergue',
  equipeTecnicaAlbergue: 'equipe_tecnica_albergue',
  educadorAlbergue: 'educador_albergue',
  coordenadorCreche: 'coordenador_creche',
  educadorCreche: 'educador_creche',
  comercial: 'comercial',
  lojaBazar: 'loja_bazar',
  lojaBrecho: 'loja_brecho',
  lojaFeirao: 'loja_feirao',
};

const albergueRead = [
  roles.gestora,
  roles.coordenadorAlbergue,
  roles.auxiliarCoordenacaoAlbergue,
  roles.diretorAlbergue,
  roles.equipeTecnicaAlbergue,
  roles.educadorAlbergue,
];
const albergueOperation = [
  roles.gestora,
  roles.coordenadorAlbergue,
  roles.auxiliarCoordenacaoAlbergue,
  roles.educadorAlbergue,
];
const albergueCoordination = [
  roles.gestora,
  roles.coordenadorAlbergue,
  roles.auxiliarCoordenacaoAlbergue,
];
const albergueManagementRead = [...albergueCoordination, roles.diretorAlbergue];
const albergueDataQuality = [...albergueCoordination, roles.equipeTecnicaAlbergue];
const alberguePersonRead = albergueRead.filter((role) => role !== roles.diretorAlbergue);

function canAccessPath(role, pathname) {
  if (pathname === '/minha-conta') return true;
  if (pathname.startsWith('/suporte')) return role === roles.suporte;
  if (pathname.includes('/auditoria')) return false;

  if (pathname === '/albergue/relatorios') return albergueManagementRead.includes(role);
  if (pathname === '/albergue/conferencia-rma') return albergueCoordination.includes(role);
  if (pathname === '/albergue/qualidade-dados') return albergueDataQuality.includes(role);
  if (pathname === '/albergue/presencas') return albergueOperation.includes(role);
  if (pathname === '/albergue/buscar' || pathname.startsWith('/albergue/pessoa/')) {
    return alberguePersonRead.includes(role);
  }

  if (pathname === '/escola/relatorios') {
    return role === roles.gestora || role === roles.coordenadorCreche;
  }
  if (pathname === '/lojas/secretaria/relatorio-executivo') {
    return role === roles.gestora || role === roles.comercial;
  }
  if (pathname === '/lojas/secretaria/caixa') return role === roles.comercial;

  if (role === roles.suporte) return false;
  if (role === roles.gestora) {
    return !(pathname.startsWith('/lojas/') && pathname !== '/lojas/secretaria');
  }
  if (albergueRead.includes(role)) {
    return pathname.startsWith('/albergue') || pathname === '/dashboard';
  }
  if (role === roles.coordenadorCreche || role === roles.educadorCreche) {
    return pathname.startsWith('/escola');
  }
  if (role === roles.comercial) {
    return pathname === '/lojas/secretaria' || pathname.startsWith('/lojas/secretaria/');
  }
  if (role === roles.lojaBazar) return pathname === '/lojas/bazar' || pathname === '/lojas/bazar/produtos';
  if (role === roles.lojaBrecho) return pathname === '/lojas/brecho' || pathname === '/lojas/brecho/produtos';
  if (role === roles.lojaFeirao) return pathname === '/lojas/feirao' || pathname === '/lojas/feirao/produtos';
  return false;
}

const suites = [
  {
    group: 'suporte', role: roles.suporte,
    allow: ['/suporte/usuarios', '/suporte/saude', '/minha-conta'],
    deny: ['/gestao', '/albergue', '/escola', '/lojas/secretaria'],
  },
  {
    group: 'gestao', role: roles.gestora,
    allow: ['/gestao', '/albergue', '/albergue/relatorios', '/escola', '/escola/relatorios', '/lojas/secretaria'],
    deny: ['/albergue/auditoria', '/suporte/usuarios', '/lojas/secretaria/caixa', '/lojas/bazar'],
  },
  {
    group: 'albergue', role: roles.coordenadorAlbergue,
    allow: ['/albergue', '/albergue/buscar', '/albergue/relatorios', '/albergue/qualidade-dados', '/albergue/presencas', '/albergue/conferencia-rma'],
    deny: ['/gestao', '/escola', '/lojas/secretaria', '/suporte/usuarios'],
  },
  {
    group: 'albergue', role: roles.auxiliarCoordenacaoAlbergue,
    allow: ['/albergue', '/albergue/buscar', '/albergue/relatorios', '/albergue/qualidade-dados', '/albergue/presencas', '/albergue/conferencia-rma'],
    deny: ['/gestao', '/escola', '/lojas/secretaria', '/suporte/usuarios'],
  },
  {
    group: 'albergue-leitura', role: roles.diretorAlbergue,
    allow: ['/albergue', '/albergue/relatorios', '/albergue/impacto-social', '/minha-conta'],
    deny: ['/albergue/buscar', '/albergue/presencas', '/albergue/qualidade-dados', '/albergue/conferencia-rma', '/gestao', '/escola', '/lojas/secretaria'],
  },
  {
    group: 'albergue-leitura', role: roles.equipeTecnicaAlbergue,
    allow: ['/albergue', '/albergue/buscar', '/albergue/qualidade-dados', '/albergue/impacto-social', '/minha-conta'],
    deny: ['/albergue/relatorios', '/albergue/presencas', '/albergue/conferencia-rma', '/gestao', '/escola', '/lojas/secretaria'],
  },
  {
    group: 'albergue-operacao', role: roles.educadorAlbergue,
    allow: ['/albergue', '/albergue/buscar', '/albergue/presencas', '/albergue/impacto-social', '/minha-conta'],
    deny: ['/albergue/relatorios', '/albergue/qualidade-dados', '/albergue/conferencia-rma', '/gestao', '/escola', '/lojas/secretaria'],
  },
  {
    group: 'escola', role: roles.coordenadorCreche,
    allow: ['/escola', '/escola/criancas', '/escola/turmas', '/escola/relatorios'],
    deny: ['/gestao', '/albergue', '/lojas/secretaria', '/suporte/usuarios'],
  },
  {
    group: 'escola', role: roles.educadorCreche,
    allow: ['/escola', '/escola/criancas', '/escola/frequencia'],
    deny: ['/escola/relatorios', '/gestao', '/albergue', '/lojas/secretaria'],
  },
  {
    group: 'comercial', role: roles.comercial,
    allow: ['/lojas/secretaria', '/lojas/secretaria/historico', '/lojas/secretaria/caixa', '/lojas/secretaria/relatorio-executivo'],
    deny: ['/gestao', '/albergue', '/escola', '/lojas/bazar'],
  },
  {
    group: 'loja', role: roles.lojaBazar,
    allow: ['/lojas/bazar', '/lojas/bazar/produtos'],
    deny: ['/lojas/brecho', '/lojas/secretaria', '/gestao', '/albergue'],
  },
  {
    group: 'loja', role: roles.lojaBrecho,
    allow: ['/lojas/brecho', '/lojas/brecho/produtos'],
    deny: ['/lojas/bazar', '/lojas/secretaria', '/gestao', '/albergue'],
  },
  {
    group: 'loja', role: roles.lojaFeirao,
    allow: ['/lojas/feirao', '/lojas/feirao/produtos'],
    deny: ['/lojas/bazar', '/lojas/secretaria', '/gestao', '/albergue'],
  },
];

function notificationPolicy(role) {
  if (role === roles.suporte) return ['tecnica', 'auditoria_completa', 'backup'];
  if (role === roles.gestora) return ['executiva', 'comercial_agregado', 'albergue', 'escola'];
  if ([roles.coordenadorAlbergue, roles.auxiliarCoordenacaoAlbergue, roles.diretorAlbergue, roles.equipeTecnicaAlbergue].includes(role)) return ['albergue'];
  if (role === roles.educadorAlbergue) return ['albergue', 'recibo'];
  if (role === roles.coordenadorCreche) return ['escola'];
  if (role === roles.educadorCreche) return ['escola', 'recibo'];
  if (role === roles.comercial) return ['comercial', 'previsto_realizado_pendente'];
  if (role === roles.lojaBazar) return ['loja_bazar', 'recibo', 'retirada'];
  if (role === roles.lojaBrecho) return ['loja_brecho', 'recibo', 'retirada'];
  if (role === roles.lojaFeirao) return ['loja_feirao', 'recibo', 'retirada'];
  return [];
}

const notificationSuites = [
  { role: roles.suporte, allow: ['tecnica', 'backup'], deny: ['albergue'] },
  { role: roles.gestora, allow: ['executiva', 'albergue', 'escola'], deny: ['auditoria_completa'] },
  { role: roles.coordenadorAlbergue, allow: ['albergue'], deny: ['escola', 'comercial_agregado'] },
  { role: roles.auxiliarCoordenacaoAlbergue, allow: ['albergue'], deny: ['escola', 'comercial_agregado'] },
  { role: roles.diretorAlbergue, allow: ['albergue'], deny: ['escola', 'comercial_agregado'] },
  { role: roles.equipeTecnicaAlbergue, allow: ['albergue'], deny: ['escola', 'comercial_agregado'] },
  { role: roles.educadorAlbergue, allow: ['albergue', 'recibo'], deny: ['escola', 'comercial_agregado'] },
];

const failures = [];
let checks = 0;

for (const suite of suites) {
  for (const path of suite.allow) {
    checks += 1;
    if (!canAccessPath(suite.role, path)) failures.push(`[${suite.group}/${suite.role}] deveria permitir ${path}`);
  }
  for (const path of suite.deny) {
    checks += 1;
    if (canAccessPath(suite.role, path)) failures.push(`[${suite.group}/${suite.role}] deveria bloquear ${path}`);
  }
}

for (const suite of notificationSuites) {
  const policy = notificationPolicy(suite.role);
  for (const token of suite.allow) {
    checks += 1;
    if (!policy.includes(token)) failures.push(`[notificacoes/${suite.role}] deveria incluir ${token}`);
  }
  for (const token of suite.deny) {
    checks += 1;
    if (policy.includes(token)) failures.push(`[notificacoes/${suite.role}] deveria ocultar ${token}`);
  }
}

if (failures.length) {
  console.error('QA por perfil falhou:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`QA por perfil aprovado: ${checks} checks, ${suites.length} perfis.`);
