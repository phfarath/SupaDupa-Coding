# Future Steps - SupaDupa-Coding

> **Roadmap Detalhado de Implementação**  
> **Versão:** 1.0  
> **Data:** 2026-01-23

---

## 🎯 Objetivo Final

Criar um **agente de código autônomo** similar ao Claude Code, Codex, Qwen-Code, mas com arquitetura diferenciada:

- **Brain Agent** como coordenador central
- **Mini-Brains** para monitoramento distribuído
- **Modo Big Job** para workflows complexos sincronizados
- **Múltiplos agentes especializados** (Developer, QA, Security, Docs, PR Reviewer)
- **Zero conflitos** em branches e codebase

---

## 📋 Roadmap por Milestone

### Milestone 1: Interface & Autenticação (MVP Foundation)

**Objetivo:** Terminal bonito e funcional com autenticação.

#### Step 1.1: Terminal Design System
```
Arquivos a criar/modificar:
├── cli/src/ui/
│   ├── theme.ts              # Definição de cores e estilos
│   ├── components/
│   │   ├── header.ts         # Header do terminal
│   │   ├── prompt.ts         # Input prompt customizado
│   │   ├── spinner.ts        # Spinners animados
│   │   └── table.ts          # Tabelas formatadas
│   └── index.ts              # Exportações
```

**Micro-Steps:**
1. [ ] Criar `theme.ts` com paleta de cores (primary, secondary, success, error, warning)
2. [ ] Implementar `header.ts` com logo ASCII e versão
3. [ ] Criar `prompt.ts` com prefixo colorido (> brain:)
4. [ ] Adicionar `spinner.ts` com animações elegantes
5. [ ] Implementar `table.ts` para output estruturado

#### Step 1.2: Autenticação & Setup
```
Arquivos a criar/modificar:
├── cli/src/auth/
│   ├── auth-manager.ts       # Gerenciador de autenticação
│   ├── credential-store.ts   # Armazenamento seguro
│   ├── api-validator.ts      # Validação de API keys
│   └── index.ts
├── cli/src/commands/
│   ├── init.ts               # Comando de inicialização
│   └── auth.ts               # Comandos de autenticação
```

**Micro-Steps:**
1. [ ] Criar `credential-store.ts` usando keytar ou arquivo encriptado
2. [ ] Implementar `api-validator.ts` para testar API keys
3. [ ] Criar `auth-manager.ts` integrando store e validator
4. [ ] Implementar comando `supadupacode init` com wizard
5. [ ] Adicionar comando `supadupacode auth add/remove/list`

#### Step 1.3: Configuração Inicial
```
Arquivos a criar/modificar:
├── cli/src/core/
│   ├── setup-wizard.ts       # Wizard de configuração
│   └── project-detector.ts   # Detecta tipo de projeto
├── cli/config/
│   ├── default.json          # Configuração padrão
│   └── templates/            # Templates por tipo de projeto
```

**Micro-Steps:**
1. [ ] Criar `setup-wizard.ts` com inquirer prompts
2. [ ] Implementar `project-detector.ts` (Node, Python, Rust, etc.)
3. [ ] Adicionar templates de configuração por tipo de projeto
4. [ ] Integrar wizard no comando `init`

---

### Milestone 2: Brain Agent Core

**Objetivo:** Brain Agent funcionando em todos os modos.

#### Step 2.1: Modo Conversacional
```
Arquivos a criar/modificar:
├── cli/src/agents/brain/
│   ├── brain-agent.ts        # Agente principal (refatorar)
│   ├── conversation-handler.ts # Handler de conversas
│   ├── context-manager.ts    # Gerenciador de contexto
│   └── response-formatter.ts # Formatação de respostas
├── cli/prompts/brain/
│   ├── system/v1.md          # System prompt principal
│   ├── conversation/v1.md    # Prompt conversacional
│   └── planning/v1.md        # Prompt de planejamento
```

**Micro-Steps:**
1. [ ] Refatorar `brain-agent.ts` para suportar múltiplos modos
2. [ ] Criar `conversation-handler.ts` com histórico de mensagens
3. [ ] Implementar `context-manager.ts` para carregar contexto do projeto
4. [ ] Criar `response-formatter.ts` com markdown rendering
5. [ ] Escrever prompts otimizados para cada modo

#### Step 2.2: Modo Construção Direta
```
Arquivos a criar/modificar:
├── cli/src/agents/brain/
│   ├── direct-builder.ts     # Executor de tarefas diretas
│   └── quick-actions/
│       ├── file-edit.ts      # Edição rápida de arquivo
│       ├── file-create.ts    # Criação de arquivo
│       └── refactor.ts       # Refactoring simples
```

