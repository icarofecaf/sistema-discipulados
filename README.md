# Sistema de Acompanhamento de Discipulados

Aplicação web desenvolvida para organizar o acompanhamento de pessoas por meio de discipulados e visitas, centralizando cadastros, responsáveis e históricos em um único sistema.

**Acesso ao sistema:** https://sistema-discipulados.vercel.app/  
**Repositório:** https://github.com/icarofecaf/sistema-discipulados

## Sobre o projeto

O Sistema de Acompanhamento de Discipulados foi desenvolvido como projeto acadêmico com o objetivo de substituir controles manuais e facilitar a organização dos acompanhamentos realizados pela igreja.

A aplicação possui dois perfis de acesso:

- **Administrador:** gerencia os cadastros, os responsáveis, os colaboradores, os discipulados e as transferências.
- **Responsável:** acompanha seus próprios discipulados, cadastra pessoas acompanhadas e registra as visitas correspondentes.

## Funcionalidades

### Administrador

- Visualizar indicadores e resumos no Dashboard.
- Cadastrar, consultar, editar e inativar pessoas acompanhadas.
- Cadastrar e gerenciar responsáveis.
- Cadastrar e gerenciar colaboradores.
- Conceder acesso ao sistema a um colaborador por meio de convite enviado por e-mail.
- Gerenciar discipulados ativos e encerrados.
- Transferir um discipulado para outro responsável.
- Consultar visitas e históricos dos acompanhamentos.

### Responsável

- Acessar o Dashboard com informações dos próprios acompanhamentos.
- Cadastrar pessoas acompanhadas e iniciar o acompanhamento.
- Consultar os próprios discipulados.
- Registrar visitas dos discipulados sob sua responsabilidade.
- Consultar o histórico das visitas realizadas.

### Acesso por convite

O administrador pode conceder acesso a um colaborador durante o cadastro ou posteriormente, pela edição do registro. O sistema envia um convite por e-mail; a pessoa convidada abre o link e define a própria senha.

O acesso criado é vinculado ao cadastro existente do colaborador, utilizando o campo `profile_id`, evitando a criação de um segundo cadastro da mesma pessoa.

### Interface

- Tema claro e tema escuro.
- Interface organizada por módulos.
- Filtros e pesquisa nas listagens.
- Layout adaptável a diferentes tamanhos de tela.

## Tecnologias utilizadas

| Tecnologia | Utilização |
|---|---|
| React | Construção da interface e dos componentes |
| Vite | Ambiente de desenvolvimento e compilação |
| JavaScript | Lógica e funcionalidades da aplicação |
| HTML5 e CSS3 | Estrutura e estilização da interface |
| Supabase | Serviços de backend e persistência de dados |
| PostgreSQL | Banco de dados relacional |
| Supabase Auth | Autenticação e gerenciamento de usuários |
| Supabase Edge Functions | Operações administrativas executadas no backend |
| Git e GitHub | Controle de versão e hospedagem do código-fonte |
| Vercel | Hospedagem e publicação da aplicação |

## Arquitetura

O frontend foi desenvolvido em React com Vite. A aplicação utiliza o Supabase para autenticação, acesso ao banco PostgreSQL e execução de operações administrativas por Edge Functions.

Fluxo simplificado:

```text
Usuário
   |
   v
React + Vite (Frontend)
   |
   +---- Supabase Auth (autenticação)
   |
   +---- Supabase / PostgreSQL (dados e regras de acesso)
   |
   +---- Supabase Edge Functions (operações administrativas)
   |
   v
Resposta exibida na aplicação
```

A aplicação publicada é hospedada na Vercel e integrada ao repositório GitHub.

## Banco de dados

O banco de dados utiliza PostgreSQL, disponibilizado pelo Supabase. As principais tabelas são:

| Tabela | Finalidade |
|---|---|
| `profiles` | Dados complementares dos usuários autenticados e seus perfis de acesso (`admin` ou `responsavel`) |
| `pessoas_acompanhadas` | Cadastro das pessoas que recebem acompanhamento |
| `colaboradores` | Cadastro dos membros e colaboradores da igreja; pode ser vinculado a um usuário por meio de `profile_id` |
| `discipulados` | Registro dos períodos de acompanhamento, responsáveis, datas e status |
| `visitas` | Registro das visitas vinculadas a um discipulado específico |

### Relacionamentos e histórico

- Cada registro em `profiles` corresponde a um usuário do Supabase Auth.
- Um responsável pode possuir vários discipulados.
- Uma pessoa acompanhada pode possuir vários registros históricos de discipulado.
- Um discipulado pode possuir várias visitas.
- Um colaborador pode ser vinculado a um perfil de acesso por meio de `colaboradores.profile_id`.

A estrutura permite manter o histórico de acompanhamentos. Quando um discipulado é transferido, o registro anterior é encerrado e um novo é criado para o responsável escolhido. As visitas anteriores permanecem vinculadas ao discipulado original.

