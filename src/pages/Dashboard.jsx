
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import Pessoas from './Pessoas'
import Visitas from './Visitas'
import Responsaveis from './Responsaveis'
import Colaboradores from './Colaboradores'
import Discipulados from './Discipulados'
import './Dashboard.css'

// =========================================
// VALIDAÇÃO DO CADASTRO DO RESPONSÁVEL
// =========================================

function validarCadastroPessoa(formulario) {
  const erros = {}

  const nome = (formulario.nome || '').trim().replace(/\s+/g, ' ')
  const nascimento = formulario.data_nascimento || ''
  const telefone = (formulario.telefone || '').trim()
  const endereco = (formulario.endereco || '').trim()

  // NOME
  const letrasNome = nome.match(/[\p{L}\p{M}]/gu) || []
  const nomeValido =
    /^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u.test(nome)

  if (!nome) {
    erros.nome = 'Informe o nome completo.'
  } else if (letrasNome.length < 3) {
    erros.nome = 'O nome precisa ter pelo menos 3 letras.'
  } else if (nome.length > 150) {
    erros.nome = 'O nome deve ter no máximo 150 caracteres.'
  } else if (!nomeValido) {
    erros.nome = 'O nome contém caracteres inválidos.'
  }

  // DATA DE NASCIMENTO
  if (nascimento) {
    const partes = nascimento.split('-').map(Number)

    if (partes.length !== 3 || partes.some(Number.isNaN)) {
      erros.data_nascimento = 'Informe uma data válida.'
    } else {
      const [ano, mes, dia] = partes
      const dataInformada = new Date(ano, mes - 1, dia)
      const hoje = new Date()

      hoje.setHours(0, 0, 0, 0)

      const limiteIdade = new Date(
        hoje.getFullYear() - 120,
        hoje.getMonth(),
        hoje.getDate()
      )

      const dataExiste =
        dataInformada.getFullYear() === ano &&
        dataInformada.getMonth() === mes - 1 &&
        dataInformada.getDate() === dia

      if (!dataExiste) {
        erros.data_nascimento = 'A data de nascimento não existe.'
      } else if (dataInformada > hoje) {
        erros.data_nascimento =
          'A data de nascimento não pode ser futura.'
      } else if (dataInformada < limiteIdade) {
        erros.data_nascimento =
          'A idade informada ultrapassa 120 anos.'
      }
    }
  }

  // TELEFONE
  if (telefone) {
    const formatoTelefone = /^[0-9()+\s.-]+$/.test(telefone)
    const digitos = telefone.replace(/\D/g, '')
    const ddd = Number(digitos.slice(0, 2))
    const todosIguais = /^(\d)\1+$/.test(digitos)

    const telefoneFixo =
      digitos.length === 10 &&
      Number(digitos[2]) >= 2 &&
      Number(digitos[2]) <= 5

    const telefoneCelular =
      digitos.length === 11 &&
      digitos[2] === '9'

    if (!formatoTelefone) {
      erros.telefone = 'O telefone contém caracteres inválidos.'
    } else if (
      ddd < 11 ||
      ddd > 99 ||
      todosIguais ||
      (!telefoneFixo && !telefoneCelular)
    ) {
      erros.telefone = 'Informe um telefone válido com DDD.'
    }
  }

  // ENDEREÇO
  if (endereco) {
    const formatoEndereco =
      /^[\p{L}\p{M}\d\s.,#ºª/:'’()\-]+$/u.test(endereco)

    const caracteresValidos =
      endereco.match(/[\p{L}\p{N}]/gu) || []

    const repeticaoExcessiva = /(.)\1{4,}/u.test(endereco)

    if (endereco.length < 5) {
      erros.endereco =
        'O endereço precisa ter pelo menos 5 caracteres.'
    } else if (endereco.length > 250) {
      erros.endereco =
        'O endereço deve ter no máximo 250 caracteres.'
    } else if (caracteresValidos.length < 3) {
      erros.endereco = 'Informe um endereço válido.'
    } else if (!formatoEndereco || repeticaoExcessiva) {
      erros.endereco = 'O endereço contém caracteres inválidos.'
    }
  }

  return erros
}

const formularioPessoaInicial = {
  nome: '',
  data_nascimento: '',
  telefone: '',
  endereco: '',
}

// =========================================
// DASHBOARD
// =========================================

function Dashboard({ profile, theme, onToggleTheme }) {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false)
  const [mobileMenuAberto, setMobileMenuAberto] = useState(false)

  const [somenteSemAcompanhamento, setSomenteSemAcompanhamento] =
    useState(false)

  const [filtroDiscipuladosInicial, setFiltroDiscipuladosInicial] =
    useState('todos')

  const [indicadores, setIndicadores] = useState({
    pessoas: 0,
    discipulados: 0,
    visitas: 0,
    responsaveis: 0,
    encerrados: 0,
    semAcompanhamento: 0,
  })

  const [visitasRecentes, setVisitasRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  // CADASTRO DE PESSOA PELO RESPONSÁVEL
  const [modalCadastroPessoaAberto, setModalCadastroPessoaAberto] =
    useState(false)

  const [formularioPessoa, setFormularioPessoa] = useState(
    formularioPessoaInicial
  )

  const [errosCadastroPessoa, setErrosCadastroPessoa] = useState({})
  const [erroCadastroPessoa, setErroCadastroPessoa] = useState('')
  const [salvandoPessoa, setSalvandoPessoa] = useState(false)
  const [feedbackCadastroPessoa, setFeedbackCadastroPessoa] =
    useState(null)

  const isAdmin = profile.perfil === 'admin'

  const nomePerfil = (profile.nome || '').trim()
  const emailPerfil = (profile.email || '').trim()

  const nomeExibicao =
    isAdmin &&
    (
      !nomePerfil ||
      nomePerfil.toLowerCase() === emailPerfil.toLowerCase() ||
      nomePerfil.includes('@')
    )
      ? 'Administrador'
      : nomePerfil || (isAdmin ? 'Administrador' : 'Responsável')

  const inicialNome = nomeExibicao.charAt(0).toUpperCase() || '?'

  // =========================================
  // CARREGAR INDICADORES E VISITAS RECENTES
  // =========================================

  async function carregarIndicadores() {
    setLoading(true)

    try {
      const [
        pessoas,
        discipulados,
        visitas,
        responsaveis,
        encerrados,
        pessoasAtivas,
        acompanhamentosAtivos,
        ultimasVisitas,
      ] = await Promise.all([
        supabase
          .from('pessoas_acompanhadas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativo'),

        supabase
          .from('discipulados')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativo'),

        supabase
          .from('visitas')
          .select('*', { count: 'exact', head: true }),

        isAdmin
          ? supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('perfil', 'responsavel')
          : Promise.resolve({ count: 0, error: null }),

        supabase
          .from('discipulados')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'encerrado'),

        isAdmin
          ? supabase
              .from('pessoas_acompanhadas')
              .select('id')
              .eq('status', 'ativo')
          : Promise.resolve({ data: [], error: null }),

        isAdmin
          ? supabase
              .from('discipulados')
              .select('pessoa_id')
              .eq('status', 'ativo')
          : Promise.resolve({ data: [], error: null }),

        supabase
          .from('visitas')
          .select(`
            id,
            data_visita,
            local,
            discipulado:discipulados (
              pessoa:pessoas_acompanhadas (
                nome
              ),
              responsavel:profiles!discipulados_responsavel_id_fkey (
                nome,
                email
              )
            )
          `)
          .order('data_visita', { ascending: false })
          .limit(5),
      ])

      const resultados = [
        pessoas,
        discipulados,
        visitas,
        responsaveis,
        encerrados,
        pessoasAtivas,
        acompanhamentosAtivos,
        ultimasVisitas,
      ]

      resultados.forEach((resultado, index) => {
        if (resultado.error) {
          console.error(
            `Erro ao carregar consulta ${index + 1}:`,
            resultado.error
          )
        }
      })

      let semAcompanhamento = 0

      if (
        isAdmin &&
        !pessoasAtivas.error &&
        !acompanhamentosAtivos.error
      ) {
        const pessoasComAcompanhamento = new Set(
          (acompanhamentosAtivos.data || []).map(
            (item) => item.pessoa_id
          )
        )

        semAcompanhamento = (pessoasAtivas.data || []).filter(
          (pessoa) => !pessoasComAcompanhamento.has(pessoa.id)
        ).length
      }

      setIndicadores({
        pessoas: pessoas.count ?? 0,
        discipulados: discipulados.count ?? 0,
        visitas: visitas.count ?? 0,
        responsaveis: responsaveis.count ?? 0,
        encerrados: encerrados.count ?? 0,
        semAcompanhamento,
      })

      setVisitasRecentes(ultimasVisitas.data || [])
    } catch (error) {
      console.error('Erro ao carregar o Dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarIndicadores()
  }, [isAdmin])

  // =========================================
  // CADASTRAR PESSOA PELO RESPONSÁVEL
  // =========================================

  function abrirCadastroPessoa() {
    setFormularioPessoa(formularioPessoaInicial)
    setErrosCadastroPessoa({})
    setErroCadastroPessoa('')
    setFeedbackCadastroPessoa(null)
    setModalCadastroPessoaAberto(true)
  }

  function fecharCadastroPessoa() {
    if (salvandoPessoa) return

    setModalCadastroPessoaAberto(false)
    setFormularioPessoa(formularioPessoaInicial)
    setErrosCadastroPessoa({})
    setErroCadastroPessoa('')
  }

  function atualizarCampoPessoa(e) {
    const { name, value } = e.target

    setFormularioPessoa((anterior) => ({
      ...anterior,
      [name]: value,
    }))

    setErrosCadastroPessoa((anterior) => ({
      ...anterior,
      [name]: '',
    }))

    setErroCadastroPessoa('')
  }

  async function salvarPessoaResponsavel(e) {
    e.preventDefault()

    setErroCadastroPessoa('')

    const erros = validarCadastroPessoa(formularioPessoa)

    setErrosCadastroPessoa(erros)

    if (Object.keys(erros).length > 0) {
      return
    }

    setSalvandoPessoa(true)

    const dados = {
      p_nome: formularioPessoa.nome.trim().replace(/\s+/g, ' '),
      p_data_nascimento: formularioPessoa.data_nascimento || null,
      p_telefone: formularioPessoa.telefone.trim() || null,
      p_endereco: formularioPessoa.endereco.trim() || null,
    }

    try {
      const { error } = await supabase.rpc(
        'cadastrar_pessoa_acompanhada',
        dados
      )

      if (error) {
        console.error('Erro ao cadastrar pessoa pela RPC:', error)
        throw error
      }

      setModalCadastroPessoaAberto(false)
      setFormularioPessoa(formularioPessoaInicial)
      setErrosCadastroPessoa({})

      setFeedbackCadastroPessoa({
        tipo: 'sucesso',
        mensagem:
          'Pessoa cadastrada com sucesso! O discipulado ativo já foi criado para você.',
      })

      // ATUALIZAR INDICADORES DO DASHBOARD
      await carregarIndicadores()
    } catch (error) {
      console.error('Erro ao salvar pessoa:', error)

      setErroCadastroPessoa(
        error.message ||
          'Não foi possível cadastrar a pessoa. Tente novamente.'
      )
    } finally {
      setSalvandoPessoa(false)
    }
  }

  // =========================================
  // SAIR DO SISTEMA
  // =========================================

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('Não foi possível sair do sistema.')
    }
  }

  // =========================================
  // ALTERNAR MENU LATERAL
  // =========================================

  function alternarMenu() {
    if (window.matchMedia('(max-width: 700px)').matches) {
      setMobileMenuAberto((aberto) => !aberto)
    } else {
      setSidebarRecolhida((recolhida) => !recolhida)
    }
  }

  // =========================================
  // ABRIR MÓDULO NORMALMENTE
  // =========================================

  function abrirModulo(modulo) {
    if (modulo === 'pessoas') {
      setSomenteSemAcompanhamento(false)
    }

    if (modulo === 'discipulados') {
      setFiltroDiscipuladosInicial('todos')
    }

    setActiveMenu(modulo)
    setMobileMenuAberto(false)
  }

  // =========================================
  // ABRIR PESSOAS JÁ FILTRADAS
  // =========================================

  function abrirPessoasSemAcompanhamento() {
    setSomenteSemAcompanhamento(true)
    setActiveMenu('pessoas')
    setMobileMenuAberto(false)
  }

  // =========================================
  // ABRIR DISCIPULADOS COM FILTRO ESPECÍFICO
  // =========================================

  function abrirDiscipuladosComFiltro(filtroSelecionado) {
    setFiltroDiscipuladosInicial(filtroSelecionado)
    setActiveMenu('discipulados')
    setMobileMenuAberto(false)
  }

  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },

    ...(isAdmin
      ? [
          { id: 'pessoas', label: 'Pessoas acompanhadas', icon: '♙' },
          { id: 'responsaveis', label: 'Responsáveis', icon: '♧' },
          { id: 'colaboradores', label: 'Colaboradores', icon: '♙' },
          { id: 'discipulados', label: 'Discipulados', icon: '▤' },
        ]
      : [
          { id: 'discipulados', label: 'Meus discipulados', icon: '▤' },
        ]),

    { id: 'visitas', label: 'Visitas', icon: '▣' },
  ]

  const tituloAtual =
    menu.find((item) => item.id === activeMenu)?.label || 'Dashboard'

  function formatarData(data) {
    if (!data) return '-'

    return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
  }

  // =========================================
  // INTERFACE
  // =========================================

  return (
    <div
      className={`dashboard-layout
        ${sidebarRecolhida ? 'sidebar-recolhida' : ''}
        ${mobileMenuAberto ? 'mobile-menu-aberto' : ''}`}
    >
      {mobileMenuAberto && (
        <button
          className="sidebar-overlay"
          onClick={() => setMobileMenuAberto(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">†</div>

          <div>
            <h2>Discipulados</h2>
            <span>Acompanhamento</span>
          </div>
        </div>

        <div className="sidebar-section">
          MENU PRINCIPAL
        </div>

        <nav className="sidebar-nav">
          {menu.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${
                activeMenu === item.id ? 'active' : ''
              }`}
              onClick={() => abrirModulo(item.id)}
              title={sidebarRecolhida ? item.label : undefined}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-avatar">
            {inicialNome}
          </div>

          <div className="user-info">
            <strong>{nomeExibicao}</strong>
            <span>
              {isAdmin ? 'Administrador' : 'Responsável'}
            </span>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            title="Sair"
            aria-label="Sair do sistema"
          >
            ⇥
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-title">
            <button
              className="sidebar-toggle"
              onClick={alternarMenu}
              title="Expandir ou recolher menu"
              aria-label="Expandir ou recolher menu"
            >
              ☰
            </button>

            <div>
              <h1>{tituloAtual}</h1>
              <p>Sistema de Acompanhamento de Discipulados</p>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={onToggleTheme}
              aria-label={`Ativar modo ${theme === 'light' ? 'escuro' : 'claro'}`}
              aria-pressed={theme === 'dark'}
            >
              <span aria-hidden="true">
                {theme === 'light' ? '◐' : '☼'}
              </span>
              {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            </button>

            <div className="topbar-user">
              <span>{nomeExibicao}</span>

              <div className="user-avatar small">
                {inicialNome}
              </div>
            </div>
          </div>
        </header>

        {activeMenu === 'dashboard' ? (
          <section className="dashboard-content">
            <div className="dashboard-welcome-row">
              <div className="welcome-section">
                <h2>Olá, {nomeExibicao}!</h2>
                <p>
                  {isAdmin
                    ? 'Acompanhe os indicadores gerais e a evolução dos discipulados.'
                    : 'Confira seus acompanhamentos e as visitas realizadas.'}
                </p>
              </div>

              {!isAdmin && (
                <button
                  type="button"
                  className="dashboard-primary-button"
                  onClick={abrirCadastroPessoa}
                >
                  + Cadastrar pessoa
                </button>
              )}
            </div>

            {feedbackCadastroPessoa && (
              <div
                className={`dashboard-feedback ${feedbackCadastroPessoa.tipo}`}
                role="status"
              >
                <span>{feedbackCadastroPessoa.mensagem}</span>

                <button
                  type="button"
                  onClick={() => setFeedbackCadastroPessoa(null)}
                  aria-label="Fechar mensagem"
                >
                  ×
                </button>
              </div>
            )}

            <div className="indicators-grid">
              {isAdmin ? (
                <button
                  type="button"
                  className="indicator-card indicator-card-button"
                  onClick={() => abrirModulo('pessoas')}
                  aria-label="Consultar pessoas acompanhadas"
                >
                  <div className="indicator-icon blue">♙</div>
                  <span>Pessoas acompanhadas</span>
                  <strong>{loading ? '...' : indicadores.pessoas}</strong>
                  <small>Cadastros ativos · Consultar pessoas</small>
                </button>
              ) : (
                <div className="indicator-card">
                  <div className="indicator-icon blue">♙</div>
                  <span>Pessoas acompanhadas</span>
                  <strong>{loading ? '...' : indicadores.pessoas}</strong>
                  <small>Cadastros ativos</small>
                </div>
              )}

              <button
                type="button"
                className="indicator-card indicator-card-button"
                onClick={() => abrirModulo('discipulados')}
                aria-label="Consultar discipulados"
              >
                <div className="indicator-icon green">▤</div>
                <span>Discipulados ativos</span>
                <strong>{loading ? '...' : indicadores.discipulados}</strong>
                <small>Acompanhamentos em andamento · Consultar</small>
              </button>

              <button
                type="button"
                className="indicator-card indicator-card-button"
                onClick={() => abrirModulo('visitas')}
                aria-label="Consultar visitas"
              >
                <div className="indicator-icon orange">▣</div>
                <span>Visitas realizadas</span>
                <strong>{loading ? '...' : indicadores.visitas}</strong>
                <small>Total de registros · Consultar visitas</small>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className="indicator-card indicator-card-button"
                  onClick={() => abrirModulo('responsaveis')}
                  aria-label="Consultar responsáveis"
                >
                  <div className="indicator-icon purple">♧</div>
                  <span>Responsáveis</span>
                  <strong>{loading ? '...' : indicadores.responsaveis}</strong>
                  <small>Usuários responsáveis · Gerenciar</small>
                </button>
              )}
            </div>

            <div className="dashboard-sections-grid">
              <div className="dashboard-panel dashboard-recent-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <h3>Visitas recentes</h3>
                    <p>Últimos registros realizados</p>
                  </div>

                  <button
                    type="button"
                    className="dashboard-text-button"
                    onClick={() => abrirModulo('visitas')}
                  >
                    Ver todas
                  </button>
                </div>

                {loading ? (
                  <p className="dashboard-empty">Carregando visitas...</p>
                ) : visitasRecentes.length === 0 ? (
                  <p className="dashboard-empty">
                    Nenhuma visita registrada.
                  </p>
                ) : (
                  <div className="dashboard-recent-list">
                    {visitasRecentes.map((visita) => (
                      <div
                        className="dashboard-recent-item"
                        key={visita.id}
                      >
                        <div className="dashboard-recent-icon">▣</div>

                        <div className="dashboard-recent-info">
                          <strong>
                            {visita.discipulado?.pessoa?.nome ||
                              'Pessoa não informada'}
                          </strong>

                          <span>
                            {visita.discipulado?.responsavel?.nome ||
                              visita.discipulado?.responsavel?.email ||
                              'Responsável não informado'}
                          </span>

                          <small>
                            {visita.local || 'Local não informado'}
                          </small>
                        </div>

                        <time>{formatarData(visita.data_visita)}</time>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dashboard-panel dashboard-summary-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <h3>Resumo dos acompanhamentos</h3>
                    <p>Situação atual dos registros</p>
                  </div>
                </div>

                <div className="dashboard-summary-list">
                  <button
                    type="button"
                    className="dashboard-summary-item dashboard-summary-action"
                    onClick={() => abrirDiscipuladosComFiltro('ativo')}
                  >
                    <span className="summary-dot green"></span>
                    <span>Discipulados ativos</span>
                    <strong>
                      {loading ? '...' : indicadores.discipulados}
                    </strong>
                  </button>

                  <button
                    type="button"
                    className="dashboard-summary-item dashboard-summary-action"
                    onClick={() => abrirDiscipuladosComFiltro('encerrado')}
                  >
                    <span className="summary-dot gray"></span>
                    <span>Discipulados encerrados</span>
                    <strong>
                      {loading ? '...' : indicadores.encerrados}
                    </strong>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      className="dashboard-summary-item dashboard-summary-action"
                      onClick={abrirPessoasSemAcompanhamento}
                    >
                      <span className="summary-dot orange"></span>
                      <span>Pessoas sem acompanhamento ativo</span>
                      <strong>
                        {loading ? '...' : indicadores.semAcompanhamento}
                      </strong>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="dashboard-outline-button"
                  onClick={() => abrirModulo('discipulados')}
                >
                  Consultar todos os discipulados
                </button>
              </div>
            </div>

            <div className="dashboard-panel dashboard-shortcuts">
              <div className="dashboard-panel-header">
                <div>
                  <h3>Acessos rápidos</h3>
                  <p>Acesse diretamente os módulos do sistema</p>
                </div>
              </div>

              <div className="dashboard-shortcuts-grid">
                {isAdmin && (
                  <>
                    <button
                      className="dashboard-shortcut"
                      onClick={() => abrirModulo('pessoas')}
                    >
                      <span className="shortcut-icon blue">♙</span>
                      <span>
                        <strong>Pessoas acompanhadas</strong>
                        <small>Consultar e cadastrar pessoas</small>
                      </span>
                      <b>›</b>
                    </button>

                    <button
                      className="dashboard-shortcut"
                      onClick={() => abrirModulo('responsaveis')}
                    >
                      <span className="shortcut-icon purple">♧</span>
                      <span>
                        <strong>Responsáveis</strong>
                        <small>Gerenciar responsáveis</small>
                      </span>
                      <b>›</b>
                    </button>

                    <button
                      className="dashboard-shortcut"
                      onClick={() => abrirModulo('colaboradores')}
                    >
                      <span className="shortcut-icon blue">♙</span>
                      <span>
                        <strong>Colaboradores</strong>
                        <small>Consultar e cadastrar colaboradores</small>
                      </span>
                      <b>›</b>
                    </button>
                  </>
                )}

                <button
                  className="dashboard-shortcut"
                  onClick={() => abrirModulo('discipulados')}
                >
                  <span className="shortcut-icon green">▤</span>
                  <span>
                    <strong>
                      {isAdmin ? 'Discipulados' : 'Meus discipulados'}
                    </strong>
                    <small>Consultar acompanhamentos</small>
                  </span>
                  <b>›</b>
                </button>

                <button
                  className="dashboard-shortcut"
                  onClick={() => abrirModulo('visitas')}
                >
                  <span className="shortcut-icon orange">▣</span>
                  <span>
                    <strong>Visitas</strong>
                    <small>Registrar e consultar visitas</small>
                  </span>
                  <b>›</b>
                </button>
              </div>
            </div>
          </section>
        ) : activeMenu === 'pessoas' && isAdmin ? (
          <section className="dashboard-content">
            <Pessoas
              somenteSemAcompanhamento={somenteSemAcompanhamento}
              onLimparFiltro={() => setSomenteSemAcompanhamento(false)}
            />
          </section>
        ) : activeMenu === 'responsaveis' && isAdmin ? (
          <section className="dashboard-content">
            <Responsaveis
              onResponsavelCriado={carregarIndicadores}
            />
          </section>
        ) : activeMenu === 'colaboradores' && isAdmin ? (
          <section className="dashboard-content">
            <Colaboradores />
          </section>
        ) : activeMenu === 'discipulados' ? (
          <section className="dashboard-content">
            <Discipulados filtroInicial={filtroDiscipuladosInicial} />
          </section>
        ) : activeMenu === 'visitas' ? (
          <section className="dashboard-content">
            <Visitas />
          </section>
        ) : (
          <section className="dashboard-content">
            <div className="welcome-section">
              <h2>{tituloAtual}</h2>
              <p>Este módulo não está disponível para este perfil.</p>
            </div>
          </section>
        )}

        {/* MODAL DE CADASTRO EXCLUSIVO DO RESPONSÁVEL */}
        {modalCadastroPessoaAberto && !isAdmin && (
          <div
            className="dashboard-modal-overlay"
            onClick={fecharCadastroPessoa}
          >
            <div
              className="dashboard-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-cadastro-pessoa-titulo"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dashboard-modal-header">
                <div>
                  <h2 id="modal-cadastro-pessoa-titulo">
                    Cadastrar pessoa
                  </h2>

                  <p>
                    Preencha os dados para iniciar um novo acompanhamento.
                  </p>
                </div>

                <button
                  type="button"
                  className="dashboard-modal-close"
                  onClick={fecharCadastroPessoa}
                  disabled={salvandoPessoa}
                  aria-label="Fechar formulário"
                >
                  ×
                </button>
              </div>

              <form
                className="dashboard-person-form"
                onSubmit={salvarPessoaResponsavel}
                noValidate
              >
                <div className="dashboard-form-field">
                  <label htmlFor="responsavel-pessoa-nome">
                    Nome completo *
                  </label>

                  <input
                    id="responsavel-pessoa-nome"
                    name="nome"
                    type="text"
                    value={formularioPessoa.nome}
                    onChange={atualizarCampoPessoa}
                    placeholder="Digite o nome completo"
                    maxLength={150}
                    required
                    aria-invalid={Boolean(errosCadastroPessoa.nome)}
                  />

                  {errosCadastroPessoa.nome && (
                    <small className="dashboard-field-error">
                      {errosCadastroPessoa.nome}
                    </small>
                  )}
                </div>

                <div className="dashboard-form-field">
                  <label htmlFor="responsavel-pessoa-nascimento">
                    Data de nascimento
                  </label>

                  <input
                    id="responsavel-pessoa-nascimento"
                    name="data_nascimento"
                    type="date"
                    value={formularioPessoa.data_nascimento}
                    onChange={atualizarCampoPessoa}
                    aria-invalid={Boolean(
                      errosCadastroPessoa.data_nascimento
                    )}
                  />

                  {errosCadastroPessoa.data_nascimento && (
                    <small className="dashboard-field-error">
                      {errosCadastroPessoa.data_nascimento}
                    </small>
                  )}
                </div>

                <div className="dashboard-form-field">
                  <label htmlFor="responsavel-pessoa-telefone">
                    Telefone
                  </label>

                  <input
                    id="responsavel-pessoa-telefone"
                    name="telefone"
                    type="tel"
                    value={formularioPessoa.telefone}
                    onChange={atualizarCampoPessoa}
                    placeholder="(00) 00000-0000"
                    maxLength={30}
                    aria-invalid={Boolean(errosCadastroPessoa.telefone)}
                  />

                  {errosCadastroPessoa.telefone && (
                    <small className="dashboard-field-error">
                      {errosCadastroPessoa.telefone}
                    </small>
                  )}
                </div>

                <div className="dashboard-form-field">
                  <label htmlFor="responsavel-pessoa-endereco">
                    Endereço
                  </label>

                  <input
                    id="responsavel-pessoa-endereco"
                    name="endereco"
                    type="text"
                    value={formularioPessoa.endereco}
                    onChange={atualizarCampoPessoa}
                    placeholder="Rua, número, bairro e cidade"
                    maxLength={250}
                    aria-invalid={Boolean(errosCadastroPessoa.endereco)}
                  />

                  {errosCadastroPessoa.endereco && (
                    <small className="dashboard-field-error">
                      {errosCadastroPessoa.endereco}
                    </small>
                  )}
                </div>

                {erroCadastroPessoa && (
                  <div className="dashboard-form-error" role="alert">
                    {erroCadastroPessoa}
                  </div>
                )}

                <div className="dashboard-modal-actions">
                  <button
                    type="button"
                    className="dashboard-modal-cancel"
                    onClick={fecharCadastroPessoa}
                    disabled={salvandoPessoa}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="dashboard-primary-button"
                    disabled={salvandoPessoa}
                  >
                    {salvandoPessoa
                      ? 'Cadastrando...'
                      : 'Cadastrar pessoa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
