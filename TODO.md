# TODO - SupaDupa-Coding

> **Sistema Multi-Agente de Código Autônomo**  
> **Última Atualização:** 2026-01-23  
> **Status:** 🟡 Em Desenvolvimento (Core ~75% completo)

---

## 📋 Visão Geral do Projeto

SupaDupa-Coding é um sistema de agentes de código similar ao Claude Code, Codex, Qwen-Code, etc., mas com um diferencial: um fluxo de **Brain Agent** (agente cérebro) que divide tarefas em menores, coordena small workers, QA agents, security agents, e gerencia todo o workflow de forma síncrona.

### Interface Desejada
1. **Terminal Colorido** - Entrada bonita com design moderno
2. **Autenticação** - Registro de APIs no terminal
3. **Brain Agent Conversacional** - Pode construir diretamente, planejar, ou ativar modo "Big Job"
4. **Modo Big Job** - Workflow completo sincronizado sem conflitos em branches/codebase

---

## 🎯 PRÉ-MVP (Essencial para Funcionamento)

### 1. Interface de Terminal (Alta Prioridade)
- [ ] **Design colorido do terminal** - chalk/ora styling melhorado
  - [ ] Tema de cores consistente
  - [ ] Animações de loading elegantes
  - [ ] Progress bars informativos
- [ ] **Autenticação no terminal**
  - [ ] Wizard de setup inicial
  - [ ] Registro de API keys (OpenAI, Anthropic, etc.)
  - [ ] Armazenamento seguro de credenciais
  - [ ] Validação de API keys
- [ ] **Comando de inicialização** - `supadupacode init`

### 2. Brain Agent Core (Alta Prioridade)
- [ ] **Modo Conversacional**
  - [ ] Chat interativo com o brain agent
  - [ ] Entendimento de contexto do projeto
  - [ ] Respostas com formatação rich
- [ ] **Construção Direta**
  - [ ] Execução imediata de tarefas simples
  - [ ] Modificações de código inline
- [ ] **Planejamento**
  - [ ] Decomposição de tarefas
  - [ ] Geração de planos executáveis
- [ ] **Modo Big Job** (Diferencial)
  - [ ] Ativação via comando especial
  - [ ] Workflow sincronizado completo
  - [ ] Coordenação de múltiplos agentes
  - [ ] Sem conflitos de branch/codebase

### 3. Mini-Brains System (Alta Prioridade)
- [ ] **Arquitetura de Mini-Brains**
  - [ ] Brain principal que cria mini-brains
  - [ ] Mini-brains para monitoramento de tarefas
  - [ ] Sistema de reporting ao brain principal
- [ ] **Comunicação Inter-Brain**
  - [ ] Protocolo de mensagens entre brains
  - [ ] Sincronização de estado
  - [ ] Agregação de resultados

### 4. Workflow Sincronizado (Alta Prioridade)
- [ ] **Gerenciamento de Branches**
  - [ ] Criação automática de branches por agente
  - [ ] Merge sem conflitos
  - [ ] Rollback automático em caso de falha
- [ ] **Sincronização de Codebase**
  - [ ] Lock de arquivos durante edição
  - [ ] Resolução automática de conflitos simples
  - [ ] Notificação de conflitos complexos
- [ ] **Tool Calls Agêntico**
  - [ ] Fluxo de chamadas de ferramentas
  - [ ] Retry automático com backoff
  - [ ] Fallback para agente alternativo

### 5. Agentes Especializados (Média Prioridade)
- [ ] **Developer Agent** - Melhorias
  - [ ] Implementação de código baseada em planos
  - [ ] Refactoring automático
  - [ ] Aplicação de padrões de projeto
- [ ] **QA Agent** - Melhorias
  - [ ] Execução de testes automatizada
  - [ ] Geração de testes
  - [ ] Relatório de cobertura
- [ ] **Docs Agent** - Melhorias
  - [ ] Atualização automática de documentação
  - [ ] Geração de JSDoc
  - [ ] Changelog automático
- [ ] **Security Agent** (Novo)
  - [ ] Análise de vulnerabilidades
  - [ ] Abertura de issues com sugestões de correção
  - [ ] Verificação de dependências
  - [ ] OWASP checks
- [ ] **PR Approval Agent** (Novo)
  - [ ] Revisão automática de PRs
  - [ ] Checklist de qualidade
  - [ ] Aprovação condicional

### 6. Memory System - Melhorias (Média Prioridade)
- [ ] **Cache otimizado**
  - [ ] Cache de soluções anteriores
  - [ ] Invalidação inteligente
- [ ] **Busca semântica**
  - [ ] Embeddings para busca por similaridade
  - [ ] Ranking de relevância
- [ ] **Compressão de memória**
  - [ ] Compactação de checkpoints antigos
  - [ ] Limpeza automática

### 7. Observabilidade Básica (Média Prioridade)
- [ ] **Dashboard de status**
  - [ ] Visualização do workflow em tempo real
  - [ ] Métricas de agentes
  - [ ] Logs estruturados
- [ ] **Eventos do sistema**
  - [ ] EventBus completo
  - [ ] Webhooks opcionais

---

## 🚀 PÓS-MVP (Melhorias e Extensões)

### 1. Interface Avançada
- [ ] **Web UI opcional**
  - [ ] Dashboard visual
  - [ ] Visualização de planos
  - [ ] Monitoramento de workflows
