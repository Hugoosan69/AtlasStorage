# Design System: Atlas Storage

Guia de cores, tipografia, espaçamento e componentes extraído do código em 23/10/2026 (branch `claude/stoic-noether-fvjnpe`).

Fontes de verdade:
- `src/app/globals.css`: tokens de cor, sombras e classes de componentes.
- `src/app/layout.tsx`: fonte, metadados e script de tema.

Logos e ícones ficam de fora (seção 12).

---

## 1. Como usar este guia

- Os valores são os do código atual. Se `globals.css` mudar, este arquivo fica desatualizado.
- Para reproduzir o visual em outro projeto, copie o bloco de tokens da seção 3.5 e o arquivo `src/app/globals.css` inteiro para as classes de componentes. O CSS é autocontido e usa Tailwind v4.
- O projeto não tem `tailwind.config`. As cores são CSS variables (`var(--text-2)`) usadas em `style` ou nas classes `.card`, `.btn`, `.input` etc. Se o novo projeto preferir utilitários Tailwind, veja a seção 3.6.

## 2. Princípios visuais

- **Neutro e calmo.** Fundo cinza-azulado quase branco no claro e quase preto azulado no escuro. A cor aparece quase só nas ações.
- **Um azul para ação e foco** (`--accent`). Estados ganham fundo suave (`-soft`).
- **Separação por borda de 1px.** Sombra pesada só em elementos flutuantes: menus, modais, toasts.
- **Raios em escala:** 10px em controles, 16px em cartões e modais.
- **Hierarquia por cor e peso** mais que por tamanho. A interface usa 14px como tamanho padrão.

## 3. Cores

### 3.1 Neutros (superfície e texto)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#f6f7f9` | `#0a0e17` | Fundo da página |
| `--surface` | `#ffffff` | `#16171c` | Cartões, sidebar, topbar, modais, menus |
| `--surface-2` | `#f3f4f6` | `#1c1d24` | Campo de busca, rodapé de modal, trilho do segmented, miniaturas |
| `--hover` | `#eef0f3` | `#22242c` | Hover de linha, botão ghost, item de menu |
| `--selected` | `#e3edff` | `#1b2a4a` | Linha ou card selecionado |
| `--border` | `#e5e7eb` | `#262830` | Divisórias e bordas padrão (1px) |
| `--border-strong` | `#d2d6dd` | `#353843` | Borda de input e checkbox, hover de card, área tracejada |
| `--text` | `#16181d` | `#ececf1` | Texto principal |
| `--text-2` | `#555b67` | `#a5a8b4` | Texto secundário, labels, nav inativo |
| `--text-3` | `#8b919d` | `#6f7380` | Metadados, placeholders, cabeçalho de tabela (ver seção 4) |

### 3.2 Ação e seleção

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--accent` | `#1a6cf0` | `#4b8cff` | Ação primária, links, foco, nav ativo, checkbox marcado |
| `--accent-hover` | `#1459d1` | `#6aa0ff` | Hover do primário |
| `--accent-soft` | `#e8f0fe` | `#16244a` | Fundo de nav ativo, área de drop, seleção de texto |
| `--accent-text` | `#ffffff` | `#ffffff` | Texto sobre `--accent` |

### 3.3 Estados semânticos

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--success` | `#16a34a` | `#3fcf7f` | Upload concluído, entradas financeiras |
| `--danger` | `#dc2626` | `#f26d6d` | Erro, exclusão, saídas pessoais |
| `--danger-soft` | `#fdeded` | `#3a1b1e` | Fundo de mensagem de erro |
| `--warning` | `#c27803` | `#f0a53a` | Aviso, saída de mercadoria |
| `--warning-soft` | `#fff5e1` | `#33261a` | Fundo de aviso |

### 3.4 Componentes com cor própria

