import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import Pessoas from './Pessoas'
import Visitas from './Visitas'
import Responsaveis from './Responsaveis'
import Colaboradores from './Colaboradores'
import Discipulados from './Discipulados'
import './Dashboard.css'

function Dashboard({ profile, theme, onToggleTheme }) {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false)
  const [mobileMenuAberto, setMobileMenuAberto] = useState(false)

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

  const isAdmin = profile.perfil === 'admin'

  async function carregarIndicadores() {
    setLoading(true)

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
    setLoading(false)
  }

  useEffect(() => {
    carregarIndicadores()
  }, [isAdmin])

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('Não foi possível sair do sistema.')
    }
  }

  function alternarMenu() {
    if (window.matchMedia('(max-width: 700px)').matches) {
      setMobileMenuAberto((aberto) => !aberto)
    } else {
      setSidebarRecolhida((recolhida) => !recolhida)
    }
  }

  function abrirModulo(modulo) {
    setActiveMenu(modulo)
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

  const inicialNome = profile.nome?.charAt(0).toUpperCase() || '?'

  function formatarData(data) {
    if (!data) return '-'

    return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
  }

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
            <strong>{profile.nome}</strong>
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
              <span>{profile.nome}</span>

              <div className="user-avatar small">
                {inicialNome}
              </div>
            </div>
          </div>
        </header>

        {activeMenu === 'dashboard' ? (
          <section className="dashboard-content">
            <div className="welcome-section">
              <h2>Olá, {profile.nome}!</h2>
              <p>
                {isAdmin
                  ? 'Acompanhe os indicadores gerais e a evolução dos discipulados.'
                  : 'Confira seus acompanhamentos e as visitas realizadas.'}
              </p>
            </div>

            <div className="indicators-grid">
              <div className="indicator-card">
                <div className="indicator-icon blue">♙</div>
                <span>Pessoas acompanhadas</span>
                <strong>{loading ? '...' : indicadores.pessoas}</strong>
                <small>Cadastros ativos</small>
              </div>

              <div className="indicator-card">
                <div className="indicator-icon green">▤</div>
                <span>Discipulados ativos</span>
                <strong>{loading ? '...' : indicadores.discipulados}</strong>
                <small>Acompanhamentos em andamento</small>
              </div>

              <div className="indicator-card">
                <div className="indicator-icon orange">▣</div>
                <span>Visitas realizadas</span>
                <strong>{loading ? '...' : indicadores.visitas}</strong>
                <small>Total de registros</small>
              </div>

              {isAdmin && (
                <div className="indicator-card">
                  <div className="indicator-icon purple">♧</div>
                  <span>Responsáveis</span>
                  <strong>{loading ? '...' : indicadores.responsaveis}</strong>
                  <small>Usuários responsáveis</small>
                </div>
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
                  <div className="dashboard-summary-item">
                    <span className="summary-dot green"></span>
                    <span>Discipulados ativos</span>
                    <strong>
                      {loading ? '...' : indicadores.discipulados}
                    </strong>
                  </div>

                  <div className="dashboard-summary-item">
                    <span className="summary-dot gray"></span>
                    <span>Discipulados encerrados</span>
                    <strong>
                      {loading ? '...' : indicadores.encerrados}
                    </strong>
                  </div>

                  {isAdmin && (
                    <div className="dashboard-summary-item">
                      <span className="summary-dot orange"></span>
                      <span>Pessoas sem acompanhamento ativo</span>
                      <strong>
                        {loading ? '...' : indicadores.semAcompanhamento}
                      </strong>
                    </div>
                  )}
                </div>

                <button
                  className="dashboard-outline-button"
                  onClick={() => abrirModulo('discipulados')}
                >
                  Consultar discipulados
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
            <Pessoas />
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
            <Discipulados />
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
      </main>
    </div>
  )
}

export default Dashboard