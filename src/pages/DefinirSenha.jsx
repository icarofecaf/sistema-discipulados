
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import './DefinirSenha.css'

function DefinirSenha() {
  const [verificando, setVerificando] = useState(true)
  const [sessaoValida, setSessaoValida] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [confirmacaoVisivel, setConfirmacaoVisivel] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    let ativo = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!ativo) return

      setSessaoValida(!!session)
      setVerificando(false)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!ativo) return

      if (error || !data.session) {
        setSessaoValida(false)
      } else {
        setSessaoValida(true)
      }

      setVerificando(false)
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  async function salvarSenha(e) {
    e.preventDefault()

    setErro('')

    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }

    if (senha !== confirmacao) {
      setErro('As senhas informadas não são iguais.')
      return
    }

    setSalvando(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: senha,
      })

      if (error) {
        throw error
      }

      setConcluido(true)
      setSenha('')
      setConfirmacao('')
    } catch (error) {
      console.error('Erro ao definir senha:', error)

      setErro(
        error.message ||
        'Não foi possível definir sua senha. Tente novamente.'
      )
    } finally {
      setSalvando(false)
    }
  }

  function acessarSistema() {
    window.location.replace('/')
  }

  if (verificando) {
    return (
      <div className="definir-senha-container">
        <div className="definir-senha-card">
          <p>Validando seu convite...</p>
        </div>
      </div>
    )
  }

  if (!sessaoValida) {
    return (
      <div className="definir-senha-container">
        <div className="definir-senha-card">
          <div className="definir-senha-icon">!</div>

          <h1>Convite indisponível</h1>

          <p>
            Não foi possível validar seu convite.
            Ele pode ter expirado ou já ter sido utilizado.
          </p>

          <p>
            Solicite ao administrador um novo convite.
          </p>

          <a href="/" className="definir-senha-link">
            Voltar para o login
          </a>
        </div>
      </div>
    )
  }

  if (concluido) {
    return (
      <div className="definir-senha-container">
        <div className="definir-senha-card">
          <div className="definir-senha-icon sucesso">✓</div>

          <h1>Senha cadastrada!</h1>

          <p>
            Sua senha foi definida com sucesso.
            Agora você já pode acessar o Sistema de Acompanhamento de Discipulados.
          </p>

          <button
            type="button"
            className="definir-senha-botao"
            onClick={acessarSistema}
          >
            Acessar o sistema
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="definir-senha-container">
      <div className="definir-senha-card">
        <div className="definir-senha-logo">†</div>

        <h1>Defina sua senha</h1>

        <p>
          Seja bem-vindo ao Sistema de Acompanhamento de Discipulados.
          Crie uma senha para acessar sua conta.
        </p>

        <form onSubmit={salvarSenha}>
          <label htmlFor="nova-senha">
            Nova senha
          </label>

          <div className="definir-senha-campo">
            <input
              id="nova-senha"
              type={senhaVisivel ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua nova senha"
              autoComplete="new-password"
              minLength={8}
              required
            />

            <button
              type="button"
              className="definir-senha-toggle"
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

          <label htmlFor="confirmar-senha">
            Confirmar nova senha
          </label>

          <div className="definir-senha-campo">
            <input
              id="confirmar-senha"
              type={confirmacaoVisivel ? 'text' : 'password'}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="Digite novamente sua senha"
              autoComplete="new-password"
              minLength={8}
              required
            />

            <button
              type="button"
              className="definir-senha-toggle"
              onClick={() =>
                setConfirmacaoVisivel((visivel) => !visivel)
              }
              aria-label={
                confirmacaoVisivel ? 'Ocultar senha' : 'Mostrar senha'
              }
              aria-pressed={confirmacaoVisivel}
              title={
                confirmacaoVisivel ? 'Ocultar senha' : 'Mostrar senha'
              }
            >
              {confirmacaoVisivel ? (
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

          <small>
            A senha precisa ter pelo menos 8 caracteres.
          </small>

          {erro && (
            <div className="definir-senha-erro">
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="definir-senha-botao"
            disabled={salvando}
          >
            {salvando ? 'Salvando senha...' : 'Definir minha senha'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default DefinirSenha
