
import { useState } from 'react'
import { supabase } from '../services/supabase'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
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
            required
          />

          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

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