- [ ] **Temas de terminal**
  - [ ] Múltiplos temas de cores
  - [ ] Customização de prompts
- [ ] **Notificações**
  - [ ] Desktop notifications
  - [ ] Slack/Discord integrations

### 2. Brain Agent Avançado
- [ ] **Aprendizado contínuo**
  - [ ] Memória de decisões passadas
  - [ ] Melhoria baseada em feedback
- [ ] **Estratégias de planejamento**
  - [ ] Magentic pattern (planejamento magnético)
  - [ ] Blackboard pattern
  - [ ] Handoff pattern
- [ ] **Auto-otimização**
  - [ ] Ajuste de parâmetros baseado em métricas
  - [ ] Seleção automática de modelos

### 3. Agentes Adicionais
- [ ] **Architect Agent**
  - [ ] Revisão arquitetural
  - [ ] Sugestões de design
- [ ] **Performance Agent**
  - [ ] Análise de performance
  - [ ] Otimizações automáticas
- [ ] **Migration Agent**
  - [ ] Migrações de banco de dados
  - [ ] Atualizações de dependências
- [ ] **Reviewer Agent**
  - [ ] Code review detalhado
  - [ ] Sugestões de melhoria

### 4. Integrações Externas
- [ ] **GitHub Actions**
  - [ ] CI/CD automatizado
  - [ ] Triggers baseados em eventos
- [ ] **Jira/Linear**
  - [ ] Criação de issues automática
  - [ ] Sincronização de status
- [ ] **Slack/Discord**
  - [ ] Notificações de progresso
  - [ ] Comandos via chat

### 5. Multi-Repositório
- [ ] **Suporte multi-repo**
  - [ ] Monorepos
  - [ ] Dependências entre repos
- [ ] **Orquestração distribuída**
  - [ ] Workers em diferentes máquinas
  - [ ] Balanceamento de carga

### 6. Segurança Avançada
- [ ] **Auditoria completa**
  - [ ] Logs de todas as operações
  - [ ] Compliance checks
- [ ] **Sandboxing**
  - [ ] Execução isolada de código
  - [ ] Limites de recursos
- [ ] **Policy as Code**
  - [ ] Regras de segurança configuráveis
  - [ ] Enforcement automático

### 7. Analytics e Métricas
- [ ] **Dashboard de métricas**
  - [ ] Lead time por task
  - [ ] Taxa de sucesso
  - [ ] Custo por operação (tokens)
- [ ] **Relatórios**
  - [ ] Relatórios semanais
  - [ ] Tendências de qualidade
- [ ] **Otimização de custos**
  - [ ] Tracking de uso de API
  - [ ] Sugestões de economia

### 8. Extensibilidade
- [ ] **Plugin system**
  - [ ] API de plugins
  - [ ] Marketplace de plugins
- [ ] **Custom agents**
  - [ ] Framework para criar agentes
  - [ ] Templates de agentes
- [ ] **Hooks**
  - [ ] Pre/post hooks para operações
  - [ ] Customização de workflow

---

## 📊 Priorização por Fase

### Fase 1: Foundation (Semanas 1-2)
1. Interface de terminal melhorada
2. Autenticação e setup
3. Brain Agent modo conversacional

### Fase 2: Core Workflow (Semanas 3-4)
1. Modo Big Job básico
2. Sincronização de branches
3. Tool calls básico

### Fase 3: Multi-Agent (Semanas 5-6)
1. Mini-brains system
2. Security Agent
3. PR Approval Agent

### Fase 4: Polish (Semanas 7-8)
1. Observabilidade
2. Memory optimizations
3. Testes e documentação

---

## 🔧 TODOs Técnicos Existentes no Código

### Arquivos com TODOs Identificados

| Arquivo | TODO | Prioridade |
|---------|------|------------|
| `commands/review.ts` | PR review automation (GitHub API) | Alta |
| `commands/fix.ts` | Issue detection + auto-fix | Alta |
| `core/orchestrator.ts` | AI-based task decomposition | Alta |
| `base-agent.ts` | Resource tracking (memory/CPU) | Média |
| `checkpoint-manager.ts` | Memory compression | Média |
| `mcp/mcp-client.ts` | Fine-grained permission checking | Média |
| `developer-agent.ts` | File modification tracking | Média |
| `commands/config.ts` | Confirmation prompts for destructive ops | Baixa |

---

## 📝 Notas de Implementação

### Convenções a Seguir
- Prefixo `sd*` para todas as classes
- Interfaces em `shared/contracts/`
- Eventos com prefixo `SD_EVENT_*`
- TypeScript strict mode
- Async/await para todas operações assíncronas

### Pontos de Sincronização
- `shared/contracts/plan-schema.ts` - Contrato JSON de planos
- `shared/events/event-emitter.ts` - Sistema de eventos
- `cli/src/memory/index.ts` - Singleton de memória

### Arquivos Críticos
- `cli/src/agents/brain-agent.ts` - Agente principal
- `cli/src/core/orchestrator.ts` - Orquestrador de workflow
- `cli/src/workflow/workflow-runner.ts` - Executor de workflow

---

**Mantido por:** Equipe SupaDupa-Coding  
**Próxima Revisão:** Semanal
