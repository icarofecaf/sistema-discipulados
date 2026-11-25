
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import './Pessoas.css'

// =========================================
// VALIDAÇÕES
// =========================================

function validarFormulario(formulario) {
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
        erros.data_nascimento = 'A data de nascimento não pode ser futura.'
      } else if (dataInformada < limiteIdade) {
        erros.data_nascimento = 'A idade informada ultrapassa 120 anos.'
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
      erros.telefone =
        'Informe um telefone válido com DDD.'
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
      erros.endereco = 'O endereço precisa ter pelo menos 5 caracteres.'
    } else if (endereco.length > 250) {
      erros.endereco = 'O endereço deve ter no máximo 250 caracteres.'
    } else if (caracteresValidos.length < 3) {
      erros.endereco = 'Informe um endereço válido.'
    } else if (!formatoEndereco || repeticaoExcessiva) {
      erros.endereco = 'O endereço contém caracteres inválidos.'
    }
  }

  return erros
}

// =========================================
// COMPONENTE
// =========================================

function Pessoas({
  somenteSemAcompanhamento = false,
  onLimparFiltro,
}) {
  const [pessoas, setPessoas] = useState([])
  const [pessoasComAcompanhamento, setPessoasComAcompanhamento] =
    useState(new Set())

  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [errosCampos, setErrosCampos] = useState({})
  const [erroAcompanhamentos, setErroAcompanhamentos] = useState(false)
  const [pessoaEditando, setPessoaEditando] = useState(null)

  const formularioInicial = {
    nome: '',
    data_nascimento: '',
    telefone: '',
    endereco: '',
  }

  const [formulario, setFormulario] = useState(formularioInicial)

  // =========================================
  // CARREGAR PESSOAS E ACOMPANHAMENTOS
  // =========================================

  async function carregarPessoas() {
    setCarregando(true)
    setErro('')
    setErroAcompanhamentos(false)

    try {
      const [resultadoPessoas, resultadoDiscipulados] =
        await Promise.all([
          supabase
            .from('pessoas_acompanhadas')
            .select('*')
            .order('nome', { ascending: true }),

          supabase
            .from('discipulados')
            .select('pessoa_id')
            .eq('status', 'ativo'),
        ])

      if (resultadoPessoas.error) {
        console.error(
          'Erro ao carregar pessoas:',
          resultadoPessoas.error
        )

        setErro('Não foi possível carregar as pessoas.')
        setPessoas([])
      } else {
        setPessoas(resultadoPessoas.data || [])
      }

      if (resultadoDiscipulados.error) {
        console.error(
          'Erro ao carregar acompanhamentos:',
          resultadoDiscipulados.error
        )

        setErroAcompanhamentos(true)
        setPessoasComAcompanhamento(new Set())
      } else {
        const ids = new Set(
          (resultadoDiscipulados.data || []).map(
            (item) => item.pessoa_id
          )
        )

        setPessoasComAcompanhamento(ids)
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar pessoas:', error)
      setErro('Ocorreu um erro ao carregar os dados.')
      setErroAcompanhamentos(true)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarPessoas()
  }, [])

  useEffect(() => {
    setBusca('')
  }, [somenteSemAcompanhamento])

  // =========================================
  // ATUALIZAR CAMPOS
  // =========================================

  function atualizarCampo(e) {
    const { name, value } = e.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))

    setErrosCampos((anterior) => ({
      ...anterior,
      [name]: '',
    }))

    setErro('')
  }

  // =========================================
  // ABRIR CADASTRO
  // =========================================

  function abrirCadastro() {
    setPessoaEditando(null)
    setFormulario(formularioInicial)
    setErrosCampos({})
    setErro('')
    setModalAberto(true)
  }

  // =========================================
  // ABRIR EDIÇÃO
  // =========================================

  function abrirEdicao(pessoa) {
    setPessoaEditando(pessoa)

    setFormulario({
      nome: pessoa.nome || '',
      data_nascimento: pessoa.data_nascimento || '',
      telefone: pessoa.telefone || '',
      endereco: pessoa.endereco || '',
    })

    setErrosCampos({})
    setErro('')
    setModalAberto(true)
  }

  // =========================================
  // SALVAR CADASTRO OU EDIÇÃO
  // =========================================

  async function salvarPessoa(e) {
    e.preventDefault()

    setErro('')

    // VALIDAR TODOS OS CAMPOS ANTES DE SALVAR
    const errosValidacao = validarFormulario(formulario)

    setErrosCampos(errosValidacao)

    if (Object.keys(errosValidacao).length > 0) {
      return
    }

    setSalvando(true)

    const dados = {
      nome: formulario.nome.trim().replace(/\s+/g, ' '),
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
        // IDENTIFICAR USUÁRIO LOGADO
        const {
          data: usuarioData,
          error: usuarioErro,
        } = await supabase.auth.getUser()

        if (usuarioErro || !usuarioData.user) {
          throw new Error(
            'Não foi possível identificar o usuário logado.'
          )
        }

        // CONSULTAR PERFIL DO USUÁRIO
        const { data: perfil, error: perfilErro } =
          await supabase
            .from('profiles')
            .select('perfil')
            .eq('id', usuarioData.user.id)
            .single()

        if (perfilErro || !perfil) {
          throw new Error(
            'Não foi possível identificar o perfil do usuário.'
          )
        }

        if (perfil.perfil === 'responsavel') {
          // RESPONSÁVEL: CADASTRAR PESSOA E DISCIPULADO
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
          throw new Error(
            'Seu perfil não possui permissão para cadastrar pessoas.'
          )
        }
      }

      if (resultado.error) {
        throw resultado.error
      }

      setFormulario(formularioInicial)
      setErrosCampos({})
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

  // =========================================
  // ALTERAR STATUS
  // =========================================

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

  // =========================================
  // FORMATAR DATA
  // =========================================

  function formatarData(data) {
    if (!data) return '-'

    const [ano, mes, dia] = data.split('-')

    return `${dia}/${mes}/${ano}`
  }

  // =========================================
  // FILTROS
  // =========================================

  const pessoasSemAcompanhamento = pessoas.filter(
    (pessoa) =>
      pessoa.status === 'ativo' &&
      !pessoasComAcompanhamento.has(pessoa.id)
  )

  const pessoasBase = somenteSemAcompanhamento
    ? pessoasSemAcompanhamento
    : pessoas

  const pessoasFiltradas = pessoasBase.filter((pessoa) =>
    (pessoa.nome || '')
      .toLowerCase()
      .includes(busca.toLowerCase())
  )

  const totalAtivas = pessoas.filter(
    (pessoa) => pessoa.status === 'ativo'
  ).length

  const totalSemAcompanhamento = erroAcompanhamentos
    ? null
    : pessoasSemAcompanhamento.length

  // =========================================
  // INTERFACE
  // =========================================

  return (
    <section className="pessoas-page">
      <div className="pessoas-header">
        <div>
          <h2>Pessoas acompanhadas</h2>

          <p>
            {somenteSemAcompanhamento
              ? 'Pessoas com cadastro ativo que ainda não possuem um discipulado ativo.'
              : 'Gerencie as pessoas que recebem discipulado.'}
          </p>
        </div>

        <button
          className="btn-nova-pessoa"
          onClick={abrirCadastro}
        >
          + Nova pessoa
        </button>
      </div>

      {somenteSemAcompanhamento && (
        <div className="pessoas-filtro-banner">
          <div>
            <strong>Filtro aplicado</strong>
            <span>
              Exibindo somente pessoas ativas sem acompanhamento ativo.
            </span>
          </div>

          <button
            type="button"
            onClick={() => onLimparFiltro?.()}
          >
            Ver todas as pessoas
          </button>
        </div>
      )}

      <div className="pessoas-resumo">
        <div>
          <span>Total de cadastros</span>
          <strong>{pessoas.length}</strong>
        </div>

        <div>
          <span>Cadastros ativos</span>
          <strong>{totalAtivas}</strong>
        </div>

        {somenteSemAcompanhamento && (
          <div>
            <span>Sem acompanhamento ativo</span>
            <strong>
              {totalSemAcompanhamento === null
                ? '...'
                : totalSemAcompanhamento}
            </strong>
          </div>
        )}
      </div>

      <div className="pessoas-lista-card">
        <div className="pessoas-lista-header">
          <h3>
            {somenteSemAcompanhamento
              ? 'Pessoas sem acompanhamento ativo'
              : 'Lista de pessoas'}
          </h3>

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

        {somenteSemAcompanhamento && erroAcompanhamentos ? (
          <p className="pessoas-erro">
            Não foi possível consultar os discipulados ativos.
            A lista não será exibida para evitar identificar pessoas
            incorretamente.
            <button
              type="button"
              onClick={carregarPessoas}
              style={{ marginLeft: '10px' }}
            >
              Tentar novamente
            </button>
          </p>
        ) : carregando ? (
          <p className="pessoas-mensagem">
            Carregando pessoas...
          </p>
        ) : pessoasFiltradas.length === 0 ? (
          <p className="pessoas-mensagem">
            {busca
              ? 'Nenhuma pessoa encontrada.'
              : somenteSemAcompanhamento
                ? 'Todas as pessoas ativas possuem acompanhamento ativo.'
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

                    <td>
                      {formatarData(pessoa.data_nascimento)}
                    </td>

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

      {/* MODAL DE CADASTRO E EDIÇÃO */}
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
                  {pessoaEditando
                    ? 'Editar pessoa'
                    : 'Nova pessoa'}
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

            <form onSubmit={salvarPessoa} noValidate>
              <label htmlFor="nome">
                Nome completo *
              </label>

              <input
                id="nome"
                name="nome"
                value={formulario.nome}
                onChange={atualizarCampo}
                placeholder="Digite o nome completo"
                required
                maxLength={150}
                aria-invalid={Boolean(errosCampos.nome)}
                style={
                  errosCampos.nome
                    ? { borderColor: '#dc2626' }
                    : undefined
                }
              />

              {errosCampos.nome && (
                <small style={{ color: '#dc2626' }}>
                  {errosCampos.nome}
                </small>
              )}

              <label htmlFor="data_nascimento">
                Data de nascimento
              </label>

              <input
                id="data_nascimento"
                name="data_nascimento"
                type="date"
                value={formulario.data_nascimento}
                onChange={atualizarCampo}
                aria-invalid={Boolean(errosCampos.data_nascimento)}
                style={
                  errosCampos.data_nascimento
                    ? { borderColor: '#dc2626' }
                    : undefined
                }
              />

              {errosCampos.data_nascimento && (
                <small style={{ color: '#dc2626' }}>
                  {errosCampos.data_nascimento}
                </small>
              )}

              <label htmlFor="telefone">
                Telefone
              </label>

              <input
                id="telefone"
                name="telefone"
                type="tel"
                value={formulario.telefone}
                onChange={atualizarCampo}
                placeholder="(00) 00000-0000"
                maxLength={30}
                aria-invalid={Boolean(errosCampos.telefone)}
                style={
                  errosCampos.telefone
                    ? { borderColor: '#dc2626' }
                    : undefined
                }
              />

              {errosCampos.telefone && (
                <small style={{ color: '#dc2626' }}>
                  {errosCampos.telefone}
                </small>
              )}

              <label htmlFor="endereco">
                Endereço
              </label>

              <input
                id="endereco"
                name="endereco"
                value={formulario.endereco}
                onChange={atualizarCampo}
                placeholder="Rua, número, bairro e cidade"
                maxLength={250}
                aria-invalid={Boolean(errosCampos.endereco)}
                style={
                  errosCampos.endereco
                    ? { borderColor: '#dc2626' }
                    : undefined
                }
              />

              {errosCampos.endereco && (
                <small style={{ color: '#dc2626' }}>
                  {errosCampos.endereco}
                </small>
              )}

              {erro && (
                <p className="pessoas-erro">
                  {erro}
                </p>
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