- **Toast.** Usa `--toast-bg`, `--toast-text` e `--toast-accent`, e inverte o tema. No claro: fundo `#1d1f25`, texto `#f4f4f6`, ação `#8ab4ff`. No escuro: fundo `#f4f4f6`, texto `#16181d`, ação `#1a6cf0`.
- **Scrim de modal** (`.backdrop`): `rgb(8 9 12 / 0.45)`.
- **Visualizador de arquivos** (`.preview-backdrop`): `rgb(9 10 13 / 0.94)` com blur de 6px. Os botões sobre ele são brancos, com opacidade de 85%.
- **Hero do login** (fixo, não tokenizado): fundo `#080e1b`, com texto branco a 60% e 35%.
- **Avatar.** Cor derivada do email: hash da string convertido em matiz (0 a 359), com `hsl(matiz 62% 52%)`. Texto branco, 12px, peso 600 (`AppShell.tsx:14-18`).

### 3.5 Tokens prontos para copiar

Sem os tokens de ícones (`--folder-*`, `--doc-*`), que estão excluídos pela seção 12.

```css
:root {
  --bg: #f6f7f9;
  --surface: #ffffff;
  --surface-2: #f3f4f6;
  --hover: #eef0f3;
  --selected: #e3edff;
  --text: #16181d;
  --text-2: #555b67;
  --text-3: #8b919d;
  --border: #e5e7eb;
  --border-strong: #d2d6dd;
  --accent: #1a6cf0;
  --accent-hover: #1459d1;
  --accent-soft: #e8f0fe;
  --accent-text: #ffffff;
  --danger: #dc2626;
  --danger-soft: #fdeded;
  --success: #16a34a;
  --warning: #c27803;
  --warning-soft: #fff5e1;
  --shadow-sm: 0 1px 2px rgb(16 24 40 / 0.06);
  --shadow: 0 1px 3px rgb(16 24 40 / 0.06), 0 8px 24px rgb(16 24 40 / 0.08);
  --shadow-lg: 0 4px 6px rgb(16 24 40 / 0.04), 0 20px 48px rgb(16 24 40 / 0.16);
  --toast-bg: #1d1f25;
  --toast-text: #f4f4f6;
  --toast-accent: #8ab4ff;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0a0e17;
    --surface: #16171c;
    --surface-2: #1c1d24;
    --hover: #22242c;
    --selected: #1b2a4a;
    --text: #ececf1;
    --text-2: #a5a8b4;
    --text-3: #6f7380;
    --border: #262830;
    --border-strong: #353843;
    --accent: #4b8cff;
    --accent-hover: #6aa0ff;
    --accent-soft: #16244a;
    --danger: #f26d6d;
    --danger-soft: #3a1b1e;
    --success: #3fcf7f;
    --warning: #f0a53a;
    --warning-soft: #33261a;
    --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.4);
    --shadow: 0 1px 3px rgb(0 0 0 / 0.4), 0 10px 28px rgb(0 0 0 / 0.45);
    --shadow-lg: 0 4px 8px rgb(0 0 0 / 0.35), 0 24px 56px rgb(0 0 0 / 0.6);
    --toast-bg: #f4f4f6;
    --toast-text: #16181d;
    --toast-accent: #1a6cf0;
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --bg: #0a0e17;
  --surface: #16171c;
  --surface-2: #1c1d24;
  --hover: #22242c;
  --selected: #1b2a4a;
  --text: #ececf1;
  --text-2: #a5a8b4;
  --text-3: #6f7380;
  --border: #262830;
  --border-strong: #353843;
  --accent: #4b8cff;
  --accent-hover: #6aa0ff;
  --accent-soft: #16244a;
  --danger: #f26d6d;
  --danger-soft: #3a1b1e;
  --success: #3fcf7f;
  --warning: #f0a53a;
  --warning-soft: #33261a;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.4);
  --shadow: 0 1px 3px rgb(0 0 0 / 0.4), 0 10px 28px rgb(0 0 0 / 0.45);
  --shadow-lg: 0 4px 8px rgb(0 0 0 / 0.35), 0 24px 56px rgb(0 0 0 / 0.6);
  --toast-bg: #f4f4f6;
  --toast-text: #16181d;
  --toast-accent: #1a6cf0;
  color-scheme: dark;
}
```

### 3.6 Uso com Tailwind (opcional)

O projeto atual não tem este bloco. Ele serve para o novo projeto usar utilitários como `bg-surface` e `text-text-2`:

```css
@import "tailwindcss";

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-text: var(--text);
  --color-text-2: var(--text-2);
  --color-text-3: var(--text-3);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-danger: var(--danger);
  --color-success: var(--success);
  --color-warning: var(--warning);
}
```

