import {
  LockKeyhole,
  Mail,
} from 'lucide-react';

import {
  useState,
} from 'react';

import {
  Navigate,
  useNavigate,
} from 'react-router-dom';

import axios
  from 'axios';

import {
  useAuth,
} from '../auth/AuthContext';

export default function Login() {
  const navigate =
    useNavigate();

  const {
    user,
    loading,
    login,
  } =
    useAuth();

  const [email, setEmail] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [error, setError] =
    useState('');

  if (
    !loading &&
    user
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  async function handleSubmit(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();

    if (
      !email.trim() ||
      !password
    ) {
      setError(
        'Informe e-mail e senha.',
      );

      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await login(
        email,
        password,
      );

      navigate(
        '/',
        {
          replace: true,
        },
      );
    } catch (requestError) {
      console.error(
        requestError,
      );

      if (
        axios.isAxiosError(
          requestError,
        )
      ) {
        const message =
          (
            requestError.response
              ?.data as {
                message?: string;
              }
          )?.message;

        setError(
          message ??
          'Não foi possível entrar.',
        );
      } else {
        setError(
          'Não foi possível entrar.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">

      <div className="login-brand">

        <div className="login-logo">
          NAYARA<span>★</span>
        </div>

        <div className="login-barcelos">
          BARCELOS
        </div>

        <p>
          Sistema de Gestão de Equipe
        </p>

      </div>

      <div className="login-card">

        <div>
          <span className="eyebrow">
            ACESSO RESTRITO
          </span>

          <h1>
            Bem-vindo
          </h1>

          <p>
            Entre com suas credenciais
            para acessar o sistema.
          </p>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >

          <label>
            E-mail

            <div className="input-with-icon">
              <Mail size={18} />

              <input
                type="email"
                autoComplete="username"
                placeholder="seu@email.com"
                value={email}
                disabled={submitting}
                onChange={event =>
                  setEmail(
                    event.target.value,
                  )
                }
              />
            </div>
          </label>

          <label>
            Senha

            <div className="input-with-icon">
              <LockKeyhole
                size={18}
              />

              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                disabled={submitting}
                onChange={event =>
                  setPassword(
                    event.target.value,
                  )
                }
              />
            </div>
          </label>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button login-button"
            disabled={submitting}
          >
            {submitting
              ? 'Entrando...'
              : 'Entrar'}
          </button>

        </form>

        <div className="login-cortex">
          Tecnologia{' '}
          <strong>
            Cortex+
          </strong>
        </div>

      </div>

    </div>
  );
}
