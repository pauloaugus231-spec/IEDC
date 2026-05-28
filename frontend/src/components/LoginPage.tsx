import type { FormEvent } from 'react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/institutional.css';

const LoginPage = () => {
  const { currentUser, login } = useAuth();
  const [userLogin, setUserLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentUser) {
    return <Navigate to={currentUser.mustChangePassword ? '/minha-conta?trocarSenha=1' : currentUser.homePath} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (await login(userLogin, password)) {
        return;
      }

      setError('Usuário ou senha inválido.');
    } catch {
      setError('Não foi possível conectar ao sistema.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-identity">
        <div className="login-logo-panel">
          <img src="/iedc/dias-da-cruz-logo-sem-fundo.png" alt="Instituto Espírita Dias da Cruz" />
        </div>

        <div className="login-copy">
          <p className="eyebrow">Acolher, servir, esclarecer</p>
          <h1>Gestão integrada para cuidar melhor.</h1>
          <p>
            Uma base local para acompanhar Albergue, E.E.I. Casa do Pequenino,
            relatórios e aferições com clareza operacional.
          </p>
        </div>
      </section>

      <section className="login-form-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Acesso institucional</h2>
          <p>Entre com seu usuário para abrir o painel correspondente.</p>

          <div className="login-field">
            <label htmlFor="user-login">Usuário</label>
            <input
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={Boolean(error)}
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              id="user-login"
              onChange={(event) => {
                setUserLogin(event.target.value);
                setError('');
              }}
              required
              spellCheck={false}
              type="text"
              value={userLogin}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Senha</label>
            <input
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={Boolean(error)}
              autoComplete="current-password"
              id="password"
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              required
              type="password"
              value={password}
            />
          </div>

          {error ? (
            <p className="login-error" id="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="login-button" type="submit">
            {isSubmitting ? 'Entrando...' : 'Entrar no sistema'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