## 4. Contraste

Razões calculadas com a fórmula WCAG 2.x sobre os hex do código. Texto normal exige 4,5:1.

| Par | Razão | Onde aparece | Situação |
|---|---|---|---|
| `--text-3` sobre `--surface` (claro) | 3,17:1 | Metadados, placeholders | Abaixo de 4,5:1 |
| `--text-3` sobre `--bg` (claro) | 2,95:1 | Idem | Abaixo de 4,5:1 |
| `--text-3` sobre `--surface` (escuro) | 3,78:1 | Idem | Abaixo de 4,5:1 |
| `--text-3` sobre `--bg` (escuro) | 4,08:1 | Idem | Abaixo de 4,5:1 |
| Branco sobre `--accent` (claro) | 4,72:1 | `.btn-primary` | OK |
| Branco sobre `--accent` (escuro) | 3,23:1 | `.btn-primary`, 14px peso 500 | Abaixo de 4,5:1 |
| `--accent` sobre `--accent-soft` (claro) | 4,12:1 | Nav ativo, 14px peso 500 | Abaixo de 4,5:1 |
| `--accent` sobre `--accent-soft` (escuro) | 4,69:1 | Nav ativo | OK |
| `--danger` sobre `--danger-soft` (claro) | 4,26:1 | Erro do login | Abaixo de 4,5:1 |
| Branco sobre `--danger` | 4,83:1 | `.btn-danger` | OK |
| `--success` sobre `--surface` (claro) | 3,30:1 | Texto pequeno | Abaixo de 4,5:1 |
| `--warning` sobre `--surface` (claro) | 3,51:1 | Texto pequeno | Abaixo de 4,5:1 |
| `--text-2` sobre `--surface` | 6,82:1 (claro), 7,55:1 (escuro) | Texto secundário | OK |
| `--text` sobre `--surface` | 17,76:1 (claro), 15,20:1 (escuro) | Texto principal | OK |

Para texto pequeno, use `--text-2` no lugar de `--text-3`. Se o token precisar ficar, ajuste o tom até 4,5:1 nos dois temas.

## 5. Tipografia

### 5.1 Família

- **Inter**, via `next/font/google` (`layout.tsx:5`): `subsets: ["latin"]`, `display: "swap"`, `variable: "--font-sans"`.
- **Pilha de texto:** `var(--font-sans), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.
- **Monoespaçada** (teclas, prévia de texto): `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- **Suavização:** `-webkit-font-smoothing: antialiased` e `-moz-osx-font-smoothing: grayscale`.
- **Idioma:** `lang="pt-BR"`. Valores monetários em BRL com `toLocaleString("pt-BR")`.

### 5.2 Escala em uso

| Papel | Tamanho / altura de linha | Peso | Tracking | Cor | Referência |
|---|---|---|---|---|---|
| Título de página | 24 / 32 (`text-2xl`) | 600 | tight (-0,025em) | `--text` | `login/page.tsx:69` |
| Título de modal | 16 / 24 (`text-base`) | 600 | tight | `--text` | `ui/Modal.tsx:43` |
| Título de painel | 15 (`text-[15px]`) | 600 | normal | `--text` | `DetailsPanel.tsx:64` |
| Crumb atual | 18 / 28 (`text-lg`) | 600 | normal | `--text` | `.crumb[data-current]` |
| Valor de destaque | 18–20 (`text-lg`, `text-xl`) | 700 | normal | `--text` | `FinanceView.tsx:182, 237` |
| Texto de interface | 14 / 20 (`text-sm`) | 400 | normal | `--text` | Padrão |
| Botão, nav, nome de arquivo | 14 / 20 (`text-sm`) | 500 | normal | `--text` / `--text-2` | `.btn`, `.nav-link`, `.item-name` |
| Ação em toast, destaque | 14 | 600 | normal | `--accent` / `--text` | `ui/Toast.tsx:74` |
| Rótulo de campo | 12 / 16 (`text-xs`) | 500 | normal | `--text-2` | `.label` |
| Metadado (data, tamanho) | 12 / 16 (`text-xs`) | 400 | normal | `--text-2` / `--text-3` | `AppShell.tsx:102` |
| Célula secundária | 13 | 400 | normal | `--text-2` | `.cell-muted` |
| Cabeçalho de tabela | 12 (`text-xs`) | 500 | normal | `--text-3` | `.file-head` |
| Rótulo de seção (caixa-alta) | 12 (`text-xs`) ou 11 (`text-[11px]`) | 600 | 0,05em (`tracking-wider`) | `--text-3` | `.section-label`, `FolderTree.tsx:168` |
| Tecla de atalho | 12 (`.kbd`) ou 11 (`.kbd-hint`) | 400 | normal | `--text` / `--text-3` | Monoespaçada |
| Wordmark em texto | 15 (ATLAS, 700) e 9 (STORAGE, 600) na sidebar; 18 e 11 no login | 700 / 600 | 0,025em / 0,32em | `--text` / `--accent` | `AppShell.tsx:64-65` |

