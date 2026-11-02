
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import './Responsaveis.css'

function Responsaveis({ onResponsavelCriado }) {
  const [responsaveis, setResponsaveis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')

  const formularioInicial = {
    nome: '',
    email: '',
    senha: '',
  }

  const [formulario, setFormulario] = useState(formularioInicial)

  async function carregarResponsaveis() {
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, created_at')
      .eq('perfil', 'responsavel')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar responsáveis:', error)
      setErro('Não foi possível carregar os responsáveis.')
    } else {
      setResponsaveis(data || [])
    }

    setCarregando(false)
  }

  useEffect(() => {
    carregarResponsaveis()
  }, [])

  function atualizarCampo(e) {
    const { name, value } = e.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))

    setErro('')
    setMensagem('')
  }

  function abrirCadastro() {
    setFormulario(formularioInicial)
    setErro('')
    setMensagem('')
    setModalAberto(true)
  }

  async function salvarResponsavel(e) {
    e.preventDefault()

    setSalvando(true)
    setErro('')
    setMensagem('')

    try {
      const { data, error } = await supabase.functions.invoke(
        'criar-responsavel',
        {
          body: {
            nome: formulario.nome.trim(),
            email: formulario.email.trim().toLowerCase(),
            senha: formulario.senha,
          },
        }
      )

      if (error) {
        throw new Error(
          data?.erro || error.message || 'Não foi possível cadastrar o responsável.'
        )
      }

      if (data?.erro) {
        throw new Error(data.erro)
      }

      setFormulario(formularioInicial)
      setModalAberto(false)
      setMensagem('Responsável cadastrado com sucesso!')

      await carregarResponsaveis()

      if (onResponsavelCriado) {
        await onResponsavelCriado()
      }
    } catch (error) {
      console.error('Erro ao cadastrar responsável:', error)
      setErro(error.message || 'Não foi possível cadastrar o responsável.')
    } finally {
      setSalvando(false)
    }
  }

  const responsaveisFiltrados = responsaveis.filter((responsavel) => {
    const termo = busca.toLowerCase()

    return (
      responsavel.nome?.toLowerCase().includes(termo) ||
      responsavel.email?.toLowerCase().includes(termo)
    )
  })

  function formatarData(data) {
    if (!data) return '-'

    return new Date(data).toLocaleDateString('pt-BR')
  }

  return (
    <section className="responsaveis-page">
      <div className="responsaveis-header">
        <div>
          <h2>Responsáveis</h2>
          <p>Cadastre e consulte os responsáveis pelos discipulados.</p>
        </div>

        <button
          className="btn-novo-responsavel"
          onClick={abrirCadastro}
        >
          + Novo responsável
        </button>
      </div>

      {mensagem && (
        <p className="responsaveis-sucesso">{mensagem}</p>
      )}

      {erro && !modalAberto && (
        <p className="responsaveis-erro">{erro}</p>
      )}

      <div className="responsaveis-resumo">
        <div>
          <span>Total de responsáveis</span>
          <strong>{responsaveis.length}</strong>
        </div>
      </div>

      <div className="responsaveis-lista-card">
        <div className="responsaveis-lista-header">
          <h3>Responsáveis cadastrados</h3>

          <input
            type="search"
            placeholder="Pesquisar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {carregando ? (
          <p className="responsaveis-mensagem">
            Carregando responsáveis...
          </p>
        ) : responsaveisFiltrados.length === 0 ? (
          <p className="responsaveis-mensagem">
            {busca
              ? 'Nenhum responsável encontrado.'
              : 'Nenhum responsável cadastrado ainda.'}
          </p>
        ) : (
          <div className="responsaveis-tabela-container">
            <table className="responsaveis-tabela">
              <thead>
                <tr>
                  <th>Nome completo</th>
                  <th>E-mail</th>
                  <th>Data do cadastro</th>
                  <th>Perfil</th>
                </tr>
              </thead>

              <tbody>
                {responsaveisFiltrados.map((responsavel) => (
                  <tr key={responsavel.id}>
                    <td>{responsavel.nome}</td>
                    <td>{responsavel.email}</td>
                    <td>{formatarData(responsavel.created_at)}</td>
                    <td>
                      <span className="responsavel-status">
                        Responsável
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAberto && (
        <div
          className="responsavel-modal-overlay"
          onClick={() => {
            if (!salvando) setModalAberto(false)
          }}
        >
          <div
            className="responsavel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="responsavel-modal-header">
              <div>
                <h3>Novo responsável</h3>
                <p>Preencha os dados para criar o acesso ao sistema.</p>
              </div>

              <button
                type="button"
                className="responsavel-modal-fechar"
                disabled={salvando}
                onClick={() => setModalAberto(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={salvarResponsavel}>
              <label htmlFor="responsavel-nome">
                Nome completo *
              </label>

              <input
                id="responsavel-nome"
                name="nome"
                value={formulario.nome}
                onChange={atualizarCampo}
                placeholder="Digite o nome completo"
                maxLength={150}
                required
              />

              <label htmlFor="responsavel-email">
                E-mail de acesso *
              </label>

              <input
                id="responsavel-email"
                name="email"
                type="email"
                value={formulario.email}
                onChange={atualizarCampo}
                placeholder="exemplo@email.com"
                maxLength={254}
                required
              />

              <label htmlFor="responsavel-senha">
                Senha inicial *
              </label>

              <input
                id="responsavel-senha"
                name="senha"
                type="password"
                value={formulario.senha}
                onChange={atualizarCampo}
                placeholder="Mínimo de 8 caracteres"
                minLength={8}
                required
              />

              <small className="responsavel-aviso">
                Informe ao responsável os dados de acesso criados.
              </small>

              {erro && (
                <p className="responsaveis-erro">{erro}</p>
              )}

              <div className="responsavel-modal-acoes">
                <button
                  type="button"
                  className="responsavel-btn-cancelar"
                  disabled={salvando}
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="responsavel-btn-salvar"
                  disabled={salvando}
                >
                  {salvando ? 'Cadastrando...' : 'Cadastrar responsável'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default Responsaveis
