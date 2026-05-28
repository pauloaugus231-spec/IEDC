import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createManagedUser,
  listManagedUsers,
  resetManagedUserPassword,
  updateManagedUser,
  type ManagedUser,
  type ManagedUserRole,
} from '../api';
import { useAuth } from '../context/AuthContext';
import '../styles/institutional.css';

const roleOptions: Array<{ value: ManagedUserRole; label: string; detail: string }> = [
  { value: 'gestora', label: 'Gestão', detail: 'Acesso institucional amplo' },
  { value: 'suporte', label: 'Suporte', detail: 'Criação de usuários e suporte operacional' },
  { value: 'equipe_tecnica', label: 'Equipe técnica', detail: 'Gestão, Albergue, E.E.I. e secretaria' },
  { value: 'coordenador_albergue', label: 'Coordenação Albergue', detail: 'Operação e relatórios do Albergue' },
  { value: 'educador_albergue', label: 'Educador Albergue', detail: 'Rotina operacional do Albergue' },
  { value: 'coordenador_creche', label: 'Coordenação E.E.I.', detail: 'Gestão pedagógica e relatórios da E.E.I.' },
  { value: 'educador_creche', label: 'Educador E.E.I.', detail: 'Crianças, turmas e frequência' },
  { value: 'financeiro', label: 'Secretaria / Financeiro', detail: 'Recebimentos e visão financeira das lojas' },
  { value: 'loja_bazar', label: 'Loja Bazar', detail: 'Operação do Bazar' },
  { value: 'loja_brecho', label: 'Loja Brechó', detail: 'Operação do Brechó' },
  { value: 'loja_feirao', label: 'Loja Feirão', detail: 'Operação do Feirão' },
];