**Micro-Steps:**
1. [ ] Criar `direct-builder.ts` para tarefas simples
2. [ ] Implementar `file-edit.ts` com diff preview
3. [ ] Adicionar `file-create.ts` com templates
4. [ ] Criar `refactor.ts` para mudanças inline

#### Step 2.3: Modo Big Job (Diferencial Principal)
```
Arquivos a criar/modificar:
├── cli/src/agents/brain/
│   ├── big-job-orchestrator.ts  # Orquestrador principal
│   ├── task-decomposer.ts       # Decomposição de tarefas
│   ├── sync-coordinator.ts      # Coordenação de sync
│   └── conflict-resolver.ts     # Resolução de conflitos
├── cli/src/workflow/
│   ├── big-job-runner.ts        # Runner específico
│   └── sync-lock.ts             # Sistema de locks
```

**Micro-Steps:**
1. [ ] Criar `big-job-orchestrator.ts` coordenando todo o fluxo
2. [ ] Implementar `task-decomposer.ts` com LLM
3. [ ] Criar `sync-coordinator.ts` para evitar conflitos
4. [ ] Adicionar `sync-lock.ts` para lock de arquivos
5. [ ] Implementar `conflict-resolver.ts` com merge automático

---

### Milestone 3: Mini-Brains System

**Objetivo:** Hierarquia de brains para monitoramento distribuído.

#### Step 3.1: Arquitetura Mini-Brains
```
Arquivos a criar/modificar:
├── cli/src/agents/brain/mini-brains/
│   ├── mini-brain.ts          # Classe base mini-brain
│   ├── mini-brain-factory.ts  # Factory para criar mini-brains
│   ├── mini-brain-registry.ts # Registro de mini-brains ativos
│   └── types/
│       ├── monitor-brain.ts   # Brain de monitoramento
│       ├── task-brain.ts      # Brain de tarefa específica
│       └── review-brain.ts    # Brain de revisão
```

**Micro-Steps:**
1. [ ] Criar `mini-brain.ts` estendendo BaseAgent
2. [ ] Implementar `mini-brain-factory.ts` para criação dinâmica
3. [ ] Adicionar `mini-brain-registry.ts` para tracking
4. [ ] Criar tipos específicos (monitor, task, review)

#### Step 3.2: Comunicação Inter-Brain
```
Arquivos a criar/modificar:
├── cli/src/agents/brain/communication/
│   ├── brain-protocol.ts      # Protocolo de mensagens
│   ├── message-bus.ts         # Bus de mensagens interno
│   ├── state-sync.ts          # Sincronização de estado
│   └── report-aggregator.ts   # Agregação de relatórios
```

**Micro-Steps:**
1. [ ] Criar `brain-protocol.ts` definindo formato de mensagens
2. [ ] Implementar `message-bus.ts` com pub/sub
3. [ ] Adicionar `state-sync.ts` para sincronização
4. [ ] Criar `report-aggregator.ts` para consolidar relatórios

---

### Milestone 4: Agentes Especializados

**Objetivo:** Agentes especializados funcionando no workflow.

#### Step 4.1: Security Agent
```
Arquivos a criar/modificar:
├── cli/src/agents/security/
│   ├── security-agent.ts      # Agente principal
│   ├── scanners/
│   │   ├── vulnerability-scanner.ts  # Scanner de vulnerabilidades
│   │   ├── dependency-checker.ts     # Checker de dependências
│   │   └── code-analyzer.ts          # Análise estática
│   ├── issue-creator.ts       # Criador de issues
│   └── suggestion-generator.ts # Gerador de sugestões
├── cli/prompts/security/
│   └── system/v1.md           # System prompt
```

**Micro-Steps:**
1. [ ] Criar `security-agent.ts` estendendo BaseAgent
2. [ ] Implementar `vulnerability-scanner.ts`
3. [ ] Adicionar `dependency-checker.ts` (npm audit, etc.)
4. [ ] Criar `code-analyzer.ts` para padrões inseguros
5. [ ] Implementar `issue-creator.ts` para GitHub issues

#### Step 4.2: PR Approval Agent
```
Arquivos a criar/modificar:
├── cli/src/agents/reviewer/
│   ├── reviewer-agent.ts      # Agente principal
│   ├── checkers/
│   │   ├── code-quality.ts    # Checker de qualidade
│   │   ├── test-coverage.ts   # Checker de cobertura
│   │   ├── style-guide.ts     # Checker de estilo
│   │   └── security-check.ts  # Verificação de segurança
│   ├── approval-logic.ts      # Lógica de aprovação
│   └── comment-generator.ts   # Gerador de comentários
├── cli/prompts/reviewer/
│   └── system/v1.md           # System prompt
```

