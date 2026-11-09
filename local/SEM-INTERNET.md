# Votação no acampamento SEM INTERNET

No Valle da Fonte não tem internet, então a votação roda numa **rede local**:

```
 Celulares  ──Wi-Fi──>  ROTEADOR  ──cabo──>  NOTEBOOK (servidor)  ──HDMI──>  Projetor (telão)
```

- O **notebook** guarda os votos e mostra o site (programa `local/servidor.js`).
- O **roteador** só cria o Wi-Fi. Não precisa de internet nele.
- Quem estiver no Wi-Fi abre **http://derepente30.com** (ou aponta a câmera para o QR do telão).
  Esse endereço só existe dentro dessa rede.

> Não use o "Hotspot Móvel" do Windows: ele aceita no máximo **8 celulares**.

---

## O que levar

- [ ] Notebook com **Node.js** instalado (o mesmo que roda o projetor, ou outro)
- [ ] **Roteador Wi-Fi** (qualquer roteador de casa serve; para mais de ~60 pessoas votando juntas, prefira um bom roteador dual-band ou dois aparelhos)
- [ ] Cabo de rede (notebook ↔ roteador) e extensão/tomadas
- [ ] Carregador do notebook (desative a suspensão)
- [ ] Cabo HDMI para o projetor

---

## 1. Em casa, COM internet (uma vez, antes de viajar)

1. Instale o Node.js (versão LTS): <https://nodejs.org>
2. Baixe o site: <https://github.com/pedrolimv/derepente30/archive/refs/heads/main.zip>
   e extraia, por exemplo, em `Área de Trabalho\derepente30`.
3. Configure o roteador (painel em `192.168.0.1` ou `192.168.1.1`, veja a etiqueta do aparelho):
   1. **Wi-Fi:** nome `DE REPENTE 30`. Pode deixar sem senha ou com uma senha simples para mostrar no telão.
   2. Ligue o notebook no roteador (cabo é melhor) e **reserve um IP fixo** para ele
      (menu *DHCP → Reserva de endereço*, ex.: `192.168.0.10`).
   3. Em *DHCP / LAN*, coloque o **DNS primário = IP do notebook** (ex.: `192.168.0.10`) e deixe o secundário vazio.
      É isso que faz o `derepente30.com` funcionar.
   4. Desative **"Isolamento de AP / isolamento de clientes"** se existir.
4. No notebook (Windows):
   - Configurações → Rede → a rede do roteador → **Perfil: Privada**.
   - Energia → **nunca suspender** quando ligado na tomada.
5. **Teste completo em casa**, com o roteador desligado da internet:
   - Dê dois cliques em `local\INICIAR.bat`.
   - Crie a senha da organização quando ele pedir (ela vale até fechar a janela).
   - Se o Windows perguntar sobre o Firewall, marque **Redes privadas** e clique em **Permitir**.
   - Confira se o **IP mostrado** é o mesmo que você reservou no roteador.
   - Num celular conectado ao Wi-Fi, abra `http://derepente30.com`. Deve abrir o site.

---

## 2. No dia, no acampamento

1. Ligue o roteador e o notebook (cabo entre eles). Abra `local\INICIAR.bat` e crie a senha.
2. No notebook, abra o navegador em:
   - **Admin:** `http://localhost/admin.html` → entre com a senha → crie/abra a votação.
   - **Telão:** `http://localhost/telao.html` (outra janela, no projetor) → aperte **F11**.
     Para ver a contagem ao vivo no telão, entre no admin nesse mesmo navegador.
3. O público conecta no Wi-Fi **DE REPENTE 30** e aponta a câmera para o QR do telão. Pronto!
   - As reações (👏 😂 🔥 ❤️ 🎉) também funcionam sem internet.
4. Encerre, confira e **Publique o resultado** pelo admin, como no site online.

Os votos ficam salvos em `local\dados\votacao.json`. Se o notebook desligar, é só abrir o
`INICIAR.bat` de novo: nada se perde.

---

## Se algo der errado

| Problema | Solução |
|---|---|
| `derepente30.com` não abre no celular | O roteador não está usando o notebook como DNS. Use o QR do telão com o IP: em `local\config.json` mude `"qrUsaIp": true` e reinicie o `INICIAR.bat`. Ou digite `http://` + o IP mostrado na janela. |
| "Não consegui abrir a porta 80" | Outro programa usa a porta (ex.: Skype, IIS). Feche-o ou troque `"portaHttp": 8080` no `config.json` (aí o endereço vira `http://derepente30.com:8080`). |
| "DNS desligado (EADDRINUSE)" | O Hotspot Móvel / Compartilhamento de Internet do Windows está ligado. Desligue-o. |
| Celular diz "sem internet" e troca de rede | Normalmente não acontece (o servidor responde aos testes de conexão). Se acontecer, peça para tocar em "Manter conectado" ou desligar os dados móveis. |
| IP errado na janela (vários adaptadores) | Coloque o IP certo em `"ip": "192.168.0.10"` no `config.json`. |
| Um celular "já votou" sem ter votado | Por segurança é 1 voto por aparelho na rede. Se precisar, mude `"umVotoPorIp": false`. |

## Bom saber

- Sem internet, **não carregam**: vídeo do YouTube, fotos do Instagram, mapa e links da loja.
  O resto do site (programação, mala, épocas, contatos) funciona normalmente.
- Para trocar o endereço, edite `"dominio"` em `local\config.json` (ex.: `"abs30.com"`).
  Prefira `.com`/`.net`; evite `.app` e `.dev`, que exigem HTTPS.
- O site online (GitHub + Firebase) continua funcionando separadamente, para antes do acampamento.
