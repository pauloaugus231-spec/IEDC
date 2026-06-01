import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { changeOwnPassword } from '../api';
import { PageHeader, Panel } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import '../styles/institutional.css';
import '../styles/design-system.css';

const MyAccountPage = () => {
  const { currentUser, refreshCurrentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (newPassword !== confirmPassword) {
      setError('A confirmação precisa ser igual à nova senha.');
      return;
    }

    if (newPassword.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setSaving(true);

    try {
      await changeOwnPassword({ currentPassword, newPassword });
      await refreshCurrentUser();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Senha atualizada. Seu acesso está regularizado.');
    } catch (err: any) {
      setError(err.message || 'Não foi possível atualizar sua senha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-band account-page ds-admin-surface">
      <PageHeader
        eyebrow="Minha conta"
        title="Configurações de acesso"
        description="Atualize sua senha e confira o perfil institucional ativo. Cada pessoa responde pelo próprio acesso."
        actions={!currentUser?.mustChangePassword ? (
          <Link className="creche-head-link secondary ds-button" to={currentUser?.homePath ?? '/gestao'}>
            Voltar ao painel
          </Link>
        ) : null}
      />

      {currentUser?.mustChangePassword ? (
        <p className="institutional-note warning">
          Sua senha é temporária. Atualize-a para liberar a navegação completa do sistema.
        </p>
      ) : null}
      {error ? <p className="institutional-note danger">{error}</p> : null}
      {notice ? <p className="institutional-note success">{notice}</p> : null}

      <section className="account-grid ds-admin-grid">
        <Panel
          className="account-summary"
          title="Identidade do perfil"
          subtitle="Dados usados para sessão e permissões."
        >
          <dl className="account-definition-list ds-definition-list">
            <div>
              <dt>Nome</dt>
              <dd>{currentUser?.displayName}</dd>
            </div>
            <div>
              <dt>Login</dt>
              <dd>{currentUser?.login}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>{currentUser?.roleLabel}</dd>
            </div>
            <div>
              <dt>Unidade</dt>
              <dd>{currentUser?.serviceLabel}</dd>
            </div>
            <div>
              <dt>Status da senha</dt>
              <dd>{currentUser?.mustChangePassword ? 'Troca obrigatória' : 'Atualizada'}</dd>
            </div>
          </dl>
        </Panel>

        <Panel
          className="account-password-panel"
          title="Alterar senha"
          subtitle="Use uma senha própria. Suporte só redefine temporariamente."
        >
          <form className="support-form ds-form" onSubmit={handleSubmit}>
            <label>
              Senha atual
              <input
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </label>
            <label>
              Nova senha
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </label>
            <label>
              Confirmar nova senha
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>

            <button className="institutional-button ds-button" disabled={saving} type="submit">
              {saving ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        </Panel>
      </section>
    </main>
  );
};

export default MyAccountPage;