**Micro-Steps:**
1. [ ] Criar `reviewer-agent.ts` estendendo BaseAgent
2. [ ] Implementar checkers (quality, coverage, style, security)
3. [ ] Criar `approval-logic.ts` com critérios configuráveis
4. [ ] Adicionar `comment-generator.ts` para feedback rico

---

### Milestone 5: Workflow Sincronizado

**Objetivo:** Fluxo completo sem conflitos.

#### Step 5.1: Branch Management
```
Arquivos a criar/modificar:
├── cli/src/git/
│   ├── branch-strategy.ts     # Estratégia de branches
│   ├── auto-merge.ts          # Merge automático
│   ├── conflict-detector.ts   # Detecção de conflitos
│   └── rollback-manager.ts    # Rollback automático
```

**Micro-Steps:**
1. [ ] Criar `branch-strategy.ts` (agent/<agent>/<task>)
2. [ ] Implementar `auto-merge.ts` com validação
3. [ ] Adicionar `conflict-detector.ts` pre-merge
4. [ ] Criar `rollback-manager.ts` para reversões

#### Step 5.2: Codebase Sync
```
Arquivos a criar/modificar:
├── cli/src/sync/
│   ├── file-locker.ts         # Lock de arquivos
│   ├── change-coordinator.ts  # Coordenação de mudanças
│   └── state-manager.ts       # Gerenciamento de estado
```

**Micro-Steps:**
1. [ ] Criar `file-locker.ts` com locks advisory
2. [ ] Implementar `change-coordinator.ts`
3. [ ] Adicionar `state-manager.ts` para tracking

---

### Milestone 6: Observabilidade & Polish

**Objetivo:** Monitoramento e refinamento final.

#### Step 6.1: Dashboard & Métricas
```
Arquivos a criar/modificar:
├── cli/src/observability/
│   ├── metrics-collector.ts   # Coletor de métricas
│   ├── status-dashboard.ts    # Dashboard no terminal
│   └── report-generator.ts    # Gerador de relatórios
```

#### Step 6.2: Logging & Auditoria
```
Arquivos a criar/modificar:
├── cli/src/observability/
│   ├── audit-logger.ts        # Logger de auditoria
│   ├── event-tracker.ts       # Tracker de eventos
│   └── trace-manager.ts       # Tracing distribuído
```

---

## 📅 Timeline Sugerida

| Milestone | Duração | Dependências |
|-----------|---------|--------------|
| 1. Interface & Auth | 2 semanas | - |
| 2. Brain Agent Core | 2 semanas | Milestone 1 |
| 3. Mini-Brains | 1 semana | Milestone 2 |
| 4. Agentes Especializados | 2 semanas | Milestone 2 |
| 5. Workflow Sync | 2 semanas | Milestone 3, 4 |
| 6. Observabilidade | 1 semana | Milestone 5 |

**Total Estimado:** ~10 semanas para MVP completo

---

## 🔄 Ciclo de Desenvolvimento

### Para cada Step:
1. **Criar branch**: `feature/<milestone>-<step>`
2. **Implementar**: Seguir micro-steps
3. **Testar**: Testes unitários + integração
4. **Documentar**: JSDoc + README do módulo
5. **PR**: Review automático + humano
6. **Merge**: Integrar na develop

### Checkpoints de Qualidade:
- [ ] Build passing
- [ ] Tests passing (>80% coverage)
- [ ] Lint passing
- [ ] Type-check passing
- [ ] Documentation updated
- [ ] No security vulnerabilities

---

## 📝 Notas Importantes

### Princípios de Design
1. **Modularidade**: Cada componente deve ser independente
2. **Extensibilidade**: Fácil adicionar novos agentes/features
3. **Resiliência**: Falhas devem ser tratadas graciosamente
4. **Observabilidade**: Tudo deve ser mensurável e rastreável

### Convenções
- Classes com prefixo `sd*`
- Eventos com prefixo `SD_EVENT_*`
- Configurações em `shared/contracts/`
- Prompts em `cli/prompts/<agent>/`

### Pontos de Atenção
- **Sincronização**: Evitar race conditions entre agentes
- **Memória**: Não crescer infinitamente, implementar cleanup
- **Tokens**: Monitorar uso de API para otimizar custos
- **UX**: Feedback constante ao usuário sobre progresso

---

**Documento mantido por:** Equipe SupaDupa-Coding  
**Versão:** 1.0  
**Próxima revisão:** A cada milestone completado
