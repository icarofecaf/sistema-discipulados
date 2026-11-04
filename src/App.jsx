import { useEffect, useState } from 'react'
import { supabase } from './services/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('discipulados-theme') === 'dark'
        ? 'dark'
        : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)

    try {
      localStorage.setItem('discipulados-theme', theme)
    } catch {
      console.error('Não foi possível salvar a preferência de tema.')
    }
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!session) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('nome, email, perfil')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Erro ao buscar perfil:', error.message)
        setProfile(null)
      } else {
        setProfile(data)
      }

      setLoading(false)
    }

    loadProfile()
  }, [session])

  if (loading) {
    return <div className="app-loading">Carregando...</div>
  }

  if (!session) {
    return <Login />
  }

  if (!profile) {
    return (
      <div className="app-loading">
        Não foi possível carregar seu perfil. Entre em contato com o administrador.
      </div>
    )
  }

  return (
    <Dashboard
      profile={profile}
      theme={theme}
      onToggleTheme={() =>
        setTheme((current) => current === 'light' ? 'dark' : 'light')
      }
    />
  )
}

export default App