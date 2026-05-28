import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { changeOwnPassword } from '../api';
import { useAuth } from '../context/AuthContext';
import '../styles/institutional.css';

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
    <main className="page-band account-page">
      <section className="creche-dashboard-head">
        <div>
          <p className="institutional-eyebrow">Minha conta</p>
          <h1>Configurações de acesso</h1>
          <p>
            Atualize sua senha e confira o perfil institucional ativo. Segurança simples, sem teatro: cada pessoa
            responde pelo próprio acesso.
          </p>
        </div>
        {!currentUser?.mustChangePassword ? (
          <Link className="creche-head-link secondary" to={currentUser?.homePath ?? '/gestao'}>
            Voltar ao painel
          </Link>
        ) : null}
      </section>

      {currentUser?.mustChangePassword ? (
        <p className="institutional-note warning">
          Sua senha é temporária. Atualize-a para liberar a navegação completa do sistema.
        </p>
      ) : null}
      {error ? <p className="institutional-note danger">{error}</p> : null}
      {notice ? <p className="institutional-note success">{notice}</p> : null}

      <section className="account-grid">
        <article className="support-panel account-summary">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Identidade do perfil</h2>
              <span>Dados usados para sessão e permissões.</span>
            </div>
          </div>

          <dl className="account-definition-list">
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
        </article>

        <article className="support-panel account-password-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Alterar senha</h2>
              <span>Use uma senha própria. Suporte só redefine temporariamente.</span>
            </div>
          </div>

          <form className="support-form" onSubmit={handleSubmit}>
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

            <button className="institutional-button" disabled={saving} type="submit">
              {saving ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
};

export default MyAccountPage;