O wordmark é texto da marca, não logo. Se a marca mudar, troque também este item.

### 5.3 Regras de uso

- **Hierarquia** por cor (`--text`, `--text-2`, `--text-3`) e peso (500 para interface, 600 para títulos, 700 para números e marca). Use `font-bold` só para números de destaque e wordmark.
- **Títulos grandes** usam `tracking-tight`. **Caixa-alta** sempre com tracking positivo (0,05em ou mais).
- **Menor tamanho funcional:** 11px. A exceção é o "STORAGE" da sidebar (9px), que faz parte da marca.
- **Mono** só para teclas, atalhos e prévia de texto. Nunca para interface geral.

## 6. Espaçamento, tamanhos e raio

### 6.1 Espaçamento

Escala padrão do Tailwind (múltiplos de 4px). Passos fracionários como `gap-2.5` (10px), `px-3.5` (14px) e `mt-0.5` (2px) aparecem com frequência.

### 6.2 Alturas de controle

| Elemento | Altura |
|---|---|
| Tecla (`.kbd`) | 24px (`h-6`) |
| Chip de segmented (botão) | 28px (`h-7`) |
| Linha de árvore (`.tree-row`) | 32px (`h-8`) |
| Botão, nav, crumb, botão de ícone | 36px (`h-9`) |
| Input | 40px (`h-10`); login usa 44px (`h-11`) |
| Cabeçalho de tabela (`.file-head`) | 40px (`h-10`) |
| Linha de arquivo (`.file-row`) | 48px (`h-12`) |
| Topbar mobile | 56px (`h-14`) |
| Barra de status | 32px (`h-8`) |
| Avatar | 32px |
| Checkbox | 18px, raio 5px |

### 6.3 Raios

| Raio | Uso |
|---|---|
| 5px | Checkbox |
| 6px (`rounded-md`) | Teclas `.kbd` |
| 8px (`rounded-lg`) | Itens de menu, linhas de árvore, botões de ícone em listas, crumb |
| 9px | `.nav-link` |
| 10px (`rounded-[10px]`) | Botões, inputs, segmented, botões de overlay |
| 12px (`rounded-xl`) | Notice, barra de seleção, toast, card de pasta |
| 16px (`rounded-2xl`) | Cartões, tabela de arquivos, card de arquivo, modal, painel de upload |
| 18px | Ícone de estado vazio |
| 24px (`rounded-3xl`) | Área vazia tracejada, overlay de arrastar |
| Pill | Avatar, botões de navegação do preview, pill de arrastar |

### 6.4 Layout e breakpoints

Breakpoints do Tailwind: `sm` 640px, `md` 768px, `lg` 1024px.

- **Sidebar:** fixa com 256px (`w-64`) a partir de `md`. Abaixo disso vira drawer de 288px (`w-72`, máximo 85vw) com scrim.
- **Login:** duas colunas a partir de `lg`. Formulário com largura máxima de 384px (`max-w-sm`) e padding de 20px nas laterais.
- **Tabela de arquivos:** colunas de data (136px) e tamanho (104px) só a partir de `sm`.
- **Toasts:** largura total no mobile (`100% - 2rem`). No desktop, mínimo 320px e máximo 448px.
- **Modal:** no mobile vira folha que sobe do fim da tela, com cantos superiores de 16px. A partir de `sm`, fica centralizado.

## 7. Elevação, bordas e camadas