const emptyForm = {
  login: '',
  name: '',
  displayName: '',
  role: 'equipe_tecnica' as ManagedUserRole,
  temporaryPassword: '',
  ativo: true,
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(value: string | null) {
  if (!value) return 'Nunca';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Nunca' : dateFormatter.format(date);
}

function roleLabel(role: ManagedUserRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

const SupportUsersPage = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      setUsers(await listManagedUsers());
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const metrics = useMemo(() => {
    const active = users.filter((user) => user.ativo).length;
    const pendingPassword = users.filter((user) => user.mustChangePassword).length;

    return {
      total: users.length,
      active,
      inactive: users.length - active,
      pendingPassword,
    };
  }, [users]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setNotice(null);
  };

  const openEdit = (user: ManagedUser) => {
    setEditing(user);
    setForm({
      login: user.login,
      name: user.name,
      displayName: user.displayName,
      role: user.role,
      temporaryPassword: '',
      ativo: user.ativo,
    });
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (editing) {
        await updateManagedUser(editing.id, {
          name: form.name.trim(),
          displayName: form.displayName.trim(),
          role: form.role,
          ativo: form.ativo,
        });
        setNotice('Usuário atualizado com segurança.');
      } else {
        await createManagedUser({
          login: form.login.trim().toLowerCase(),
          name: form.name.trim(),
          displayName: form.displayName.trim(),
          role: form.role,
          temporaryPassword: form.temporaryPassword,
          ativo: form.ativo,
        });
        setNotice('Usuário criado com senha temporária e troca obrigatória.');
      }

      await loadUsers();
      setEditing(null);
      setForm(emptyForm);
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resetUser) return;

    setResetSaving(true);
    setError(null);
    setNotice(null);

    try {
      await resetManagedUserPassword(resetUser.id, resetPassword);
      setNotice(`Senha temporária definida para ${resetUser.displayName}.`);
      setResetUser(null);
      setResetPassword('');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Não foi possível redefinir a senha.');
    } finally {
      setResetSaving(false);
    }
  };

  const isEditingSelf = Boolean(editing && currentUser?.uuid === editing.id);

  return (
    <main className="page-band support-page">
      <section className="creche-dashboard-head">
        <div>
          <p className="institutional-eyebrow">Suporte institucional</p>
          <h1>Usuários, perfis e senhas</h1>
          <p>
            Crie acessos, ajuste papéis e force troca de senha sem expor credenciais. Perfil bem definido é governança,
            não burocracia.
          </p>
        </div>
        <div className="creche-head-actions">
          <button className="creche-head-link" onClick={openNew} type="button">
            Novo usuário
          </button>
        </div>
      </section>

      <section className="metrics-grid creche-metrics-grid">
        <article className="metric-card creche-metric-card">
          <span>Usuários</span>
          <strong>{metrics.total}</strong>
          <small>Perfis cadastrados no sistema</small>
        </article>
        <article className="metric-card creche-metric-card">
          <span>Ativos</span>
          <strong>{metrics.active}</strong>
          <small>Acessos liberados</small>
        </article>
        <article className="metric-card creche-metric-card warning">
          <span>Troca pendente</span>
          <strong>{metrics.pendingPassword}</strong>
          <small>Senhas temporárias em aberto</small>
        </article>
        <article className="metric-card creche-metric-card">
          <span>Inativos</span>
          <strong>{metrics.inactive}</strong>
          <small>Acessos preservados para auditoria</small>
        </article>
      </section>

      {error ? <p className="institutional-note danger">{error}</p> : null}
      {notice ? <p className="institutional-note success">{notice}</p> : null}

      <section className="support-grid">
        <article className="support-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">{editing ? 'Editar usuário' : 'Criar usuário'}</h2>
              <span>{editing ? 'Login preservado; papel e status podem mudar.' : 'A senha nasce temporária.'}</span>
            </div>
          </div>

          <form className="support-form" onSubmit={handleSubmit}>
            <label>
              Login
              <input
                disabled={Boolean(editing)}
                onChange={(event) => setForm((current) => ({ ...current, login: event.target.value.toLowerCase() }))}
                placeholder="paulo.augusto"
                required
                value={form.login}
              />
            </label>

            <label>
              Nome
              <input
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Paulo Augusto"
                required
                value={form.name}
              />
            </label>

            <label>
              Nome exibido
              <input
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Paulo"
                value={form.displayName}
              />
            </label>

            <label>
              Perfil de acesso
              <select
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as ManagedUserRole }))}
                value={form.role}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.detail}
                  </option>
                ))}
              </select>
            </label>

            {!editing ? (
              <label>
                Senha temporária
                <input
                  minLength={8}
                  onChange={(event) => setForm((current) => ({ ...current, temporaryPassword: event.target.value }))}
                  placeholder="mínimo 8 caracteres"
                  required
                  type="password"
                  value={form.temporaryPassword}
                />
              </label>
            ) : null}

            <label className="support-check">
              <input
                checked={form.ativo}
                disabled={isEditingSelf}
                onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
                type="checkbox"
              />
              Usuário ativo
            </label>

            {isEditingSelf ? (
              <p className="support-hint">A própria conta não pode ser desativada durante a sessão.</p>
            ) : null}

            <button className="institutional-button" disabled={saving} type="submit">
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar usuário'}
            </button>
          </form>
        </article>

        <article className="support-panel wide">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Acessos cadastrados</h2>
              <span>Controle operacional de perfis, senha temporária e último login.</span>
            </div>
          </div>

          <div className="report-table-wrap">
            <table className="report-table support-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  <th>Segurança</th>
                  <th>Último login</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.displayName}</strong>
                      <span>{user.login}</span>
                    </td>
                    <td>
                      {roleLabel(user.role)}
                      <span>{user.serviceLabel}</span>
                    </td>
                    <td>
                      <span className={`support-badge ${user.mustChangePassword ? 'warning' : 'ok'}`}>
                        {user.mustChangePassword ? 'Troca pendente' : 'Senha atualizada'}
                      </span>
                    </td>
                    <td>{formatDate(user.lastLoginAt)}</td>
                    <td>
                      <span className={`support-badge ${user.ativo ? 'ok' : 'muted'}`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="support-actions">
                        <button className="table-action" onClick={() => openEdit(user)} type="button">
                          Editar
                        </button>
                        <button
                          className="table-action secondary"
                          onClick={() => {
                            setResetUser(user);
                            setResetPassword('');
                            setError(null);
                            setNotice(null);
                          }}
                          type="button"
                        >
                          Resetar senha
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading ? <p className="institutional-note">Carregando usuários...</p> : null}
          {!loading && users.length === 0 ? <p className="institutional-note">Nenhum usuário cadastrado.</p> : null}
        </article>
      </section>

      {resetUser ? (
        <div className="support-modal-backdrop" role="presentation">
          <form className="support-modal" onSubmit={handleResetPassword}>
            <div className="creche-panel-head">
              <div>
                <h2 className="section-title">Redefinir senha</h2>
                <span>{resetUser.displayName} receberá uma senha temporária.</span>
              </div>
            </div>
            <label>
              Nova senha temporária
              <input
                autoFocus
                minLength={8}
                onChange={(event) => setResetPassword(event.target.value)}
                required
                type="password"
                value={resetPassword}
              />
            </label>
            <div className="support-modal-actions">
              <button className="creche-head-link secondary" onClick={() => setResetUser(null)} type="button">
                Cancelar
              </button>
              <button className="creche-head-link" disabled={resetSaving} type="submit">
                {resetSaving ? 'Redefinindo...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
};

export default SupportUsersPage;
