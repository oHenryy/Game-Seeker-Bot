
# Game Seeker Bot 🎮

**Game Seeker Bot** é um bot do Discord que rastreia a atividade de jogo dos usuários em tempo real. Ele pode ser configurado para monitorar quando um usuário inicia ou para de jogar um jogo específico, notificando um canal designado. O bot também mantém um histórico de atividades para cada usuário rastreado, com suporte a paginação e rastreamento silencioso.

## Funcionalidades ✨

- Rastreia quando um usuário começa e para de jogar.
- Envia notificações para um canal específico quando o status do jogo muda.
- Suporte a rastreamento "silencioso" — sem notificações públicas.
- Armazena o histórico de atividades de cada usuário rastreado.
- Comandos personalizáveis para definir mensagens de notificação.
- Persistência de dados usando um arquivo JSON para manter o estado após reinicialização do bot.
- Histórico paginado para fácil visualização.

## Comandos 🔧

### Rastreamento:

- `/track @usuário [silencioso]` — Adiciona ou remove um usuário da lista de rastreamento. Use a opção `silencioso` para que o rastreamento não envie notificações ao canal.
  
- `/silent @usuário` — Alterna o estado silencioso de um usuário já rastreado.

### Notificações:

- `/setchannel` — Define o canal de notificações onde as mensagens serão enviadas.
  
- `/setmessage <mensagem>` — Personaliza a mensagem de notificação para quando o usuário começar a jogar. Use `{username}` para o nome do usuário e `{game}` para o nome do jogo.

- `/setstoppedmessage <mensagem>` — Personaliza a mensagem de notificação para quando o usuário parar de jogar. Use `{username}` para o nome do usuário e `{game}` para o nome do jogo.

### Histórico:

- `/history @usuário` — Mostra o histórico de atividades do usuário rastreado, com suporte a paginação.

### Ajuda:

- `/help` — Exibe a lista de comandos e suas descrições.

## Instalação e Configuração ⚙️

### Pré-requisitos

- **Node.js** versão 16 ou superior.
- Uma conta no Discord com acesso para criar um bot.
- Um servidor no Discord onde você tenha permissões de administrador.

### Passo a passo

1. Clone o repositório para o seu ambiente local:

   ```bash
   git clone https://github.com/oHenryy/game-seeker-bot.git
   cd game-seeker-bot
   ```

2. Instale as dependências necessárias:

   ```bash
   npm install
   ```

3. Crie um arquivo `.env` no diretório raiz do projeto e adicione as seguintes variáveis de ambiente:

   ```bash
   DISCORD_TOKEN=seu-token-do-bot
   DISCORD_CLIENT_ID=seu-client-id-do-bot
   ```

   Substitua `seu-token-do-bot` pelo token do seu bot do Discord e `seu-client-id-do-bot` pelo ID da aplicação do bot.

4. Execute o TypeScript para compilar o código:

   ```bash
   tsc
   ```

5. Inicie o bot:

   ```bash
   npm src/index.js
   ```

   O bot agora estará ativo e pronto para ser adicionado ao seu servidor!

## Como Usar 📚

1. Use `/track` para começar a rastrear um usuário.
2. Use `/setchannel` para definir o canal onde as notificações serão enviadas.
3. Personalize as mensagens com `/setmessage` e `/setstoppedmessage`.
4. Veja o histórico de atividades de um usuário com `/history`.

## Estrutura do Projeto 📂

```bash
.
├── data.json                # Arquivo de persistência de dados
├── src
│   └── index.ts             # Arquivo principal com lógica do bot
├── .env                     # Variáveis de ambiente
├── README.md                # Este arquivo
├── package.json             # Configurações do projeto Node.js
└── tsconfig.json            # Configurações do TypeScript
```

## Contribuição 🤝

Sinta-se à vontade para contribuir com o projeto! Aqui estão algumas maneiras de ajudar:

1. Reporte problemas ou sugestões através das Issues.
2. Crie um fork e envie um pull request para novos recursos ou correções.
3. Compartilhe o bot com sua comunidade!

## Licença 📝

Este projeto está licenciado sob a licença Apache License 2.0. Consulte o arquivo `LICENSE` para mais detalhes.
