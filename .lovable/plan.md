## Plano: Painel Admin do Comm Pass

### 1. Estrutura do Banco de Dados (migrations)
- **Tabela `profiles`**: dados do usuário (nome, email, avatar, pontos, etc.)
- **Tabela `user_roles`**: roles (admin, user) com `has_role()` function
- **Tabela `missions`**: missões cadastráveis (nome, descrição, pontos, tipo, dificuldade, etc.)
- **Tabela `quizzes`** e **`quiz_questions`**: quizzes e perguntas cadastráveis
- **Tabela `brands`**: marcas/parceiros editáveis
- **Tabela `user_missions`**: progresso do usuário nas missões
- **Tabela `user_quizzes`**: resultados de quizzes dos usuários
- RLS em todas as tabelas (admin pode tudo, user só lê/próprios dados)

### 2. Autenticação Real
- Substituir localStorage por Supabase Auth (email/senha)
- Trigger para criar profile automaticamente no signup
- Adaptar `UserContext` para usar Supabase

### 3. Painel Admin (`/admin/*`)
- **Dashboard**: visão geral (total usuários, missões, etc.)
- **Missões**: CRUD completo (criar, editar, excluir missões)
- **Quizzes**: CRUD de quizzes e perguntas
- **Marcas**: editar textos, descrições, links das marcas
- **Usuários**: listar, ver detalhes, validar, gerenciar pontos
- Layout com sidebar separado do app principal

### 4. Acesso Admin
- Qualquer usuário com role `admin` na tabela `user_roles`
- Primeiro admin será inserido manualmente no banco
- Guard route `/admin` verificando role via `has_role()`

### Ordem de execução
1. Criar tabelas e RLS
2. Migrar auth para Supabase
3. Criar páginas admin com CRUD
4. Conectar app principal ao banco (missões, quizzes, marcas dinâmicos)
