# Correções de Integração CoreUI + Backend Flask

## Problemas Identificados e Resolvidos

### 1. ❌ Script npm "dev" não encontrado
**Problema:** O `start.sh` tentava executar `npm run dev`, mas CoreUI usa `npm start`

**Solução:** Adicionado alias `"dev"` ao `package.json` do frontend
```json
"scripts": {
  "build": "vite build",
  "lint": "eslint",
  "serve": "vite preview",
  "start": "vite",
  "dev": "vite"    // ← Adicionado
}
```

### 2. ❌ Endpoints de Autenticação com URL incorreta
**Problema:** Frontend chamava `POST /api/v1/auth/login`, mas o backend registra em `POST /api/auth/login`

**Correção realizada:** `src/context/AuthContext.js`
```javascript
// Antes
await axios.post('/api/v1/auth/login', { email, password })

// Depois
await axios.post('/api/auth/login', { email, password })
```

**Registro de blueprints no backend (`app/__init__.py`):**
```python
app.register_blueprint(auth_bp, url_prefix="/api/auth")      # ← /api/auth
app.register_blueprint(users_bp, url_prefix="/api/users")    # ← /api/users
app.register_blueprint(api_keys_bp, url_prefix="/api/keys")  # ← /api/keys
```

### 3. ❌ URLs de Usuários incorretas
**Problema:** Frontend chamava `/api/v1/users`

**Correção:** `src/views/pages/users/Users.js`
```javascript
// Antes
const response = await axios.get('/api/v1/users')

// Depois
const response = await axios.get('/api/users')
```

**Parse da resposta corrigido:**
- O endpoint retorna um **array direto**, não um objeto com campo `users`
- Adicionado parsing robusto: `Array.isArray(response.data) ? response.data : ...`

### 4. ❌ URLs de Chaves API incorretas
**Problema:** Frontend chamava `/api/v1/api-keys`

**Correção:** `src/views/pages/api-keys/ApiKeys.js`
```javascript
// Antes
await axios.post('/api/v1/api-keys', { ... })

// Depois
await axios.post('/api/keys', { ... })
```

### 5. ❌ Endpoint de Chaves API não retornava dados necessários
**Problema:** Ao criar/listar chaves, o response não incluía `limit_value` e `usage_count`

**Solução:** Melhorado o endpoint `GET /api/keys` no backend

`app/blueprints/api_keys/__init__.py`:
```python
# Antes
return jsonify([{
    "id": k.id, "name": k.name, 
    "created_at": ..., "last_used_at": ...
}])

# Depois
return jsonify([{
    "id": k.id, "name": k.name, "key": k.key_hash[:20],
    "limit_value": quota.limit_value if quota else 0,
    "usage_count": usage_count,
    "created_at": ..., "last_used_at": ...
}])
```

**POST response corrigido:**
```python
# Antes
return jsonify({"api_key": plain, "name": name, ...})

# Depois
return jsonify({
    "api_key": {
        "id": key_obj.id,
        "key": plain,
        "name": name,
        "limit_value": limit_value,
        "usage_count": 0
    }
})
```

## Endpoints Funcionais Testados ✅

| Método | Endpoint | Status | Response |
|--------|----------|--------|----------|
| POST | `/api/auth/login` | ✅ 200 | `{access_token, user}` |
| GET | `/api/users` | ✅ 200 | `[{id, email, name, ...}]` |
| GET | `/api/keys` | ✅ 200 | `[{id, name, key, limit_value, usage_count}]` |
| POST | `/api/keys` | ✅ 201 | `{api_key: {...}}` |
| DELETE | `/api/keys/{id}` | ✅ 204 | Empty |

## Como Testar

### Teste via cURL
```bash
# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@drgbr.local","password":"admin123"}'

# Copie o access_token retornado e use em:

# Listar usuários
curl http://localhost:5001/api/users \
  -H "Authorization: Bearer <token>"

# Listar chaves API
curl http://localhost:5001/api/keys \
  -H "Authorization: Bearer <token>"
```

### Teste via Frontend
1. Acesse http://localhost:3000
2. Faça login com `admin@drgbr.local` / `admin123`
3. Navegue para:
   - **Usuários**: Veja lista de usuários
   - **Chaves API**: Crie, liste e delete chaves

## Arquivos Modificados

### Backend
- ✅ `app/blueprints/api_keys/__init__.py` - Endpoints melhorados

### Frontend
- ✅ `package.json` - Adicionado script "dev"
- ✅ `src/context/AuthContext.js` - URLs corrigidas
- ✅ `src/views/pages/users/Users.js` - URLs e parsing corrigidos
- ✅ `src/views/pages/api-keys/ApiKeys.js` - URLs e response handling corrigidos

## Status Final

✅ **Autenticação JWT** - Funcional
✅ **Listagem de Usuários** - Funcional
✅ **Gerenciamento de Chaves API** - Funcional
✅ **Integração Backend + Frontend** - Funcional
✅ **CORS habilitado** - Funcional

## Próximas Etapas

1. Implementar validações avançadas no frontend
2. Adicionar notificações (toasts) para feedback
3. Completar páginas de Extração e Treinamento
4. Testes unitários e E2E
5. Deployment/produção

---

**Data:** 11/03/2026
**Status:** ✅ Pronto para desenvolvimento
