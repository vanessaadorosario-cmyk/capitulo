# capitulo

Dashboard estático em HTML, CSS e JavaScript para acompanhar ativos de risco, segurança e minério de ferro.

## Publicação no GitHub Pages

1. Envie estes arquivos para o repositório `vanessaadorosario-cmyk/capitulo`.
2. No GitHub, abra `Settings` > `Pages`.
3. Em `Build and deployment`, selecione `Deploy from a branch`.
4. Escolha a branch `main` e a pasta `/ (root)`.
5. Salve e aguarde a URL de publicação.

## Google Sheets

O painel pode ler uma planilha publicada como CSV.

Use uma URL no formato:

`https://docs.google.com/spreadsheets/d/SEU_ID/pub?output=csv`

Colunas aceitas:

- `codigo`
- `variacao_pct`
- `preco`

Se a planilha não estiver disponível, o painel continua funcionando no modo manual.