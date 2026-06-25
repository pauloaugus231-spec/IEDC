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
import { MetricCard, MetricGrid, ModalFrame, PageHeader, Panel, TableShell } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import '../styles/institutional.css';
import '../styles/design-system.css';

const roleOptions: Array<{ value: ManagedUserRole; label: string; detail: string }> = [
  { value: 'gestora', label: 'Gestão', detail: 'Acesso institucional amplo' },
  { value: 'suporte', label: 'Suporte', detail: 'Criação de usuários e suporte operacional' },
  { value: 'coordenador_albergue', label: 'Coordenação Albergue', detail: 'Operação e relatórios do Albergue' },
  { value: 'auxiliar_coordenacao_albergue', label: 'Auxiliar de Coordenação', detail: 'Mesmas permissões da coordenação do Albergue' },
  { value: 'diretor_albergue', label: 'Diretor do Albergue', detail: 'Painéis e relatórios, somente leitura' },
  { value: 'equipe_tecnica_albergue', label: 'Equipe Técnica do Albergue', detail: 'Consulta operacional restrita ao Albergue' },
  { value: 'educador_albergue', label: 'Educador Albergue', detail: 'Rotina operacional do Albergue' },
  { value: 'coordenador_creche', label: 'Coordenação E.E.I.', detail: 'Gestão pedagógica e relatórios da E.E.I.' },
  { value: 'educador_creche', label: 'Educador E.E.I.', detail: 'Crianças, turmas e frequência' },
  { value: 'comercial', label: 'Comercial', detail: 'Comandas, recebimentos e retiradas das lojas' },
  { value: 'loja_bazar', label: 'Loja Bazar', detail: 'Operação do Bazar' },
  { value: 'loja_brecho', label: 'Loja Brechó', detail: 'Operação do Brechó' },
  { value: 'loja_feirao', label: 'Loja Feirão', detail: 'Operação do Feirão' },
];

const emptyForm = {
  login: '',
  name: '',
  displayName: '',
  role: 'educador_albergue' as ManagedUserRole,
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
    <main className="page-band support-page ds-admin-surface">
      <PageHeader
        eyebrow="Suporte institucional"
        title="Usuários, perfis e senhas"
        description="Crie acessos, ajuste papéis e force troca de senha sem expor credenciais. Perfil bem definido é governança institucional."
        actions={(
          <button className="creche-head-link ds-button" onClick={openNew} type="button">
            Novo usuário
          </button>
        )}
      />

      <MetricGrid>
        <MetricCard label="Usuários" value={metrics.total} detail="Perfis cadastrados no sistema" />
        <MetricCard label="Ativos" value={metrics.active} detail="Acessos liberados" />
        <MetricCard label="Troca pendente" value={metrics.pendingPassword} detail="Senhas temporárias em aberto" tone="warning" />
        <MetricCard label="Inativos" value={metrics.inactive} detail="Acessos preservados para auditoria" />
      </MetricGrid>

      {error ? <p className="institutional-note danger">{error}</p> : null}
      {notice ? <p className="institutional-note success">{notice}</p> : null}

      <section className="support-grid ds-admin-grid">
        <Panel
          title={editing ? 'Editar usuário' : 'Criar usuário'}
          subtitle={editing ? 'Login preservado; papel e status podem mudar.' : 'A senha nasce temporária.'}
        >
          <form className="support-form ds-form" onSubmit={handleSubmit}>
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

            <button className="institutional-button ds-button" disabled={saving} type="submit">
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar usuário'}
            </button>
          </form>
        </Panel>

        <Panel
          className="wide"
          title="Acessos cadastrados"
          subtitle="Controle operacional de perfis, senha temporária e último login."
        >
          <TableShell>
            <table className="report-table support-table ds-table">
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
                      <div className="support-actions ds-action-row">
                        <button className="table-action ds-row-action" onClick={() => openEdit(user)} type="button">
                          Editar
                        </button>
                        <button
                          className="table-action secondary ds-row-action"
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
          </TableShell>

          {loading ? <p className="institutional-note">Carregando usuários...</p> : null}
          {!loading && users.length === 0 ? <p className="institutional-note">Nenhum usuário cadastrado.</p> : null}
        </Panel>
      </section>

      {resetUser ? (
        <div className="support-modal-backdrop ds-modal-backdrop" role="presentation">
          <form onSubmit={handleResetPassword}>
            <ModalFrame
              title="Redefinir senha"
              subtitle={`${resetUser.displayName} receberá uma senha temporária.`}
              footer={(
                <>
                  <button className="creche-head-link secondary ds-button" onClick={() => setResetUser(null)} type="button">
                    Cancelar
                  </button>
                  <button className="creche-head-link ds-button" disabled={resetSaving} type="submit">
                    {resetSaving ? 'Redefinindo...' : 'Confirmar'}
                  </button>
                </>
              )}
            >
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
            </ModalFrame>
          </form>
        </div>
      ) : null}
    </main>
  );
};

export default SupportUsersPage;
