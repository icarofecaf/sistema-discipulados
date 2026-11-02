
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import './Visitas.css'

function obterDataAtual() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function Visitas() {
  const [visitas, setVisitas] = useState([])
  const [discipulados, setDiscipulados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const formularioInicial = {
    discipulado_id: '',
    data_visita: obterDataAtual(),
    local: '',
    observacoes: '',
  }

  const [formulario, setFormulario] = useState(formularioInicial)

  // CARREGAR DISCIPULADOS E VISITAS
  async function carregarDados() {
    setCarregando(true)
    setErro('')

    const { data: discipuladosData, error: discipuladosError } =
      await supabase
        .from('discipulados')
        .select(`
          id,
          responsavel_id,
          pessoas_acompanhadas (
            nome
          )
        `)
        .eq('status', 'ativo')
        .order('data_inicio', { ascending: false })

    if (discipuladosError) {
      console.error('Erro ao carregar discipulados:', discipuladosError)
      setErro('Não foi possível carregar os acompanhamentos.')
      setCarregando(false)
      return
    }

    const { data: visitasData, error: visitasError } = await supabase
      .from('visitas')
      .select(`
        id,
        data_visita,
        local,
        observacoes,
        discipulados (
          pessoas_acompanhadas (
            nome
          ),
          responsavel:profiles!discipulados_responsavel_id_fkey (
            nome
          )
        )
      `)
      .order('data_visita', { ascending: false })

    if (visitasError) {
      console.error('Erro ao carregar visitas:', visitasError)
      setErro('Não foi possível carregar o histórico de visitas.')
    } else {
      setVisitas(visitasData || [])
    }

    setDiscipulados(discipuladosData || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // ATUALIZAR CAMPOS
  function atualizarCampo(e) {
    const { name, value } = e.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))

    setErro('')
    setMensagem('')
  }

  // FORMATAR DATA
  function formatarData(data) {
    if (!data) return '-'

    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // SALVAR VISITA
  async function salvarVisita(e) {
    e.preventDefault()

    setSalvando(true)
    setErro('')
    setMensagem('')

    const dados = {
      discipulado_id: formulario.discipulado_id,
      data_visita: formulario.data_visita,
      local: formulario.local.trim() || null,
      observacoes: formulario.observacoes.trim() || null,
    }

    const { error } = await supabase
      .from('visitas')
      .insert(dados)

    if (error) {
      console.error('Erro ao registrar visita:', error)
      setErro('Não foi possível registrar a visita. Verifique as permissões e tente novamente.')
      setSalvando(false)
      return
    }

    setFormulario(formularioInicial)
    setMensagem('Visita registrada com sucesso!')

    await carregarDados()

    setSalvando(false)
  }

  const totalVisitas = visitas.length

  return (
    <section className="visitas-page">

      <div className="visitas-header">
        <div>
          <h2>Registro de visitas</h2>
          <p>Registre as reuniões realizadas com as pessoas acompanhadas.</p>
        </div>
      </div>

      <div className="visitas-resumo">
        <div>
          <span>Total de visitas realizadas</span>
          <strong>{totalVisitas}</strong>
        </div>

        <div>
          <span>Discipulados ativos</span>
          <strong>{discipulados.length}</strong>
        </div>
      </div>

      <div className="visitas-form-card">
        <div className="visitas-card-header">
          <h3>Nova visita</h3>
          <p>Preencha os dados da reunião realizada.</p>
        </div>

        {discipulados.length === 0 ? (
          <p className="visitas-mensagem">
            Não existem discipulados ativos disponíveis para registrar visitas.
          </p>
        ) : (
          <form onSubmit={salvarVisita} className="visitas-form">

            <div className="visitas-campo">
              <label htmlFor="discipulado_id">
                Pessoa acompanhada *
              </label>

              <select
                id="discipulado_id"
                name="discipulado_id"
                value={formulario.discipulado_id}
                onChange={atualizarCampo}
                required
              >
                <option value="">Selecione uma pessoa</option>

                {discipulados.map((discipulado) => (
                  <option
                    key={discipulado.id}
                    value={discipulado.id}
                  >
                    {discipulado.pessoas_acompanhadas?.nome || 'Pessoa sem nome'}
                  </option>
                ))}
              </select>
            </div>

            <div className="visitas-campo">
              <label htmlFor="data_visita">
                Data da visita *
              </label>

              <input
                id="data_visita"
                name="data_visita"
                type="date"
                value={formulario.data_visita}
                onChange={atualizarCampo}
                required
              />
            </div>

            <div className="visitas-campo">
              <label htmlFor="local">
                Local da reunião
              </label>

              <input
                id="local"
                name="local"
                type="text"
                value={formulario.local}
                onChange={atualizarCampo}
                placeholder="Ex.: Residência da pessoa acompanhada"
                maxLength={200}
              />
            </div>

            <div className="visitas-campo">
              <label htmlFor="observacoes">
                Observações
              </label>

              <textarea
                id="observacoes"
                name="observacoes"
                value={formulario.observacoes}
                onChange={atualizarCampo}
                placeholder="Descreva como foi a reunião..."
                rows={4}
              />
            </div>

            {erro && (
              <p className="visitas-erro">{erro}</p>
            )}

            {mensagem && (
              <p className="visitas-sucesso">{mensagem}</p>
            )}

            <div className="visitas-form-acoes">
              <button
                type="submit"
                className="btn-registrar-visita"
                disabled={salvando}
              >
                {salvando ? 'Registrando...' : 'Registrar visita'}
              </button>
            </div>

          </form>
        )}
      </div>

      <div className="visitas-historico-card">
        <div className="visitas-card-header">
          <h3>Histórico de visitas</h3>
          <p>Confira os registros das reuniões realizadas.</p>
        </div>

        {carregando ? (
          <p className="visitas-mensagem">Carregando visitas...</p>
        ) : visitas.length === 0 ? (
          <p className="visitas-mensagem">
            Nenhuma visita registrada ainda.
          </p>
        ) : (
          <div className="visitas-tabela-responsiva">
            <table className="visitas-tabela">
              <thead>
                <tr>
                  <th>Pessoa acompanhada</th>
                  <th>Responsável</th>
                  <th>Data</th>
                  <th>Local</th>
                  <th>Observações</th>
                </tr>
              </thead>

              <tbody>
                {visitas.map((visita) => (
                  <tr key={visita.id}>
                    <td>
                      {visita.discipulados?.pessoas_acompanhadas?.nome || '-'}
                    </td>

                    <td>
                      {visita.discipulados?.responsavel?.nome || '-'}
                    </td>

                    <td>{formatarData(visita.data_visita)}</td>
                    <td>{visita.local || '-'}</td>
                    <td>{visita.observacoes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </section>
  )
}

export default Visitas
