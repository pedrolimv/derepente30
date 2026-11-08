# Como colocar o site no ar (de graça)

O site tem 4 páginas:

| Página | Para quem | O que faz |
|---|---|---|
| `index.html` | Todo mundo | Site do acampamento (programação, mala, ônibus…) |
| `votar.html` | Público, no celular | Votação ao vivo (1 voto por celular) + reações 👏 😂 🔥 ❤️ 🎉 |
| `admin.html` | Organização | Criar votações, abrir, encerrar, apurar e publicar |
| `telao.html` | Projetor | QR code, contagem ao vivo, reações voando e revelação do 3º ao 1º lugar 🎉 |

Tudo grátis:
- **GitHub Pages** hospeda o site.
- **Firebase** (plano gratuito "Spark", não pede cartão) guarda os votos e faz o login da organização.

> Antes de configurar o Firebase, a votação roda em **modo demonstração** (faixa amarela no topo):
> os votos ficam só no seu navegador. Serve para testar; no dia precisa estar com o Firebase.

---

## Parte 1 — Firebase (votação) · ~15 min

1. Entre em <https://console.firebase.google.com> com uma conta Google da igreja → **Criar projeto** (ex.: `acampamento-abssv`). Pode desligar o Google Analytics.
2. Na tela do projeto, clique no ícone **`</>` (Web)** → dê um nome → **Registrar app**.
   Ele mostra um bloco `firebaseConfig = { apiKey: "...", ... }`.
   Copie esses valores para o arquivo **`js/config.js`** (substituindo `COLE_AQUI` e os campos vazios).
   *Essas chaves podem ficar públicas — quem protege os dados são as regras do passo 5.*
3. Menu **Criação → Authentication → Vamos começar** → aba **Método de login**, ative:
   - **Anônimo** (é o que garante 1 voto por celular, sem pedir cadastro)
   - **E-mail/senha** (login da organização)
4. Ainda em Authentication → aba **Usuários → Adicionar usuário**: crie o e-mail e senha de quem vai administrar.
   Copie o **UID** que aparece na lista (um código longo).
5. Menu **Criação → Firestore Database → Criar banco de dados** → local **`southamerica-east1 (São Paulo)`** → **modo de produção**.
   Abra a aba **Regras**, apague tudo, cole o conteúdo do arquivo **`firestore.rules`** e clique **Publicar**.
6. Ainda no Firestore, aba **Dados → Iniciar coleção**:
   - ID da coleção: `admins`
   - ID do documento: **o UID do passo 4**
   - Um campo qualquer, ex.: `email` (string) = o e-mail do admin
   Repita para cada pessoa da organização (cada uma com seu usuário e UID).
   *Dica:* se você esquecer este passo, ao entrar em `admin.html` a própria página mostra o UID para copiar.
7. Authentication → **Configurações → Domínios autorizados → Adicionar domínio**:
   adicione `SEU-USUARIO.github.io` e, se tiver, o domínio próprio (ex.: `acampamento.suaigreja.com.br`).

---

## Parte 2 — GitHub Pages (hospedagem) · ~10 min

1. Crie uma conta em <https://github.com> (de preferência um e-mail da igreja).
   **Dica de endereço bonito e grátis:** crie uma *organização* (botão **+ → New organization**, plano Free) com um nome como `abssv` — o site fica em `https://abssv.github.io`.
2. **+ → New repository**
   - Nome: `abssv.github.io` (exatamente o nome da organização/usuário + `.github.io`) para o site ficar na raiz; ou qualquer nome, ex. `acampamento`, e ele fica em `https://abssv.github.io/acampamento`.
   - Público → **Create repository**.
3. Na página do repositório: **Add file → Upload files** → arraste **todo o conteúdo da pasta `site`** (os arquivos `index.html`, `votar.html`… e as pastas `css`, `js`, `img`) → **Commit changes**.
   *Arraste o conteúdo, não a pasta `site` em si.*
4. **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **`main`** / **`/ (root)`** → **Save**.
   Em 1–2 minutos aparece: *"Your site is live at https://…"*.

Para atualizar depois: é só subir de novo os arquivos alterados (Add file → Upload files).

---

## Parte 3 — Endereço personalizado da igreja

### Se a igreja já tem um domínio (ex.: `suaigreja.com.br`) — custo R$ 0
1. No painel onde o domínio é gerenciado (Registro.br, Cloudflare, Hostgator…), crie um registro DNS:
   - Tipo **CNAME** · Nome **`acampamento`** · Valor **`SEU-USUARIO.github.io`**
2. No GitHub: **Settings → Pages → Custom domain** → `acampamento.suaigreja.com.br` → **Save**.
3. Espere o DNS propagar (de minutos até algumas horas) e marque **Enforce HTTPS**.
4. Lembre de adicionar esse domínio no Firebase (Parte 1, passo 7).

### Se a igreja não tem domínio
- **Grátis:** use o `https://abssv.github.io` (passo 1 da Parte 2) — curto e com a cara da igreja.
- **Domínio próprio `.com.br`:** registro em <https://registro.br> por cerca de R$ 40/ano (é a única parte que não é gratuita). Depois siga o passo acima.

---

## No dia do De Repente 30 Celebration

**Na véspera (teste de verdade):**
- Abra `admin.html`, crie uma votação "Teste", abra, vote de 2–3 celulares, encerre, publique e depois **exclua**.
- Confira a internet no Valle da Fonte: o público precisa de 4G ou Wi-Fi para votar. Se o sinal for fraco, divulgue a senha do Wi-Fi no telão.

**No show:**
1. `admin.html` → crie a votação **"Apresentação campeã"** com o nome de cada apresentação (dá pra fazer antes e deixar como rascunho).
2. No notebook do projetor abra `telao.html`, entre com o login da organização (para ver a contagem ao vivo) e aperte **F11**. Ele segue sozinho a votação que estiver aberta.
3. Na hora: **▶ Abrir votação** → o QR code aparece no telão.
4. Quer suspense? Deixe **"Parcial no telão" desligado** — o telão mostra só o total de votos.
5. **■ Encerrar votação** → o telão mostra "Apurando…" 🥁 → confira o resultado no admin.
6. **🏆 Publicar resultado** → o telão revela do último lugar até a campeã (com confete), e todos os celulares mostram o resultado.
7. Durante todo o show o público pode tocar nas reações (👏 😂 🔥 ❤️ 🎉) — elas sobem no telão. Antes do evento, use **"Limpar reações antigas"** no admin para apagar as do teste.

**Bom saber:**
- 1 voto por celular/navegador. Alguém muito determinado poderia votar de novo numa aba anônima ou outro navegador — para uma brincadeira entre irmãos é suficiente.
- Limites gratuitos do Firebase: 50 mil leituras e 20 mil gravações por dia — sobra para centenas de pessoas votando.
- "Zerar votos" apaga os votos e volta a votação para rascunho (útil depois do teste).
