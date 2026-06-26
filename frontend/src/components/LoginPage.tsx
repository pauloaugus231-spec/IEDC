import type { FormEvent } from 'react';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/institutional.css';

const moduleNodes = [
  { label: 'Gestão', className: 'node-gestao' },
  { label: 'Albergue', className: 'node-albergue' },
  { label: 'E.E.I.', className: 'node-creche' },
  { label: 'Lojas', className: 'node-lojas' },
  { label: 'Comercial', className: 'node-financeiro' },
];

const motionEase = [0.22, 1, 0.36, 1] as const;

const identityVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.22,
      staggerChildren: 0.2,
    },
  },
};

const riseItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.92, ease: motionEase },
  },
};

function LoginAmbientScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div aria-hidden="true" className="login-motion-layer">
      <motion.div
        animate={reduceMotion ? { opacity: 0.34 } : { opacity: [0.22, 0.42, 0.22], scale: [0.995, 1.012, 0.995] }}
        className="login-network"
        initial={{ opacity: 0 }}
        transition={{ duration: 18, ease: 'easeInOut', repeat: reduceMotion ? 0 : Infinity }}
      >
        <svg className="login-network-lines" viewBox="0 0 620 420" preserveAspectRatio="none">
          <motion.path
            d="M98 132 C184 86 264 98 336 162 S478 242 548 188"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 0.28 } : { pathLength: 1, opacity: 0.42 }}
            transition={{ duration: 3.4, ease: 'easeOut' }}
          />
          <motion.path
            d="M112 292 C198 236 274 256 348 218 S482 138 544 286"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.55"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 0.24 } : { pathLength: 1, opacity: 0.34 }}
            transition={{ delay: 0.48, duration: 3.8, ease: 'easeOut' }}
          />
          <motion.path
            d="M86 214 C172 188 232 320 324 282 S462 210 572 236"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 0.18 } : { pathLength: 1, opacity: 0.26 }}
            transition={{ delay: 0.78, duration: 4.2, ease: 'easeOut' }}
          />
        </svg>

        {moduleNodes.map((node, index) => (
          <motion.span
            animate={reduceMotion ? undefined : {
              scale: [1, 1.012, 1],
              y: [0, index % 2 ? -5 : 5, 0],
            }}
            className={`login-node ${node.className}`}
            initial={{ opacity: 0, scale: 0.9 }}
            key={node.label}
            transition={{
              delay: 0.32 + index * 0.14,
              duration: reduceMotion ? 0.2 : 14.5,
              ease: 'easeInOut',
              repeat: reduceMotion ? 0 : Infinity,
            }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <span className="login-node-dot" />
            <span className="login-node-label">{node.label}</span>
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

const LoginPage = () => {
  const { currentUser, login } = useAuth();
  const [userLogin, setUserLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const reduceMotion = Boolean(shouldReduceMotion);

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
    <motion.main
      animate="visible"
      className="login-screen"
      initial="hidden"
      variants={identityVariants}
    >
      <motion.section className="login-identity" variants={identityVariants}>
        <LoginAmbientScene reduceMotion={reduceMotion} />

        <motion.div className="login-logo-panel" variants={riseItem}>
          <img src="/iedc/dias-da-cruz-logo-sem-fundo.png" alt="Instituto Espírita Dias da Cruz" />
        </motion.div>

        <motion.div className="login-copy" variants={identityVariants}>
          <motion.p className="eyebrow" variants={riseItem}>Acolher, servir, esclarecer</motion.p>
          <motion.h1 variants={riseItem}>Gestão integrada para cuidar melhor.</motion.h1>
          <motion.p variants={riseItem}>
            Acesso local para Albergue, E.E.I., lojas e financeiro,
            com informação organizada para decisões mais rápidas.
          </motion.p>
        </motion.div>
      </motion.section>

      <motion.section
        className="login-form-panel"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration: 0.72 } },
        }}
      >
        <motion.form
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          className="login-card"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
          onSubmit={handleSubmit}
          transition={{ delay: 0.16, duration: 0.9, ease: motionEase }}
        >
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

          <AnimatePresence>
            {error ? (
              <motion.p
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: [0, -6, 6, -3, 0] }}
                className="login-error"
                exit={{ opacity: 0, y: -4 }}
                id="login-error"
                initial={{ opacity: 0, y: -4 }}
                key={error}
                role="alert"
                transition={{ duration: 0.24 }}
              >
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <motion.button
            className="login-button"
            disabled={isSubmitting}
            type="submit"
            whileTap={reduceMotion || isSubmitting ? undefined : { scale: 0.985 }}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar no sistema'}
          </motion.button>
        </motion.form>
      </motion.section>
    </motion.main>
  );
};

export default LoginPage;
