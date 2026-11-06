
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import './Colaboradores.css'

function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroFuncao, setFiltroFuncao] = useState('todas')
  const [itensPorPagina, setItensPorPagina] = useState(10)
  const [paginaAtual, setPaginaAtual] = useState(1)

  const [modalAberto, setModalAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [colaboradorEditando, setColaboradorEditando] = useState(null)

  const formularioInicial = {
    nome: '',
    endereco: '',
    escolaridade: '',
    data_nascimento: '',
    funcao: '',
    criarAcesso: false,
    email: '',
  }

  const funcoes = [
    'Ministro',
    'Diácono',
    'Cooperador',
    'Líder de Núcleo Evangelístico',
    'Líder em Treinamento',
  ]

  const escolaridades = [
    'Ensino Médio Completo',
    'Ensino Superior Incompleto',
    'Ensino Superior Completo',
    'Pós-Graduação',
    'Mestrado',
    'Doutorado',
  ]

  const [formulario, setFormulario] = useState(formularioInicial)

  // CARREGAR COLABORADORES
  async function carregarColaboradores() {
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar colaboradores:', error)
      setErro('Não foi possível carregar os colaboradores.')
    } else {
      setColaboradores(data || [])
    }

    setCarregando(false)
  }

  useEffect(() => {
    carregarColaboradores()
  }, [])

  // ATUALIZAR CAMPOS DO FORMULÁRIO
  function atualizarCampo(e) {
    const { name, value, type, checked } = e.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: type === 'checkbox' ? checked : value,
    }))

    setErro('')
    setMensagem('')
  }

  // ABRIR CADASTRO
  function abrirCadastro() {
    setColaboradorEditando(null)
    setFormulario({ ...formularioInicial })
    setErro('')
    setMensagem('')
    setModalAberto(true)
  }

  // ABRIR EDIÇÃO
  function abrirEdicao(colaborador) {
    setColaboradorEditando(colaborador)

    setFormulario({
      ...formularioInicial,
      nome: colaborador.nome || '',
      endereco: colaborador.endereco || '',
      escolaridade:
        colaborador.escolaridade === 'Pos-Graduação'
          ? 'Pós-Graduação'
          : colaborador.escolaridade || '',
      data_nascimento: colaborador.data_nascimento || '',
      funcao: colaborador.funcao || '',
    })

    setErro('')
    setMensagem('')
    setModalAberto(true)
  }

  // SALVAR CADASTRO OU EDIÇÃO
  async function salvarColaborador(e) {
    e.preventDefault()

    setSalvando(true)
    setErro('')
    setMensagem('')

    const dados = {
      nome: formulario.nome.trim(),
      endereco: formulario.endereco.trim(),
      escolaridade: formulario.escolaridade,
      data_nascimento: formulario.data_nascimento,
      funcao: formulario.funcao,
    }

    try {
      let mensagemFinal = ''

      if (colaboradorEditando) {
        // ATUALIZAR COLABORADOR EXISTENTE
        const { error } = await supabase
          .from('colaboradores')
          .update(dados)
          .eq('id', colaboradorEditando.id)

        if (error) throw error

        mensagemFinal = 'Colaborador atualizado com sucesso!'
      } else {
        // IDENTIFICAR ADMINISTRADOR LOGADO
        const { data: usuarioData, error: usuarioErro } =
          await supabase.auth.getUser()

        if (usuarioErro || !usuarioData.user) {
          throw new Error('Não foi possível identificar o usuário logado.')
        }

        // CADASTRAR COLABORADOR
        const { data: novoColaborador, error: erroCadastro } =
          await supabase
            .from('colaboradores')
            .insert({
              ...dados,
              status: 'ativo',
              cadastrado_por: usuarioData.user.id,
            })
            .select('id')
            .single()

        if (erroCadastro) throw erroCadastro

        mensagemFinal = 'Colaborador cadastrado com sucesso!'

        // ENVIAR CONVITE CASO TENHA SIDO SOLICITADO
        if (formulario.criarAcesso) {
          const email = formulario.email.trim().toLowerCase()

          const { data: conviteData, error: conviteError } =
            await supabase.functions.invoke('criar-responsavel', {
              body: {
                acao: 'convidar_colaborador',
                colaborador_id: novoColaborador.id,
                email,
              },
            })

          if (conviteError || conviteData?.erro) {
            const motivo =
              conviteData?.erro ||
              conviteError?.message ||
              'Não foi possível enviar o convite.'

            console.error('Erro ao enviar convite:', {
              conviteError,
              conviteData,
            })

            mensagemFinal =
              `Colaborador cadastrado, mas o convite não foi enviado: ${motivo}`
          } else {
            mensagemFinal =
              `Colaborador cadastrado e convite enviado para ${email}.`
          }
        }
      }

      setFormulario({ ...formularioInicial })
      setColaboradorEditando(null)
      setModalAberto(false)
      setPaginaAtual(1)
      setMensagem(mensagemFinal)

      await carregarColaboradores()
    } catch (error) {
      console.error('Erro ao salvar colaborador:', error)

      setErro(
        colaboradorEditando
          ? 'Não foi possível atualizar o cadastro.'
          : error.message || 'Não foi possível cadastrar o colaborador.'
      )
    } finally {
      setSalvando(false)
    }
  }

  // ALTERAR STATUS
  async function alterarStatus(colaborador) {
    const novoStatus =
      colaborador.status === 'ativo' ? 'inativo' : 'ativo'

    const confirmar = window.confirm(
      `Deseja realmente ${
        novoStatus === 'ativo' ? 'reativar' : 'inativar'
      } o cadastro de ${colaborador.nome}?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('colaboradores')
      .update({ status: novoStatus })
      .eq('id', colaborador.id)

    if (error) {
      console.error('Erro ao alterar status:', error)
      alert('Não foi possível alterar o status.')
      return
    }

    await carregarColaboradores()
  }

  // FORMATAR DATA
  function formatarData(data) {
    if (!data) return '-'

    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // PESQUISA E FILTROS
  const colaboradoresFiltrados = colaboradores.filter((colaborador) => {
    const termo = busca.toLowerCase()

    const correspondeBusca =
      colaborador.nome.toLowerCase().includes(termo) ||
      colaborador.funcao.toLowerCase().includes(termo) ||
      colaborador.escolaridade.toLowerCase().includes(termo)

    const correspondeStatus =
      filtroStatus === 'todos' ||
      colaborador.status === filtroStatus

    const correspondeFuncao =
      filtroFuncao === 'todas' ||
      colaborador.funcao === filtroFuncao

    return (
      correspondeBusca &&
      correspondeStatus &&
      correspondeFuncao
    )
  })

  // PAGINAÇÃO
  const totalPaginas = Math.max(
    1,
    Math.ceil(colaboradoresFiltrados.length / itensPorPagina)
  )

  const indiceInicial = (paginaAtual - 1) * itensPorPagina

  const colaboradoresPagina = colaboradoresFiltrados.slice(
    indiceInicial,
    indiceInicial + itensPorPagina
  )

  const primeiroRegistro =
    colaboradoresFiltrados.length === 0 ? 0 : indiceInicial + 1

  const ultimoRegistro = Math.min(
    indiceInicial + itensPorPagina,
    colaboradoresFiltrados.length
  )

  // AJUSTAR PÁGINA CASO A QUANTIDADE DE REGISTROS DIMINUA
  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas)
    }
  }, [paginaAtual, totalPaginas])

  // INDICADORES
  const totalAtivos = colaboradores.filter(
    (colaborador) => colaborador.status === 'ativo'
  ).length

  const totalInativos = colaboradores.filter(
    (colaborador) => colaborador.status === 'inativo'
  ).length

  return (
    <section className="colaboradores-page">

      <div className="colaboradores-header">
        <div>
          <h2>Colaboradores</h2>
          <p>Gerencie os membros e colaboradores da igreja.</p>
        </div>

        <button
          className="btn-novo-colaborador"
          onClick={abrirCadastro}
        >
          + Novo colaborador
        </button>
      </div>

      {mensagem && (
        <p className="colaboradores-sucesso">
          {mensagem}
        </p>
      )}

      <div className="colaboradores-resumo">
        <div>
          <span>Total de colaboradores</span>
          <strong>{carregando ? '...' : colaboradores.length}</strong>
        </div>

        <div>
          <span>Colaboradores ativos</span>
          <strong>{carregando ? '...' : totalAtivos}</strong>
        </div>

        <div>
          <span>Colaboradores inativos</span>
          <strong>{carregando ? '...' : totalInativos}</strong>
        </div>
      </div>

      <div className="colaboradores-lista-card">

        <div className="colaboradores-lista-header">
          <h3>Lista de colaboradores</h3>

          <div className="colaboradores-filtros">
            <input
              type="search"
              placeholder="Pesquisar nome, função ou escolaridade..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPaginaAtual(1)
              }}
            />

            <select
              value={filtroFuncao}
              onChange={(e) => {
                setFiltroFuncao(e.target.value)
                setPaginaAtual(1)
              }}
            >
              <option value="todas">Todas as funções</option>

              {funcoes.map((funcao) => (
                <option key={funcao} value={funcao}>
                  {funcao}
                </option>
              ))}
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => {
                setFiltroStatus(e.target.value)
                setPaginaAtual(1)
              }}
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>
        </div>

        {erro && !modalAberto && (
          <p className="colaboradores-erro">{erro}</p>
        )}

        {carregando ? (
          <p className="colaboradores-mensagem">
            Carregando colaboradores...
          </p>
        ) : colaboradoresFiltrados.length === 0 ? (
          <p className="colaboradores-mensagem">
            {busca || filtroFuncao !== 'todas' || filtroStatus !== 'todos'
              ? 'Nenhum colaborador encontrado com os filtros selecionados.'
              : 'Nenhum colaborador cadastrado ainda.'}
          </p>
        ) : (
          <>
            <div className="colaboradores-tabela-responsiva">
              <table className="colaboradores-tabela">
                <thead>
                  <tr>
                    <th>Nome completo</th>
                    <th>Função</th>
                    <th>Escolaridade</th>
                    <th>Nascimento</th>
                    <th>Endereço</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {colaboradoresPagina.map((colaborador) => (
                    <tr key={colaborador.id}>
                      <td>{colaborador.nome}</td>
                      <td>{colaborador.funcao}</td>
                      <td>{colaborador.escolaridade}</td>
                      <td>{formatarData(colaborador.data_nascimento)}</td>
                      <td>{colaborador.endereco || '-'}</td>

                      <td>
                        <span
                          className={`colaborador-status ${colaborador.status}`}
                        >
                          {colaborador.status === 'ativo'
                            ? 'Ativo'
                            : 'Inativo'}
                        </span>
                      </td>

                      <td>
                        <div className="colaboradores-acoes">
                          <button
                            className="btn-editar-colaborador"
                            onClick={() => abrirEdicao(colaborador)}
                          >
                            Editar
                          </button>

                          <button
                            className="btn-status-colaborador"
                            onClick={() => alterarStatus(colaborador)}
                          >
                            {colaborador.status === 'ativo'
                              ? 'Inativar'
                              : 'Reativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CONTROLES DE PAGINAÇÃO */}
            <div className="colaboradores-paginacao">

              <div className="paginacao-info">
                <span>
                  Mostrando <strong>{primeiroRegistro}</strong> a{' '}
                  <strong>{ultimoRegistro}</strong> de{' '}
                  <strong>{colaboradoresFiltrados.length}</strong> colaboradores
                </span>
              </div>

              <div className="paginacao-configuracao">
                <label htmlFor="itens-por-pagina">
                  Mostrar:
                </label>

                <select
                  id="itens-por-pagina"
                  value={itensPorPagina}
                  onChange={(e) => {
                    setItensPorPagina(Number(e.target.value))
                    setPaginaAtual(1)
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <span>por página</span>
              </div>

              <div className="paginacao-navegacao">
                <button
                  type="button"
                  disabled={paginaAtual === 1}
                  onClick={() => setPaginaAtual(paginaAtual - 1)}
                >
                  Anterior
                </button>

                <span>
                  Página <strong>{paginaAtual}</strong> de{' '}
                  <strong>{totalPaginas}</strong>
                </span>

                <button
                  type="button"
                  disabled={paginaAtual === totalPaginas}
                  onClick={() => setPaginaAtual(paginaAtual + 1)}
                >
                  Próxima
                </button>
              </div>

            </div>
          </>
        )}
      </div>

      {modalAberto && (
        <div
          className="colaborador-modal-overlay"
          onClick={() => {
            if (!salvando) setModalAberto(false)
          }}
        >
          <div
            className="colaborador-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="colaborador-modal-header">
              <div>
                <h3>
                  {colaboradorEditando
                    ? 'Editar colaborador'
                    : 'Novo colaborador'}
                </h3>

                <p>
                  {colaboradorEditando
                    ? 'Atualize os dados do cadastro.'
                    : 'Preencha os dados do colaborador.'}
                </p>
              </div>

              <button
                type="button"
                className="colaborador-modal-fechar"
                disabled={salvando}
                onClick={() => setModalAberto(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={salvarColaborador}>
              <label htmlFor="colaborador-nome">
                Nome completo *
              </label>
              <input
                id="colaborador-nome"
                name="nome"
                value={formulario.nome}
                onChange={atualizarCampo}
                placeholder="Digite o nome completo"
                required
                maxLength={150}
              />

              <label htmlFor="colaborador-endereco">
                Endereço *
              </label>
              <input
                id="colaborador-endereco"
                name="endereco"
                value={formulario.endereco}
                onChange={atualizarCampo}
                placeholder="Rua, número, cidade e estado"
                required
                maxLength={250}
              />

              <label htmlFor="colaborador-escolaridade">
                Escolaridade *
              </label>
              <select
                id="colaborador-escolaridade"
                name="escolaridade"
                value={formulario.escolaridade}
                onChange={atualizarCampo}
                required
              >
                <option value="">Selecione a escolaridade</option>

                {escolaridades.map((escolaridade) => (
                  <option key={escolaridade} value={escolaridade}>
                    {escolaridade}
                  </option>
                ))}
              </select>

              <label htmlFor="colaborador-nascimento">
                Data de nascimento *
              </label>
              <input
                id="colaborador-nascimento"
                name="data_nascimento"
                type="date"
                value={formulario.data_nascimento}
                onChange={atualizarCampo}
                required
              />

              <label htmlFor="colaborador-funcao">
                Função *
              </label>
              <select
                id="colaborador-funcao"
                name="funcao"
                value={formulario.funcao}
                onChange={atualizarCampo}
                required
              >
                <option value="">Selecione a função</option>

                {funcoes.map((funcao) => (
                  <option key={funcao} value={funcao}>
                    {funcao}
                  </option>
                ))}
              </select>

              {!colaboradorEditando && (
                <div className="colaborador-acesso-section">
                  <label className="colaborador-acesso-checkbox">
                    <input
                      type="checkbox"
                      name="criarAcesso"
                      checked={formulario.criarAcesso}
                      onChange={atualizarCampo}
                    />
                    <span>
                      Também terá acesso como responsável?
                    </span>
                  </label>

                  {formulario.criarAcesso && (
                    <div className="colaborador-email-acesso">
                      <label htmlFor="colaborador-email">
                        E-mail para acesso ao sistema *
                      </label>

                      <input
                        id="colaborador-email"
                        name="email"
                        type="email"
                        value={formulario.email}
                        onChange={atualizarCampo}
                        placeholder="exemplo@email.com"
                        maxLength={254}
                        required
                      />

                      <small>
                        Enviaremos um convite para esse endereço.
                        A própria pessoa definirá sua senha.
                      </small>
                    </div>
                  )}
                </div>
              )}

              {colaboradorEditando?.profile_id && (
                <p className="colaborador-acesso-info">
                  Este colaborador já possui acesso ao sistema como responsável.
                </p>
              )}

              {erro && (
                <p className="colaboradores-erro">{erro}</p>
              )}

              <div className="colaborador-modal-acoes">
                <button
                  type="button"
                  className="colaborador-btn-cancelar"
                  disabled={salvando}
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="colaborador-btn-salvar"
                  disabled={salvando}
                >
                  {salvando
                    ? 'Salvando...'
                    : colaboradorEditando
                      ? 'Salvar alterações'
                      : 'Cadastrar colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  )
}

export default Colaboradores
