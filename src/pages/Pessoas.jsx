
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import './Pessoas.css'

function Pessoas() {
  const [pessoas, setPessoas] = useState([])
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [pessoaEditando, setPessoaEditando] = useState(null)

  const formularioInicial = {
    nome: '',
    data_nascimento: '',
    telefone: '',
    endereco: '',
  }

  const [formulario, setFormulario] = useState(formularioInicial)

  // CARREGAR PESSOAS
  async function carregarPessoas() {
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase
      .from('pessoas_acompanhadas')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar pessoas:', error)
      setErro('Não foi possível carregar as pessoas.')
    } else {
      setPessoas(data || [])
    }

    setCarregando(false)
  }

  useEffect(() => {
    carregarPessoas()
  }, [])

  // ATUALIZAR CAMPOS
  function atualizarCampo(e) {
    const { name, value } = e.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  // ABRIR CADASTRO
  function abrirCadastro() {
    setPessoaEditando(null)
    setFormulario(formularioInicial)
    setErro('')
    setModalAberto(true)
  }

  // ABRIR EDIÇÃO
  function abrirEdicao(pessoa) {
    setPessoaEditando(pessoa)

    setFormulario({
      nome: pessoa.nome || '',
      data_nascimento: pessoa.data_nascimento || '',
      telefone: pessoa.telefone || '',
      endereco: pessoa.endereco || '',
    })

    setErro('')
    setModalAberto(true)
  }

  // SALVAR CADASTRO OU EDIÇÃO
  async function salvarPessoa(e) {
    e.preventDefault()

    setSalvando(true)
    setErro('')

    const dados = {
      nome: formulario.nome.trim(),
      data_nascimento: formulario.data_nascimento || null,
      telefone: formulario.telefone.trim() || null,
      endereco: formulario.endereco.trim() || null,
    }

    try {
      let resultado

      if (pessoaEditando) {
        // ATUALIZAR PESSOA EXISTENTE
        resultado = await supabase
          .from('pessoas_acompanhadas')
          .update(dados)
          .eq('id', pessoaEditando.id)

      } else {
        // IDENTIFICAR USUARIO LOGADO
        const { data: usuarioData, error: usuarioErro } =
          await supabase.auth.getUser()

        if (usuarioErro || !usuarioData.user) {
          throw new Error('Não foi possível identificar o usuário logado.')
        }

        // CONSULTAR PERFIL DO USUARIO
        const { data: perfil, error: perfilErro } = await supabase
          .from('profiles')
          .select('perfil')
          .eq('id', usuarioData.user.id)
          .single()

        if (perfilErro || !perfil) {
          throw new Error('Não foi possível identificar o perfil do usuário.')
        }

        if (perfil.perfil === 'responsavel') {
          // RESPONSAVEL: CADASTRAR PESSOA E DISCIPULADO
          const { error } = await supabase.rpc(
            'cadastrar_pessoa_acompanhada',
            {
              p_nome: dados.nome,
              p_data_nascimento: dados.data_nascimento,
              p_telefone: dados.telefone,
              p_endereco: dados.endereco,
            }
          )

          resultado = { error }

        } else if (perfil.perfil === 'admin') {
          // ADMINISTRADOR: CADASTRO ADMINISTRATIVO
          resultado = await supabase
            .from('pessoas_acompanhadas')
            .insert(dados)

        } else {
          throw new Error('Seu perfil não possui permissão para cadastrar pessoas.')
        }
      }

      if (resultado.error) {
        throw resultado.error
      }

      setFormulario(formularioInicial)
      setPessoaEditando(null)
      setModalAberto(false)

      await carregarPessoas()

    } catch (error) {
      console.error('Erro ao salvar pessoa:', error)

      setErro(
        pessoaEditando
          ? 'Não foi possível atualizar o cadastro.'
          : error.message || 'Não foi possível cadastrar a pessoa.'
      )
    } finally {
      setSalvando(false)
    }
  }

  // ALTERAR STATUS
  async function alterarStatus(pessoa) {
    const novoStatus =
      pessoa.status === 'ativo' ? 'inativo' : 'ativo'

    const confirmar = window.confirm(
      `Deseja realmente ${
        novoStatus === 'ativo' ? 'reativar' : 'inativar'
      } o cadastro de ${pessoa.nome}?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('pessoas_acompanhadas')
      .update({ status: novoStatus })
      .eq('id', pessoa.id)

    if (error) {
      console.error('Erro ao alterar status:', error)
      alert('Não foi possível alterar o status.')
      return
    }

    await carregarPessoas()
  }

  // FORMATAR DATA
  function formatarData(data) {
    if (!data) return '-'

    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // PESQUISAR
  const pessoasFiltradas = pessoas.filter((pessoa) =>
    pessoa.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const totalAtivas = pessoas.filter(
    (pessoa) => pessoa.status === 'ativo'
  ).length

  return (
    <section className="pessoas-page">

      <div className="pessoas-header">
        <div>
          <h2>Pessoas acompanhadas</h2>
          <p>Gerencie as pessoas que recebem discipulado.</p>
        </div>

        <button
          className="btn-nova-pessoa"
          onClick={abrirCadastro}
        >
          + Nova pessoa
        </button>
      </div>

      <div className="pessoas-resumo">
        <div>
          <span>Total de cadastros</span>
          <strong>{pessoas.length}</strong>
        </div>

        <div>
          <span>Cadastros ativos</span>
          <strong>{totalAtivas}</strong>
        </div>
      </div>

      <div className="pessoas-lista-card">

        <div className="pessoas-lista-header">
          <h3>Lista de pessoas</h3>

          <input
            type="search"
            placeholder="Pesquisar pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {erro && !modalAberto && (
          <p className="pessoas-erro">{erro}</p>
        )}

        {carregando ? (
          <p className="pessoas-mensagem">
            Carregando pessoas...
          </p>
        ) : pessoasFiltradas.length === 0 ? (
          <p className="pessoas-mensagem">
            {busca
              ? 'Nenhuma pessoa encontrada.'
              : 'Nenhuma pessoa cadastrada ainda.'}
          </p>
        ) : (
          <div className="tabela-responsiva">
            <table className="pessoas-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Nascimento</th>
                  <th>Telefone</th>
                  <th>Endereço</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {pessoasFiltradas.map((pessoa) => (
                  <tr key={pessoa.id}>
                    <td>{pessoa.nome}</td>
                    <td>{formatarData(pessoa.data_nascimento)}</td>
                    <td>{pessoa.telefone || '-'}</td>
                    <td>{pessoa.endereco || '-'}</td>

                    <td>
                      <span
                        className={`status-pessoa ${pessoa.status}`}
                      >
                        {pessoa.status === 'ativo'
                          ? 'Ativo'
                          : 'Inativo'}
                      </span>
                    </td>

                    <td>
                      <div className="pessoas-acoes">
                        <button
                          className="btn-editar"
                          onClick={() => abrirEdicao(pessoa)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn-status"
                          onClick={() => alterarStatus(pessoa)}
                        >
                          {pessoa.status === 'ativo'
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
        )}
      </div>

      {modalAberto && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!salvando) setModalAberto(false)
          }}
        >
          <div
            className="modal-pessoa"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-pessoa-header">
              <div>
                <h3>
                  {pessoaEditando ? 'Editar pessoa' : 'Nova pessoa'}
                </h3>

                <p>
                  {pessoaEditando
                    ? 'Atualize os dados do cadastro.'
                    : 'Preencha os dados para realizar o cadastro.'}
                </p>
              </div>

              <button
                type="button"
                className="modal-fechar"
                disabled={salvando}
                onClick={() => setModalAberto(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={salvarPessoa}>

              <label htmlFor="nome">Nome completo *</label>
              <input
                id="nome"
                name="nome"
                value={formulario.nome}
                onChange={atualizarCampo}
                placeholder="Digite o nome completo"
                required
                maxLength={150}
              />

              <label htmlFor="data_nascimento">
                Data de nascimento
              </label>
              <input
                id="data_nascimento"
                name="data_nascimento"
                type="date"
                value={formulario.data_nascimento}
                onChange={atualizarCampo}
              />

              <label htmlFor="telefone">Telefone</label>
              <input
                id="telefone"
                name="telefone"
                type="tel"
                value={formulario.telefone}
                onChange={atualizarCampo}
                placeholder="(00) 00000-0000"
                maxLength={30}
              />

              <label htmlFor="endereco">Endereço</label>
              <input
                id="endereco"
                name="endereco"
                value={formulario.endereco}
                onChange={atualizarCampo}
                placeholder="Rua, número, bairro e cidade"
                maxLength={250}
              />

              {erro && (
                <p className="pessoas-erro">{erro}</p>
              )}

              <div className="modal-acoes">
                <button
                  type="button"
                  className="btn-cancelar"
                  disabled={salvando}
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-salvar"
                  disabled={salvando}
                >
                  {salvando
                    ? 'Salvando...'
                    : pessoaEditando
                      ? 'Salvar alterações'
                      : 'Cadastrar pessoa'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </section>
  )
}

export default Pessoas
