# Integração CoreUI - DRG-BR

## Resumo da Mudança

O frontend do projeto DRG-BR foi completamente substituído pelo **CoreUI Free React Admin Template v5.5.0**. Este é um template profissional e responsivo com componentes React otimizados para painéis administrativos.

## O Que Foi Feito

### 1. **Clonagem e Integração do CoreUI**
- Clone do repositório oficial: `coreui/coreui-free-react-admin-template`
- Backup do frontend antigo em `frontend-old/`
- Novo frontend em `frontend/` com CoreUI

### 2. **Autenticação JWT Integrada**
- Criado novo arquivo de contexto: `src/context/AuthContext.js`
- Implementa login com JWT e persistência de token
- Gerencia estado de autenticação global
- Suporta logout automático

### 3. **Páginas DRG-BR Customizadas**

#### Dashboard
- Reutiliza o dashboard original do CoreUI (em `src/views/dashboard/Dashboard.js`)

#### Usuários (`src/views/pages/users/Users.js`)
- Listagem de usuários da API
- Ações de editar/deletar (framework pronto)
- Tabela responsiva com CoreUI

#### Chaves API (`src/views/pages/api-keys/ApiKeys.js`)
- Listagem de chaves API
- Criação de novas chaves com suporte a quota (0 = ilimitado)
- Cópia de chaves para clipboard
- Exclusão de chaves
- Monitoramento de uso

#### Extração (`src/views/pages/extraction/Extraction.js`)
- Página placeholder para extração de dados
- Pronta para implementação

#### Treinamento (`src/views/pages/training/Training.js`)
- Página placeholder para treinamento de modelos
- Pronta para implementação

#### Configurações (`src/views/pages/settings/Settings.js`)
- Abas para Perfil e Aparência
- Interface profissional para configurações do usuário

### 4. **Login Customizado**
- Arquivo modificado: `src/views/pages/login/Login.js`
- Integração com AuthContext
- Exibição do logo DRG-BR (Marca.png)
- Credenciais padrão: `admin@drgbr.local / admin123`
- Feedback de erro melhorado

### 5. **Navegação Customizada**
- Arquivo: `src/_nav.js`
- Menu lateral com itens específicos do DRG-BR:
  - Dashboard
  - Usuários
  - Chaves API
  - Extração
  - Treinamento
  - Configurações

### 6. **Header com Logout**
- Arquivo modificado: `src/components/header/AppHeaderDropdown.js`
- Menu do usuário no canto superior direito
- Opção de logout que limpa token e redireciona para login
- Exibe email do usuário logado

### 7. **Rotas Protegidas**
- Arquivo modificado: `src/App.js`
- Componente `PrivateRoute` que protege todas as rotas
- Redirecionamento automático para login se não autenticado
- Loading spinner durante verificação de token

### 8. **Configuração Vite**
- Arquivo: `vite.config.mjs`
- Proxy para `/api` e `/health` apontando para `http://localhost:5001`
- Permitir acesso ao backend Flask

### 9. **Dependências Adicionadas**
- `axios` para requisições HTTP

### 10. **Imagens do DRG-BR**
- Copiadas para `frontend/public/imagens/`:
  - `Marca.png` - Logo com brand
  - `Icone.png` - Ícone
  - `Logo.png` - Logo completo
- Referenciadas em componentes (ex: página de login)

## Estrutura de Arquivos

```
frontend/
├── src/
│   ├── App.js                         # App com AuthProvider
│   ├── _nav.js                        # Navegação customizada
│   ├── routes.js                      # Rotas DRG-BR
│   ├── context/
│   │   └── AuthContext.js             # Contexto de autenticação
│   ├── components/
│   │   ├── header/
│   │   │   └── AppHeaderDropdown.js   # Dropdown com logout
│   │   └── ... (componentes CoreUI)
│   ├── views/
│   │   ├── dashboard/
│   │   │   └── Dashboard.js           # Dashboard original CoreUI
│   │   ├── pages/
│   │   │   ├── login/
│   │   │   │   └── Login.js           # Login customizado
│   │   │   ├── users/
│   │   │   │   └── Users.js           # Página de usuários
│   │   │   ├── api-keys/
│   │   │   │   └── ApiKeys.js         # Página de chaves API
│   │   │   ├── extraction/
│   │   │   │   └── Extraction.js      # Página de extração
│   │   │   ├── training/
│   │   │   │   └── Training.js        # Página de treinamento
│   │   │   └── settings/
│   │   │       └── Settings.js        # Página de configurações
│   │   └── ... (componentes CoreUI)
│   └── scss/
│       └── style.scss                 # Estilos CoreUI
├── public/
│   ├── imagens/
│   │   ├── Marca.png
│   │   ├── Icone.png
│   │   └── Logo.png
│   └── ... (assets CoreUI)
├── package.json                        # Dependências (Node 20+)
├── vite.config.mjs                     # Configuração Vite com proxy
└── .env.local                          # Variáveis de ambiente

```

## Como Executar

### Opção 1: Usando o script
```bash
./start.sh
```

### Opção 2: Manualmente
```bash
# Terminal 1 - Backend
export PORT=5001
python run.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Acesso
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5001
- **Credenciais padrão**: 
  - Email: `admin@drgbr.local`
  - Senha: `admin123`

## Funcionalidades Implementadas

✅ **Autenticação JWT** - Login/logout com token persistente
✅ **Rotas Protegidas** - Redirecionamento automático para login
✅ **Menu Lateral** - Navegação customizada para DRG-BR
✅ **Header com Logout** - Opção de saída no menu do usuário
✅ **Páginas Customizadas** - Usuários, Chaves API, Extração, Treinamento, Configurações
✅ **Integração com API** - Proxy Vite para chamadas ao backend Flask
✅ **Branding DRG-BR** - Logos e imagens integradas
✅ **Tema Responsivo** - Interface adaptável para mobile/desktop

## Próximas Etapas (Sugestões)

1. **Completar Páginas de Extração e Treinamento** com funcionalidades reais
2. **Implementar Validações Avançadas** no formulário de criação de chaves
3. **Adicionar Notificações** (toasts) para ações de sucesso/erro
4. **Aprimorar Dashboard** com gráficos e métricas do DRG-BR
5. **Implementar Gestão de Perfis/Roles** na página de usuários
6. **Testes Unitários** para componentes críticos

## Notas Técnicas

- CoreUI usa **Bootstrap 5** como base de estilos
- Redux é utilizado para estado global (tema, sidebar toggle)
- Componentes são lazy-loaded com Suspense para performance
- Vite como bundler (mais rápido que Create React App)
- Hash Router para navegação SPA

## Contato & Suporte

Para dúvidas ou problemas, consulte:
- [Documentação CoreUI React](https://coreui.io/react/docs/)
- [API DRG-BR](http://localhost:5001) - Consulte o `/health` ou `/api/v1` endpoints
