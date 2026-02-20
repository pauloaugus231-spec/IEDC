# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
# Albergue Dias da Cruz - Frontend

PWA React + Vite para gestão de vagas, cadastros, estadias e relatórios do Albergue Dias da Cruz (Porto Alegre).

## Funcionalidades
- Painel de vagas em tempo real
- Busca e cadastro de hóspedes
- Fila de pendências (cadastros e solicitações)
- Check-in/out com validação de regras
- Relatórios e exportação
- Tema claro/escuro, navegação mobile, toast, modal, sidebar
- Integração com API NestJS, WebSocket e Keycloak

## Comandos

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Testes (se aplicável)
npm test
```

## Estrutura de Rotas
- `/dashboard` — Painel de vagas
- `/buscar` — Busca e check-in/out
- `/pendencias` — Fila de aprovações
- `/relatorios` — Relatórios e exportação

## Configuração de ambiente
Crie um arquivo `.env` com:
```
VITE_API_URL=http://localhost:3001
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=albergue
VITE_KEYCLOAK_CLIENT_ID=dias-da-cruz
```

## Observações
- O layout base está no HTML sugerido pelo usuário.
- Substitua assets e ícones conforme necessidade.
- Para autenticação, configure o Keycloak conforme instruções do backend.
