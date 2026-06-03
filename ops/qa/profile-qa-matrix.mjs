#!/usr/bin/env node

const roles = {
  suporte: 'suporte',
  gestora: 'gestora',
  equipeTecnica: 'equipe_tecnica',
  coordenadorAlbergue: 'coordenador_albergue',
  educadorAlbergue: 'educador_albergue',
  coordenadorCreche: 'coordenador_creche',
  educadorCreche: 'educador_creche',
  financeiro: 'financeiro',
  lojaBazar: 'loja_bazar',
  lojaBrecho: 'loja_brecho',
  lojaFeirao: 'loja_feirao',
};

function canAccessPath(role, pathname) {
  if (pathname === '/minha-conta') {
    return true;
  }

  if (pathname.startsWith('/suporte')) {
    return role === roles.suporte;
  }

  if (pathname.includes('/auditoria')) {
    return false;
  }

  if (pathname === '/albergue/relatorios') {
    return role === roles.gestora || role === roles.equipeTecnica || role === roles.coordenadorAlbergue;
  }

  if (pathname === '/creche/relatorios') {
    return role === roles.gestora || role === roles.equipeTecnica || role === roles.coordenadorCreche;
  }

  if (pathname === '/lojas/secretaria/relatorio-executivo') {
    return role === roles.gestora || role === roles.financeiro;
  }

  if (pathname === '/lojas/secretaria/caixa') {
    return role === roles.financeiro;
  }

  if (role === roles.suporte) {
    return false;
  }

  if (role === roles.gestora) {
    if (pathname.startsWith('/lojas/') && pathname !== '/lojas/secretaria') {
      return false;
    }

    return true;
  }

  if (role === roles.equipeTecnica) {
    if (pathname.startsWith('/lojas/') && !pathname.startsWith('/lojas/secretaria')) {
      return false;
    }

    return true;
  }

  if (role === roles.coordenadorAlbergue || role === roles.educadorAlbergue) {
    return pathname.startsWith('/albergue') || pathname === '/dashboard';
  }

  if (role === roles.coordenadorCreche || role === roles.educadorCreche) {
    return pathname.startsWith('/creche');
  }

  if (role === roles.financeiro) {
    return pathname === '/lojas/secretaria' || pathname.startsWith('/lojas/secretaria/');
  }

  if (role === roles.lojaBazar) {
    return pathname === '/lojas/bazar' || pathname === '/lojas/bazar/produtos';
  }

  if (role === roles.lojaBrecho) {
    return pathname === '/lojas/brecho' || pathname === '/lojas/brecho/produtos';
  }

  if (role === roles.lojaFeirao) {
    return pathname === '/lojas/feirao' || pathname === '/lojas/feirao/produtos';
  }

  return false;
}

