# Subir o DRG-BR para o GitHub

O repositório Git já foi inicializado e o primeiro commit foi feito. Siga os passos abaixo para publicar no GitHub.

---

## 1. Criar o repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login.
2. Clique em **"+"** (canto superior direito) → **"New repository"**.
3. Preencha:
   - **Repository name**: por exemplo `DRG-BR`
   - **Description** (opcional): "Plataforma DRG-BR - predição e gestão"
   - **Public** ou **Private**, como preferir
   - **Não** marque "Add a README" (o projeto já tem um)
4. Clique em **"Create repository"**.

---

## 2. Conectar e enviar o código

No terminal, na pasta do projeto (`DRG-BR`), rode (troque `SEU_USUARIO` pelo seu usuário do GitHub):

```bash
cd /Users/thiagobissoli/PycharmProjects/DRG-BR

# Adicionar o repositório remoto (use a URL que o GitHub mostrar)
git remote add origin https://github.com/SEU_USUARIO/DRG-BR.git

# Enviar o branch main
git push -u origin main
```

Se o GitHub mostrar a URL com **SSH** (ex.: `git@github.com:SEU_USUARIO/DRG-BR.git`), use:

```bash
git remote add origin git@github.com:SEU_USUARIO/DRG-BR.git
git push -u origin main
```

---

## 3. Se pedir usuário/senha

- **HTTPS**: o GitHub não aceita mais senha comum; use um **Personal Access Token** (Settings → Developer settings → Personal access tokens) como senha.
- **SSH**: configure uma chave SSH no GitHub (Settings → SSH and GPG keys) e use a URL `git@github.com:...`.

---

## 4. Depois do primeiro push

- O código estará em `https://github.com/SEU_USUARIO/DRG-BR`.
- Para atualizar no futuro: `git add .` → `git commit -m "mensagem"` → `git push`.
