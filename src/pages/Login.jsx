
import { useState } from 'react'
import { supabase } from '../services/supabase'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('E-mail ou senha inválidos.')
      setCarregando(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <main className="login-container">
      <section className="login-card">
        <div className="login-icon">✝</div>

        <h1>Discipulados</h1>

        <p className="login-subtitle">
          Sistema de Acompanhamento de Discipulados
        </p>

        <form onSubmit={handleLogin}>
          <label htmlFor="email">E-mail</label>

          <input
            id="email"
            type="email"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="senha">Senha</label>

          <div className="login-senha-wrapper">
            <input
              id="senha"
              type={senhaVisivel ? 'text' : 'password'}
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="login-senha-toggle"
              onClick={() => setSenhaVisivel((visivel) => !visivel)}
              aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={senhaVisivel}
              title={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {senhaVisivel ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.2A11.4 11.4 0 0 1 12 5c5.5 0 9 7 9 7a14.5 14.5 0 0 1-3.1 3.9" />
                  <path d="M6.2 6.2C3.9 7.8 3 12 3 12s3.5 7 9 7c1.5 0 2.8-.5 4-1.2" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {erro && <p className="login-error">{erro}</p>}

          <button type="submit" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <footer>
          Sistema de Acompanhamento de Discipulados
        </footer>
      </section>
    </main>
  )
}

export default Login