**Bordas.** Padrão de 1px com `--border`. Use `--border-strong` em hover de card, borda de input e checkbox, e área tracejada de estado vazio.

**Sombras:**
- `--shadow-sm`: botões, segmented ativo, menu de card.
- `--shadow`: card de arquivo em hover.
- `--shadow-lg`: popover, folha, modal, toast, painel de upload, pill de arrastar.

**Z-index:**
- Cabeçalho sticky: 10.
- Overlay de arrastar: 30.
- Drawer mobile: 50.
- Modal: 65.
- Toast: 70.

## 8. Estados

- **Hover:** fundo `--hover` em linhas, botões ghost e nav. Texto sobe de `--text-2` para `--text`.
- **Selecionado:** fundo `--selected`. Em cards, a borda também vira `--accent`.
- **Cursor de teclado** (`data-cursor`): barra de 3px em `--accent` à esquerda da linha, ou borda `--accent` no card.
- **Área de drop:** fundo `--accent-soft` com contorno `--accent` tracejado.
- **Foco visível:** outline de 2px em `--accent`, com offset de 2px. Inputs: borda `--accent` e anel de 3px com `--accent` a 18%.
- **Desabilitado:** botões com opacidade 0,5; inputs com 0,6; itens de menu com 0,4.
- **Erro:** fundo `--danger-soft` com texto `--danger`.
- **Carregando:** skeleton com gradiente de `--surface-2` para `--hover` e volta, com shimmer de 1,4s.
- **Vazio:** `.empty-state` centralizado com `py-20`. Variante `.dashed` tem borda tracejada de 2px em `--border-strong` e raio de 24px. O ícone tem 64px, raio de 18px e fundo `--surface-2`.

## 9. Movimento

| Tipo | Duração e curva |
|---|---|
| Cor e fundo (hover, nav, botão) | 0,08s a 0,12s |
| Card (borda, sombra, transform) | 0,10s a 0,15s |
| Entrada de popover, modal e toast (`animate-pop`) | 0,14s, ease-out, de 4px e escala 0,98 |
| Fade de backdrop (`animate-fade`) | 0,15s, ease-out |
| Folha e drawer | 0,22s, `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Slide-in | 0,18s, ease-out |
| Skeleton (shimmer) | 1,4s, ease, infinito |

Com `prefers-reduced-motion: reduce`, todas as animações e transições caem para 0,01ms.

## 10. Componentes-chave

Classes definidas em `src/app/globals.css`:

| Classe | Especificação |
|---|---|
| `.btn` | Altura 36px, padding horizontal 14px, raio 10px, borda `--border`, fundo `--surface`, sombra `--shadow-sm`, texto 14px peso 500 |
| `.btn-primary` | Fundo `--accent`, texto `--accent-text`, hover `--accent-hover` |
| `.btn-danger` | Fundo `--danger`, texto `#fff`, hover com brilho de 94% |
| `.btn-ghost` | Fundo e borda transparentes, texto `--text-2`, hover `--text` |
| `.btn-icon` | Botão quadrado de 36px |
| `.input` | Altura 40px, raio 10px, borda `--border`, fundo `--surface`, placeholder `--text-3` |
| `.label` | 12px peso 500, `--text-2`, margem inferior de 6px |
| `.card` | Raio 16px, fundo `--surface`, borda `--border` |
| `.nav-link` | Altura 36px, raio 9px, 14px peso 500. Ativo: fundo `--accent-soft`, texto `--accent` |
| `.segmented` | Trilho `--surface-2`, raio 10px, padding de 2px. Botão ativo: fundo `--surface` com `--shadow-sm` |
| `.popover`, `.sheet` | Fundo `--surface`, `--shadow-lg`. Popover com borda |
| `.toast` | Cores invertidas (seção 3.4), raio 12px, texto 14px |
| `.kbd` | Altura 24px, mono 12px, borda inferior de 2px |
| `.notice` | Fundo `--surface-2`, raio 12px, texto 13px |
| `.file-table` | Raio 16px, fundo `--surface`, borda `--border` |
| `.file-row` | Altura 48px, borda inferior `--border`. Hover `--hover`, selecionado `--selected` |
| `.file-card` | Raio 16px, miniatura 4:3 sobre `--surface-2` |
| `.folder-tile` | Altura 56px, raio 12px |
| `.tree-row` | Altura 32px, raio 8px. Ativo: fundo `--selected`, peso 500 |
| `.checkbox` | 18px, raio 5px, borda 1,5px `--border-strong`. Marcado: fundo `--accent` |
| `.avatar` | 32px circular, 12px peso 600, texto branco |
| `.status-bar` | Altura 32px, 12px, texto `--text-3`, borda superior |