const suites = [
  {
    group: 'suporte',
    role: roles.suporte,
    allow: ['/suporte/usuarios', '/suporte/auditoria', '/suporte/saude', '/minha-conta'],
    deny: ['/gestao', '/gestao/qualidade-dados', '/albergue', '/creche', '/lojas/secretaria', '/lojas/bazar'],
  },
  {
    group: 'gestao',
    role: roles.gestora,
    allow: ['/gestao', '/gestao/qualidade-dados', '/albergue', '/albergue/relatorios', '/albergue/qualidade-dados', '/creche', '/creche/relatorios', '/creche/qualidade-dados', '/lojas/secretaria', '/lojas/secretaria/relatorio-executivo', '/minha-conta'],
    deny: ['/gestao/auditoria', '/albergue/auditoria', '/creche/auditoria', '/suporte/usuarios', '/suporte/auditoria', '/lojas/secretaria/caixa', '/lojas/bazar', '/lojas/brecho', '/lojas/feirao'],
  },
  {
    group: 'albergue',
    role: roles.coordenadorAlbergue,
    allow: ['/albergue', '/albergue/buscar', '/albergue/relatorios', '/albergue/qualidade-dados', '/dashboard', '/minha-conta'],
    deny: ['/gestao', '/gestao/qualidade-dados', '/albergue/auditoria', '/creche', '/creche/auditoria', '/suporte/usuarios', '/lojas/secretaria'],
  },
  {
    group: 'albergue',
    role: roles.educadorAlbergue,
    allow: ['/albergue', '/albergue/buscar', '/albergue/qualidade-dados', '/dashboard', '/minha-conta'],
    deny: ['/gestao', '/albergue/auditoria', '/albergue/relatorios', '/creche', '/suporte/auditoria', '/lojas/secretaria'],
  },
  {
    group: 'creche',
    role: roles.coordenadorCreche,
    allow: ['/creche', '/creche/criancas', '/creche/turmas', '/creche/relatorios', '/creche/qualidade-dados', '/minha-conta'],
    deny: ['/gestao', '/gestao/qualidade-dados', '/albergue', '/albergue/auditoria', '/creche/auditoria', '/suporte/usuarios', '/lojas/secretaria'],
  },
  {
    group: 'creche',
    role: roles.educadorCreche,
    allow: ['/creche', '/creche/criancas', '/creche/frequencia', '/creche/qualidade-dados', '/minha-conta'],
    deny: ['/gestao', '/creche/auditoria', '/creche/relatorios', '/albergue', '/suporte/auditoria', '/lojas/secretaria'],
  },
  {
    group: 'lojas',
    role: roles.financeiro,
    allow: ['/lojas/secretaria', '/lojas/secretaria/fila', '/lojas/secretaria/historico', '/lojas/secretaria/caixa', '/lojas/secretaria/relatorio-executivo', '/lojas/secretaria/qualidade-dados', '/minha-conta'],
    deny: ['/gestao', '/gestao/qualidade-dados', '/albergue', '/creche', '/suporte/usuarios', '/lojas/secretaria/auditoria', '/lojas/bazar'],
  },
  {
    group: 'lojas',
    role: roles.lojaBazar,
    allow: ['/lojas/bazar', '/lojas/bazar/produtos', '/minha-conta'],
    deny: ['/lojas/bazar/historico', '/lojas/brecho', '/lojas/feirao', '/lojas/secretaria', '/lojas/secretaria/caixa', '/lojas/secretaria/relatorio-executivo', '/lojas/secretaria/qualidade-dados', '/gestao', '/suporte/auditoria'],
  },
  {
    group: 'lojas',
    role: roles.lojaBrecho,
    allow: ['/lojas/brecho', '/lojas/brecho/produtos', '/minha-conta'],
    deny: ['/lojas/brecho/historico', '/lojas/bazar', '/lojas/feirao', '/lojas/secretaria', '/lojas/secretaria/caixa', '/lojas/secretaria/relatorio-executivo', '/lojas/secretaria/qualidade-dados', '/gestao', '/suporte/usuarios'],
  },
  {
    group: 'lojas',
    role: roles.lojaFeirao,
    allow: ['/lojas/feirao', '/lojas/feirao/produtos', '/minha-conta'],
    deny: ['/lojas/feirao/historico', '/lojas/bazar', '/lojas/brecho', '/lojas/secretaria', '/lojas/secretaria/caixa', '/lojas/secretaria/relatorio-executivo', '/lojas/secretaria/qualidade-dados', '/gestao', '/suporte/auditoria'],
  },
  {
    group: 'leitura',
    role: roles.equipeTecnica,
    allow: ['/gestao', '/gestao/qualidade-dados', '/albergue', '/albergue/relatorios', '/albergue/qualidade-dados', '/creche', '/creche/relatorios', '/creche/qualidade-dados', '/lojas/secretaria', '/lojas/secretaria/qualidade-dados', '/minha-conta'],
    deny: ['/suporte/usuarios', '/suporte/auditoria', '/lojas/secretaria/caixa', '/lojas/secretaria/relatorio-executivo', '/lojas/bazar', '/lojas/brecho', '/lojas/feirao'],
  },
];

