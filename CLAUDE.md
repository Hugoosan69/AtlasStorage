@AGENTS.md

## Banco de Dados

Toda e qualquer alteração no banco de dados (migrations, queries, DDL, DML) deve ser feita exclusivamente via MCP **MCP_ATLAS_SUPA** (conector Supabase). Nunca pedir ao usuário para rodar SQL manualmente nem usar outro servidor MCP para operações no banco.
