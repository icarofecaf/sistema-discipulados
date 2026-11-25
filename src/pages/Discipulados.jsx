
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import './Discipulados.css'

function obterDataAtual() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function Discipulados({ filtroInicial = 'todos' }) {
  const [discipulados, setDiscipulados] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState(filtroInicial)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [usuarioAdmin, setUsuarioAdmin] = useState(false)

  // TRANSFERÊNCIA
  const [discipuladoSelecionado, setDiscipuladoSelecionado] = useState(null)
  const [novoResponsavel, setNovoResponsavel] = useState('')
  const [transferindo, setTransferindo] = useState(false)
  const [mensagem, setMensagem] = useState('')

  // NOVO DISCIPULADO
  const [modalNovoDiscipulado, setModalNovoDiscipulado] = useState(false)
  const [pessoasDisponiveis, setPessoasDisponiveis] = useState([])
  const [novaPessoaId, setNovaPessoaId] = useState('')
  const [novoResponsavelId, setNovoResponsavelId] = useState('')
  const [dataInicio, setDataInicio] = useState(obterDataAtual())
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(false)
  const [salvandoNovoDiscipulado, setSalvandoNovoDiscipulado] = useState(false)
  const [mensagemNovoDiscipulado, setMensagemNovoDiscipulado] = useState('')

  // RECEBER FILTRO INICIAL DO DASHBOARD
  useEffect(() => {
    setFiltro(filtroInicial)
  }, [filtroInicial])

  useEffect(() => {
    verificarAdministrador()
    carregarDiscipulados()
  }, [])

  async function verificarAdministrador() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single()

    if (!error && data?.perfil === 'admin') {
      setUsuarioAdmin(true)
      await carregarResponsaveis()
    }
  }

  async function carregarResponsaveis() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email')
      .eq('perfil', 'responsavel')
      .order('nome')

    if (error) {
      console.error('Erro ao carregar responsáveis:', error)
      setErro('Não foi possível carregar os responsáveis.')
      return
    }

    setResponsaveis(data || [])
  }

  async function carregarDiscipulados() {
    setLoading(true)
    setErro('')

    const { data, error } = await supabase
      .from('discipulados')
      .select(`
        id,
        data_inicio,
        data_fim,
        status,
        responsavel_id,
        pessoa:pessoas_acompanhadas (
          nome
        ),
        responsavel:profiles!discipulados_responsavel_id_fkey (
          nome,
          email
        ),
        visitas (
          id
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar discipulados:', error)
      setErro('Não foi possível carregar os discipulados.')
      setDiscipulados([])
    } else {
      setDiscipulados(data || [])
    }

    setLoading(false)
  }

  function formatarData(data) {
    if (!data) return '-'

    return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
  }

  // =========================================
  // NOVO DISCIPULADO
  // =========================================

  async function carregarPessoasDisponiveis() {
    setCarregandoOpcoes(true)
    setMensagemNovoDiscipulado('')

    const [resultadoPessoas, resultadoDiscipulados] = await Promise.all([
      supabase
        .from('pessoas_acompanhadas')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('nome', { ascending: true }),

      supabase
        .from('discipulados')
        .select('pessoa_id')
        .eq('status', 'ativo'),
    ])

    if (resultadoPessoas.error) {
      console.error('Erro ao carregar pessoas:', resultadoPessoas.error)
      setPessoasDisponiveis([])
      setMensagemNovoDiscipulado(
        'Não foi possível carregar as pessoas disponíveis.'
      )
      setCarregandoOpcoes(false)
      return
    }

    if (resultadoDiscipulados.error) {
      console.error(
        'Erro ao consultar acompanhamentos ativos:',
        resultadoDiscipulados.error
      )

      setPessoasDisponiveis([])
      setMensagemNovoDiscipulado(
        'Não foi possível verificar os acompanhamentos existentes. Tente novamente.'
      )
      setCarregandoOpcoes(false)
      return
    }

    const pessoasComDiscipuladoAtivo = new Set(
      (resultadoDiscipulados.data || []).map((item) => item.pessoa_id)
    )

    const disponiveis = (resultadoPessoas.data || []).filter(
      (pessoa) => !pessoasComDiscipuladoAtivo.has(pessoa.id)
    )

    setPessoasDisponiveis(disponiveis)
    setCarregandoOpcoes(false)
  }

  async function abrirNovoDiscipulado() {
    setNovaPessoaId('')
    setNovoResponsavelId('')
    setDataInicio(obterDataAtual())
    setMensagemNovoDiscipulado('')
    setModalNovoDiscipulado(true)

    await carregarPessoasDisponiveis()
  }

  function fecharNovoDiscipulado() {
    if (salvandoNovoDiscipulado) return

    setModalNovoDiscipulado(false)
    setNovaPessoaId('')
    setNovoResponsavelId('')
    setDataInicio(obterDataAtual())
    setMensagemNovoDiscipulado('')
  }

  async function salvarNovoDiscipulado(e) {
    e.preventDefault()

    if (!novaPessoaId) {
      setMensagemNovoDiscipulado('Selecione uma pessoa.')
      return
    }

    if (!novoResponsavelId) {
      setMensagemNovoDiscipulado('Selecione um responsável.')
      return
    }

    if (!dataInicio) {
      setMensagemNovoDiscipulado('Informe a data de início.')
      return
    }

    setSalvandoNovoDiscipulado(true)
    setMensagemNovoDiscipulado('')

    const { error } = await supabase
      .from('discipulados')
      .insert({
        pessoa_id: novaPessoaId,
        responsavel_id: novoResponsavelId,
        data_inicio: dataInicio,
        status: 'ativo',
      })

    if (error) {
      console.error('Erro ao criar discipulado:', error)

      if (error.code === '23505') {
        setMensagemNovoDiscipulado(
          'Essa pessoa já possui um discipulado ativo.'
        )
      } else {
        setMensagemNovoDiscipulado(
          `Não foi possível criar o discipulado: ${error.message}`
        )
      }

      setSalvandoNovoDiscipulado(false)
      return
    }

    await carregarDiscipulados()

    setSalvandoNovoDiscipulado(false)
    setModalNovoDiscipulado(false)
    setNovaPessoaId('')
    setNovoResponsavelId('')
    setDataInicio(obterDataAtual())
    setMensagemNovoDiscipulado('')
  }

  // =========================================
  // TRANSFERÊNCIA
  // =========================================

  function abrirTransferencia(item) {
    setDiscipuladoSelecionado(item)
    setNovoResponsavel('')
    setMensagem('')
  }

  function fecharTransferencia() {
    if (transferindo) return

    setDiscipuladoSelecionado(null)
    setNovoResponsavel('')
    setMensagem('')
  }

  async function confirmarTransferencia() {
    if (!discipuladoSelecionado || !novoResponsavel) {
      setMensagem('Selecione o novo responsável.')
      return
    }

    if (novoResponsavel === discipuladoSelecionado.responsavel_id) {
      setMensagem('Este já é o responsável atual.')
      return
    }

    const responsavelEscolhido = responsaveis.find(
      (item) => item.id === novoResponsavel
    )

    const confirmou = window.confirm(
      `Deseja transferir ${
        discipuladoSelecionado.pessoa?.nome || 'esta pessoa'
      } para ${
        responsavelEscolhido?.nome || responsavelEscolhido?.email
      }?`
    )

    if (!confirmou) return

    setTransferindo(true)
    setMensagem('')

    const { error } = await supabase.rpc('transferir_discipulado', {
      p_discipulado_id: discipuladoSelecionado.id,
      p_novo_responsavel_id: novoResponsavel,
    })

    if (error) {
      console.error('Erro ao transferir discipulado:', error)
      setMensagem(
        `Não foi possível realizar a transferência: ${error.message}`
      )
      setTransferindo(false)
      return
    }

    setMensagem('Transferência realizada com sucesso!')

    await carregarDiscipulados()

    setTransferindo(false)

    setTimeout(() => {
      setDiscipuladoSelecionado(null)
      setNovoResponsavel('')
      setMensagem('')
    }, 1500)
  }

  // =========================================
  // FILTROS E INDICADORES
  // =========================================

  const discipuladosFiltrados = discipulados.filter((item) => {
    const nomePessoa = item.pessoa?.nome || ''
    const nomeResponsavel = item.responsavel?.nome || ''
    const emailResponsavel = item.responsavel?.email || ''

    const termoBusca = busca.toLowerCase()

    const correspondeBusca =
      nomePessoa.toLowerCase().includes(termoBusca) ||
      nomeResponsavel.toLowerCase().includes(termoBusca) ||
      emailResponsavel.toLowerCase().includes(termoBusca)

    const correspondeFiltro =
      filtro === 'todos' || item.status === filtro

    return correspondeBusca && correspondeFiltro
  })

  const totalAtivos = discipulados.filter(
    (item) => item.status === 'ativo'
  ).length

  const totalEncerrados = discipulados.filter(
    (item) => item.status === 'encerrado'
  ).length

  // =========================================
  // INTERFACE
  // =========================================

  return (
    <div className="discipulados-page">
      <div className="discipulados-header">
        <div>
          <h2>Discipulados</h2>
          <p>
            Consulte os acompanhamentos e seus respectivos responsáveis.
          </p>
        </div>

        {usuarioAdmin && (
          <button
            className="btn-transferir"
            onClick={abrirNovoDiscipulado}
          >
            + Novo discipulado
          </button>
        )}
      </div>

      <div className="discipulados-indicators">
        <div className="discipulado-indicator">
          <span>Total de discipulados</span>
          <strong>{loading ? '...' : discipulados.length}</strong>
        </div>

        <div className="discipulado-indicator">
          <span>Discipulados ativos</span>
          <strong>{loading ? '...' : totalAtivos}</strong>
        </div>

        <div className="discipulado-indicator">
          <span>Discipulados encerrados</span>
          <strong>{loading ? '...' : totalEncerrados}</strong>
        </div>
      </div>

      <div className="discipulados-list-card">
        <div className="discipulados-list-header">
          <h3>Lista de discipulados</h3>

          <div className="discipulados-filters">
            <input
              type="text"
              placeholder="Pesquisar pessoa ou responsável..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="encerrado">Encerrados</option>
            </select>
          </div>
        </div>

        {erro && (
          <div className="discipulados-error">
            {erro}

            <button onClick={carregarDiscipulados}>
              Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <p className="discipulados-message">
            Carregando discipulados...
          </p>
        ) : discipuladosFiltrados.length === 0 ? (
          <p className="discipulados-message">
            Nenhum discipulado encontrado.
          </p>
        ) : (
          <div className="discipulados-table-container">
            <table className="discipulados-table">
              <thead>
                <tr>
                  <th>Pessoa acompanhada</th>
                  <th>Responsável</th>
                  <th>Data de início</th>
                  <th>Data de encerramento</th>
                  <th>Visitas</th>
                  <th>Status</th>
                  {usuarioAdmin && <th>Ações</th>}
                </tr>
              </thead>

              <tbody>
                {discipuladosFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.pessoa?.nome || 'Não informado'}
                      </strong>
                    </td>

                    <td>
                      {item.responsavel?.nome ||
                        item.responsavel?.email ||
                        'Não informado'}
                    </td>

                    <td>{formatarData(item.data_inicio)}</td>
                    <td>{formatarData(item.data_fim)}</td>
                    <td>{item.visitas?.length || 0}</td>

                    <td>
                      <span
                        className={`discipulado-status ${
                          item.status === 'ativo'
                            ? 'status-ativo'
                            : 'status-encerrado'
                        }`}
                      >
                        {item.status === 'ativo' ? 'Ativo' : 'Encerrado'}
                      </span>
                    </td>

                    {usuarioAdmin && (
                      <td>
                        {item.status === 'ativo' && (
                          <button
                            className="btn-transferir"
                            onClick={() => abrirTransferencia(item)}
                          >
                            Transferir
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE NOVO DISCIPULADO */}
      {modalNovoDiscipulado && (
        <div className="transferencia-overlay">
          <div className="transferencia-modal">
            <h3>Novo discipulado</h3>

            <p>
              Selecione a pessoa, o responsável e a data de início do
              acompanhamento.
            </p>

            {carregandoOpcoes ? (
              <p className="discipulados-message">
                Carregando opções...
              </p>
            ) : (
              <form onSubmit={salvarNovoDiscipulado}>
                <label htmlFor="nova-pessoa">
                  Pessoa acompanhada
                </label>

                <select
                  id="nova-pessoa"
                  value={novaPessoaId}
                  onChange={(e) => setNovaPessoaId(e.target.value)}
                  disabled={salvandoNovoDiscipulado}
                  required
                >
                  <option value="">Selecione uma pessoa</option>

                  {pessoasDisponiveis.map((pessoa) => (
                    <option key={pessoa.id} value={pessoa.id}>
                      {pessoa.nome}
                    </option>
                  ))}
                </select>

                {pessoasDisponiveis.length === 0 &&
                  !mensagemNovoDiscipulado && (
                    <p className="transferencia-mensagem">
                      Não existem pessoas ativas disponíveis para iniciar
                      um novo discipulado.
                    </p>
                  )}

                <label htmlFor="novo-responsavel-discipulado">
                  Responsável
                </label>

                <select
                  id="novo-responsavel-discipulado"
                  value={novoResponsavelId}
                  onChange={(e) => setNovoResponsavelId(e.target.value)}
                  disabled={salvandoNovoDiscipulado}
                  required
                >
                  <option value="">Selecione um responsável</option>

                  {responsaveis.map((responsavel) => (
                    <option key={responsavel.id} value={responsavel.id}>
                      {responsavel.nome || responsavel.email}
                    </option>
                  ))}
                </select>

                <label htmlFor="data-inicio-discipulado">
                  Data de início
                </label>

                <input
                  id="data-inicio-discipulado"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  disabled={salvandoNovoDiscipulado}
                  required
                />

                {mensagemNovoDiscipulado && (
                  <p className="transferencia-mensagem">
                    {mensagemNovoDiscipulado}
                  </p>
                )}

                <div className="transferencia-acoes">
                  <button
                    type="button"
                    className="btn-cancelar"
                    onClick={fecharNovoDiscipulado}
                    disabled={salvandoNovoDiscipulado}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="btn-confirmar-transferencia"
                    disabled={
                      salvandoNovoDiscipulado ||
                      pessoasDisponiveis.length === 0 ||
                      responsaveis.length === 0
                    }
                  >
                    {salvandoNovoDiscipulado
                      ? 'Salvando...'
                      : 'Criar discipulado'}
                  </button>
                </div>
              </form>
            )}
            {!carregandoOpcoes && (
              <div className="transferencia-acoes">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={fecharNovoDiscipulado}
                  disabled={salvandoNovoDiscipulado}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE TRANSFERÊNCIA */}
      {discipuladoSelecionado && (
        <div className="transferencia-overlay">
          <div className="transferencia-modal">
            <h3>Transferir discipulado</h3>

            <p>
              Pessoa:{' '}
              <strong>{discipuladoSelecionado.pessoa?.nome}</strong>
            </p>

            <p>
              Responsável atual:{' '}
              <strong>
                {discipuladoSelecionado.responsavel?.nome ||
                  discipuladoSelecionado.responsavel?.email}
              </strong>
            </p>

            <label htmlFor="novo-responsavel">
              Novo responsável
            </label>

            <select
              id="novo-responsavel"
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              disabled={transferindo}
            >
              <option value="">Selecione um responsável</option>

              {responsaveis
                .filter(
                  (item) => item.id !== discipuladoSelecionado.responsavel_id
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome || item.email} ({item.email})
                  </option>
                ))}
            </select>

            {mensagem && (
              <p className="transferencia-mensagem">
                {mensagem}
              </p>
            )}

            <div className="transferencia-acoes">
              <button
                className="btn-cancelar"
                onClick={fecharTransferencia}
                disabled={transferindo}
              >
                Cancelar
              </button>

              <button
                className="btn-confirmar-transferencia"
                onClick={confirmarTransferencia}
                disabled={transferindo || !novoResponsavel}
              >
                {transferindo
                  ? 'Transferindo...'
                  : 'Confirmar transferência'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Discipulados