const notificationSuites = [
  {
    role: roles.suporte,
    allowed: ['tecnica', 'auditoria_completa', 'backup'],
    forbidden: ['total_loja'],
  },
  {
    role: roles.gestora,
    allowed: ['executiva', 'financeiro_agregado'],
    forbidden: ['auditoria_critica', 'metadados_suporte'],
  },
  {
    role: roles.equipeTecnica,
    allowed: ['executiva', 'operacional_transversal'],
    forbidden: ['auditoria_sensivel'],
  },
  {
    role: roles.coordenadorAlbergue,
    allowed: ['albergue'],
    forbidden: ['auditoria_area', 'creche', 'financeiro_agregado', 'metadados_suporte'],
  },
  {
    role: roles.educadorAlbergue,
    allowed: ['albergue', 'recibo'],
    forbidden: ['auditoria_area', 'relatorio_gerencial', 'financeiro_agregado'],
  },
  {
    role: roles.coordenadorCreche,
    allowed: ['creche'],
    forbidden: ['auditoria_area', 'albergue', 'financeiro_agregado', 'metadados_suporte'],
  },
  {
    role: roles.educadorCreche,
    allowed: ['creche', 'recibo'],
    forbidden: ['auditoria_area', 'relatorio_gerencial', 'financeiro_agregado'],
  },
  {
    role: roles.financeiro,
    allowed: ['financeiro', 'previsto_realizado_pendente'],
    forbidden: ['auditoria_financeira', 'albergue', 'creche', 'metadados_suporte'],
  },
  {
    role: roles.lojaBazar,
    allowed: ['loja_bazar', 'recibo', 'retirada'],
    forbidden: ['relatorio', 'total_dia', 'total_periodo', 'financeiro_agregado', 'loja_brecho', 'loja_feirao'],
  },
  {
    role: roles.lojaBrecho,
    allowed: ['loja_brecho', 'recibo', 'retirada'],
    forbidden: ['relatorio', 'total_dia', 'total_periodo', 'financeiro_agregado', 'loja_bazar', 'loja_feirao'],
  },
  {
    role: roles.lojaFeirao,
    allowed: ['loja_feirao', 'recibo', 'retirada'],
    forbidden: ['relatorio', 'total_dia', 'total_periodo', 'financeiro_agregado', 'loja_bazar', 'loja_brecho'],
  },
];

function notificationPolicy(role) {
  if (role === roles.suporte) {
    return ['tecnica', 'auditoria_completa', 'backup', 'metadados_suporte'];
  }

  if (role === roles.gestora) {
    return ['executiva', 'financeiro_agregado', 'albergue', 'creche'];
  }

  if (role === roles.equipeTecnica) {
    return ['executiva', 'operacional_transversal', 'albergue', 'creche', 'financeiro'];
  }

  if (role === roles.coordenadorAlbergue) {
    return ['albergue'];
  }

  if (role === roles.educadorAlbergue) {
    return ['albergue', 'recibo'];
  }

  if (role === roles.coordenadorCreche) {
    return ['creche'];
  }

  if (role === roles.educadorCreche) {
    return ['creche', 'recibo'];
  }

  if (role === roles.financeiro) {
    return ['financeiro', 'previsto_realizado_pendente'];
  }

  if (role === roles.lojaBazar) {
    return ['loja_bazar', 'recibo', 'retirada'];
  }

  if (role === roles.lojaBrecho) {
    return ['loja_brecho', 'recibo', 'retirada'];
  }

  if (role === roles.lojaFeirao) {
    return ['loja_feirao', 'recibo', 'retirada'];
  }

  return [];
}

const failures = [];
let checks = 0;

for (const suite of suites) {
  for (const path of suite.allow) {
    checks += 1;
    if (!canAccessPath(suite.role, path)) {
      failures.push(`[${suite.group}/${suite.role}] deveria permitir ${path}`);
    }
  }

  for (const path of suite.deny) {
    checks += 1;
    if (canAccessPath(suite.role, path)) {
      failures.push(`[${suite.group}/${suite.role}] deveria bloquear ${path}`);
    }
  }
}

for (const suite of notificationSuites) {
  const policy = notificationPolicy(suite.role);

  for (const token of suite.allowed) {
    checks += 1;
    if (!policy.includes(token)) {
      failures.push(`[notificacoes/${suite.role}] deveria incluir ${token}`);
    }
  }

  for (const token of suite.forbidden) {
    checks += 1;
    if (policy.includes(token)) {
      failures.push(`[notificacoes/${suite.role}] deveria ocultar ${token}`);
    }
  }
}

if (failures.length) {
  console.error('QA por perfil falhou:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const groups = [...new Set(suites.map((suite) => suite.group))].join(', ');
console.log(`QA por perfil aprovado: ${checks} checks, ${suites.length} perfis, grupos ${groups}.`);
