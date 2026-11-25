
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
  }

  const [formulario, setFormulario] = useState(formularioInicial)

  // CARREGAR RESPONSÁVEIS
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

  // ATUALIZAR CAMPOS DO FORMULÁRIO
  function atualizarCampo(e) {
    const { name, value } = e.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))

    setErro('')
    setMensagem('')
  }

  // ABRIR CADASTRO
  function abrirCadastro() {
    setFormulario({ ...formularioInicial })
    setErro('')
    setMensagem('')
    setModalAberto(true)
  }

  // FECHAR MODAL
  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    setFormulario({ ...formularioInicial })
    setErro('')
  }

  // ENVIAR CONVITE
  async function salvarResponsavel(e) {
    e.preventDefault()

    setSalvando(true)
    setErro('')
    setMensagem('')

    const nome = formulario.nome.trim()
    const email = formulario.email.trim().toLowerCase()

    try {
      if (!nome || !email) {
        throw new Error('Preencha o nome e o e-mail do responsável.')
      }

      const { data, error } = await supabase.functions.invoke(
        'criar-responsavel',
        {
          body: {
            acao: 'convidar_responsavel',
            nome,
            email,
          },
        }
      )

      if (error || data?.erro) {
        let motivo =
          data?.erro ||
          error?.message ||
          'Não foi possível enviar o convite.'

        // TENTAR OBTER A MENSAGEM REAL DA EDGE FUNCTION
        if (
          !data?.erro &&
          error?.context &&
          typeof error.context.clone === 'function'
        ) {
          try {
            const resposta = await error.context.clone().json()

            if (resposta?.erro) {
              motivo = resposta.erro
            }
          } catch (erroLeitura) {
            console.error(
              'Não foi possível ler o detalhe da resposta:',
              erroLeitura
            )
          }
        }

        throw new Error(motivo)
      }

      setFormulario({ ...formularioInicial })
      setModalAberto(false)

      setMensagem(
        `Responsável cadastrado! O convite foi enviado para ${email}. A pessoa deverá abrir o e-mail e definir sua própria senha.`
      )

      await carregarResponsaveis()

      if (onResponsavelCriado) {
        await onResponsavelCriado()
      }
    } catch (error) {
      console.error('Erro ao enviar convite para responsável:', error)

      setErro(
        error.message ||
        'Não foi possível enviar o convite. Tente novamente.'
      )
    } finally {
      setSalvando(false)
    }
  }

  // PESQUISA
  const responsaveisFiltrados = responsaveis.filter((responsavel) => {
    const termo = busca.toLowerCase()

    return (
      responsavel.nome?.toLowerCase().includes(termo) ||
      responsavel.email?.toLowerCase().includes(termo)
    )
  })

  // FORMATAR DATA
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
          type="button"
          className="btn-novo-responsavel"
          onClick={abrirCadastro}
        >
          + Novo responsável
        </button>
      </div>

      {mensagem && (
        <p className="responsaveis-sucesso">
          {mensagem}
        </p>
      )}

      {erro && !modalAberto && (
        <p className="responsaveis-erro">
          {erro}
        </p>
      )}

      <div className="responsaveis-resumo">
        <div>
          <span>Total de responsáveis</span>
          <strong>{carregando ? '...' : responsaveis.length}</strong>
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
          onClick={fecharModal}
        >
          <div
            className="responsavel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="responsavel-modal-header">
              <div>
                <h3>Novo responsável</h3>
                <p>
                  Preencha os dados para enviar o convite de acesso.
                </p>
              </div>

              <button
                type="button"
                className="responsavel-modal-fechar"
                disabled={salvando}
                onClick={fecharModal}
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
                autoComplete="name"
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
                autoComplete="email"
                required
              />

              <div className="responsavel-aviso">
                Enviaremos um convite para o endereço informado.
                O próprio responsável deverá abrir o e-mail e definir
                sua senha para acessar o sistema.
              </div>

              {erro && (
                <p className="responsaveis-erro">
                  {erro}
                </p>
              )}

              <div className="responsavel-modal-acoes">
                <button
                  type="button"
                  className="responsavel-btn-cancelar"
                  disabled={salvando}
                  onClick={fecharModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="responsavel-btn-salvar"
                  disabled={salvando}
                >
                  {salvando
                    ? 'Enviando convite...'
                    : 'Enviar convite'}
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