## Segurança e controle de acesso

O sistema utiliza **Row Level Security (RLS)** no Supabase para aplicar regras de acesso aos dados.

- O perfil `admin` possui permissões administrativas para gerenciar os registros e realizar transferências.
- O perfil `responsavel` acessa os próprios acompanhamentos e as visitas correspondentes, conforme as políticas do banco.
- A função `is_admin()` auxilia na identificação do perfil administrativo nas políticas de segurança.
- A Edge Function `criar-responsavel` valida a sessão e verifica se o solicitante é administrador antes de executar operações administrativas.
- A chave `service_role` é utilizada exclusivamente no backend e não deve ser incluída no frontend.

## Executar o projeto localmente

### Pré-requisitos

- Node.js e npm.
- Git.
- Editor de código, como Visual Studio Code.
- Projeto Supabase configurado.

### 1. Clonar o repositório

```bash
git clone https://github.com/icarofecaf/sistema-discipulados.git
```

### 2. Acessar a pasta do projeto

```bash
cd sistema-discipulados
```

### 3. Instalar as dependências

```bash
npm install
```

No Windows PowerShell, caso a política de execução impeça o uso de `npm`, utilize `npm.cmd`:

```powershell
npm.cmd install
```

### 4. Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as credenciais públicas do projeto Supabase:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

Substitua os valores de exemplo pelos dados do seu projeto Supabase. Não publique o arquivo `.env` no GitHub. Nunca coloque a chave `service_role` em variáveis utilizadas pelo frontend.

### 5. Iniciar o ambiente de desenvolvimento

```bash
npm run dev
```

No Windows PowerShell:

```powershell
npm.cmd run dev
```

O Vite exibirá no terminal o endereço local para abrir a aplicação no navegador, normalmente `http://localhost:5173/`. A porta pode mudar caso já esteja em uso.

### 6. Gerar a compilação de produção

```bash
npm run build
```

No Windows PowerShell:

```powershell
npm.cmd run build
```

Os arquivos compilados são gerados na pasta `dist/`.

## Publicação

O projeto está hospedado na Vercel e conectado ao repositório GitHub. O processo de publicação utiliza a branch principal `main`.

Configurações principais de build:

| Configuração | Valor |
|---|---|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

As variáveis de ambiente necessárias ao frontend também devem estar configuradas nas configurações do projeto na Vercel.

## Observações de configuração

- A autenticação e os e-mails de convite são gerenciados pelo Supabase Auth.
- O envio de e-mails utiliza SMTP personalizado configurado no painel do Supabase. As credenciais SMTP não devem ser armazenadas no repositório.
- O endereço de retorno dos convites deve estar permitido em **Authentication → URL Configuration → Redirect URLs** no Supabase.
- A Edge Function `criar-responsavel` deve estar publicada no projeto Supabase para disponibilizar o cadastro tradicional de responsáveis e o convite de colaboradores.

## Regras de negócio importantes

1. O sistema possui dois perfis: `admin` e `responsavel`.
2. Somente administradores podem realizar operações administrativas e transferir discipulados.
3. Responsáveis podem cadastrar pessoas acompanhadas e registrar visitas dos próprios discipulados ativos.
4. Uma pessoa não pode possuir dois discipulados ativos simultaneamente.
5. A transferência encerra o discipulado anterior e cria um novo para o responsável selecionado.
6. As visitas anteriores permanecem associadas ao discipulado em que foram registradas.
7. Encerrar um discipulado não exclui o cadastro da pessoa acompanhada.
8. O acesso de um colaborador é associado ao cadastro existente por `profile_id`.

## Testes realizados

Durante o desenvolvimento, foram realizados testes funcionais, incluindo:

- Login com os perfis de administrador e responsável.
- Restrições de acesso por perfil.
- Cadastro de pessoas acompanhadas.
- Criação e consulta de discipulados.
- Registro e consulta de visitas.
- Transferência de discipulado e preservação do histórico.
- Cadastro e gerenciamento de colaboradores.
- Envio de convite por e-mail para colaborador existente.
- Definição de senha pelo link do convite e login como responsável.
- Login com a conta institucional configurada como administradora.
- Alternância entre tema claro e escuro.
- Compilação de produção com Vite.

**Observação sobre e-mails:** o fluxo de convite foi validado. No teste realizado com o Gmail configurado como SMTP, a primeira mensagem foi direcionada à pasta Spam. Em um ambiente de produção, a entregabilidade deve ser acompanhada e o serviço SMTP escolhido deve ser adequado ao volume e ao uso pretendidos.

---

**Projeto acadêmico — Sistema de Acompanhamento de Discipulados**  
Repositório: [icarofecaf/sistema-discipulados](https://github.com/icarofecaf/sistema-discipulados)  
Aplicação: [sistema-discipulados.vercel.app](https://sistema-discipulados.vercel.app/)
