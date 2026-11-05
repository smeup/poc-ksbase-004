# React + TypeScript + Vite

## Istanze Grain e domini applicativi

L'anagrafica mock delle istanze è in `public/data/grain-instances.json`.
Ogni dominio in `public/data/application-domains.json` specifica l'ID
dell'istanza di appartenenza nell'attributo obbligatorio `grainInstance`.
La home permette di scegliere un'istanza e mostra i soli domini associati;
un riferimento a un'istanza inesistente impedisce il caricamento della
configurazione. Gli URL diretti dei domini rimangono disponibili.

Smeup SI contiene Smeup BSA (`ges_10adv`), Smeup LAB (`ges_49adv`) e
Smeup ICS (`ges_11adv`). Tutti utilizzano la UPP AS400 Connector, con il
micro executor `me-java-as400proxy` e i servizi `LOA10_SE`, `WESER_23` e
`JATRE_18C`. HOLOS SaaS contiene Cliente A e Cliente B, entrambi associati
alla UPP condivisa L64 Connector. La UPP usa
`me-node-holos` e i servizi `HO_000_01` (classi) e `HO_000_02` (istanze).
Queste associazioni sono dati mock: non configurano connessioni separate né
garantiscono isolamento dei dati fra i clienti.

## Data sources

I data source mock sono definiti in `public/data/micro-executors.json` nell'array
`dataSources` del micro executor responsabile. Ogni elemento contiene `id`,
`title`, `type` e `description` ed è visibile nella pagina del micro executor.

## UPP

L'anagrafica mock `public/data/upp.json` contiene per ogni UPP `id`, `title`,
`description` (obiettivo) e `microExecutorIds`. Il dominio associa le UPP
tramite `uppIds` in `public/data/application-domains.json`. Ogni servizio
elenca le UPP a cui appartiene tramite `uppIds` in
`public/data/micro-executors.json`: la pagina della UPP mostra solo questi
servizi, non necessariamente tutti quelli dei suoi micro executor. La voce
«Micro executors» nella pagina UPP elenca quelli associati e permette di
aprirne il dettaglio. Lo UPP Store del dominio mostra l'intero catalogo e
indica le UPP attive per quel dominio; è una vista in sola lettura. Una UPP
condivisa può essere associata a più domini. Ogni micro executor riferito dalla
UPP deve essere associato anche ai domini che la utilizzano, direttamente o
per ereditarietà dalla piattaforma; i riferimenti incoerenti impediscono il
caricamento della configurazione.

Le UPP con `standardPlatform: true` sono ereditate automaticamente da ogni
dominio, insieme ai loro micro executor, anche se non compaiono negli array
`uppIds` e `microExecutorIds` del dominio. Sono contrassegnate dal tag
«standard platform» e risultano attive nello UPP Store. Una UPP standard
esplicitamente indicata nel dominio compare una sola volta. I servizi e i
data source dei nuovi micro executor standard non sono specificati; gli URL
sono esempi mock e non rappresentano endpoint verificati.
Nella lista UPP e nello Store le UPP standard sono raccolte sotto le altre in
una sezione espandibile, inizialmente chiusa.

## Autorizzazioni

Ogni dominio definisce `authorizations` in
`public/data/application-domains.json` come lista di oggetti con `key` (stringa)
e `allowed` (booleano): `true` per consentire e `false` per negare. I formati
illustrati sono `*` (dominio), `<id_upp>`, `<id_upp>.<id_servizio>` e
`<id_upp>.<id_servizio>-<funzione-metodo>`. La pagina del dominio mostra i
valori in sola lettura e verifica che la struttura sia valida, ma non applica
controlli di accesso né definisce precedenze o comportamento predefinito. I
nomi delle funzioni negli esempi sono illustrativi.

## Analisi

La pagina introduttiva presenta le relazioni tra UPP, microservizi e data
source, prima dei casi di analisi. Sono principi architetturali illustrativi:
la POC non verifica l'isolamento o i permessi dei data source.
La voce «Analisi rapporto micro executor e datasource» confronta quattro
strategie di accesso ai dati per dominio; non ne implementa il funzionamento.

Le voci e le rispettive pagine sono definite nell'array `analysisCases` in
`src/App.tsx`. Per aggiungere un caso, specificare percorso, titolo, descrizione,
passaggio del ragionamento e domanda successiva o sintesi finale, spiegazioni su
UPP e dati, esempio, sintesi per il confronto, percorso dell'immagine sotto
`public/` e testo alternativo. L'ordine nell'array definisce il percorso.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