## 11. Tema claro e escuro

Três estados, controlados pelo atributo `data-theme` em `<html>`:

1. **Sistema (padrão):** sem `data-theme`. Usa `prefers-color-scheme`.
2. **Claro:** `data-theme="light"`. Ignora a preferência do sistema.
3. **Escuro:** `data-theme="dark"`.

A escolha fica em `localStorage` na chave `atlas:theme`, com valores `"light"` ou `"dark"`. Ausente significa sistema.

- **Script anti-flash** (`layout.tsx:19`): roda no `<head>` antes da pintura. Copie este script para o novo projeto e mantenha `suppressHydrationWarning` no `<html>`.
- **`color-scheme`** acompanha o tema, para formulários e scrollbars nativos.
- **`theme-color` do navegador:** `#f6f7f9` no claro, `#0a0e17` no escuro (`layout.tsx:13-16`).
- **Seletor de três opções** (`ThemeToggle.tsx`): copie a lógica. Os ícones do componente estão excluídos.

## 12. Fora deste guia

- **Logos:** `/logo-mark.png` e `/logo-full.jpg`, usados em `AppShell.tsx` e `login/page.tsx`.
- **Ícones:** biblioteca `lucide-react` em todo o projeto, e o componente `FileIcon.tsx`.
- **Cores de ícones de tipo de arquivo:** tokens `--folder-back`, `--folder-front`, `--doc-paper`, `--doc-edge`, `--doc-fold`, além das cores fixas em `FileIcon.tsx`.
- **Wordmark em texto:** está na tabela da seção 5.2 como referência. Não é logo, mas muda com a marca.

## 13. Pendências encontradas no código

1. **Tokens indefinidos.** `--border-active` e `--surface-active` são usados em `FinanceView.tsx:230-231` mas não existem em `globals.css`. Resultado: o dia selecionado na semana financeira não recebe fundo nem borda. Corrija definindo os tokens, ou troque por `--accent` e `--accent-soft`.
2. **Contraste.** Veja a seção 4. `--text-3` é o mais afetado, por ser usado em metadados e placeholders.
3. **Cores fora de tokens:**
   - `AdminPanel.tsx:882-893` e `:963` usam hex direto para as ações do registro de auditoria (`#2f6feb`, `#1e9e5a`, `#e5484d` e outras).
   - `login/page.tsx:48`: hero em `#080e1b`.
   - `globals.css:716`: `.btn-overlay-primary` usa `#111` direto.
   - `ui/Menu.tsx:127`: backdrop mobile em `rgb(0 0 0 / 0.4)`.
4. **Bloco escuro duplicado** em `globals.css` (linhas 37-70 e 72-103). Quando um token mudar, altere nos dois lugares. O bloco `data-theme="dark"` existe para forçar o escuro mesmo com o sistema claro.
5. **README desatualizado.** `README.md:21` diz que a fonte é Geist, mas o código usa Inter (`layout.tsx:5`). Este guia segue o código.

## 14. Checklist para outro projeto

1. Coloque `@import "tailwindcss";` no topo do CSS e, em seguida, os tokens da seção 3.5.
2. Copie de `src/app/globals.css` a partir da linha 105 (`@layer base`). O arquivo inclui as classes de componentes até o fim, incluindo o `@layer components` e as animações.
3. Carregue a Inter com `next/font/google` e a variável `--font-sans` (seção 5.1).
4. Adicione o script de tema da seção 11 no `<head>` e mantenha `suppressHydrationWarning` no `<html>`.
5. Defina `lang` e `themeColor` conforme o projeto.
6. Troque logos, nome, ícones e wordmark. Revise o hero do login (`#080e1b`) se a marca mudar.
7. Corrija as pendências da seção 13 antes de copiar, para não herdar os problemas.
