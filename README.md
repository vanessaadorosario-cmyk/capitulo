# capitulo

Automação de atualização de ativos de mercado com dashboard estático.

## Arquitetura

- `config/assets.json`: universo de ativos, grupos (`safety`, `risk`, `reference`), prioridade de fontes e mapeamento de símbolos por provedor.
- `scripts/asset_updater.py`: coleta de dados com fallback por ativo, classificação (`up/down/neutral`) e agregação das linhas azul/vermelha/verde/cinza.
- `scripts/update_assets.py`: entrypoint para atualização.
- `data/assets_latest.json`: snapshot atual dos ativos.
- `data/series_history.json`: série temporal para o gráfico (janela rolante).
- `dashboard/index.html`: dashboard estático (tabela + gráfico de linhas).

## Fontes de dados

Prioridade padrão por ativo:
1. Investing portfolio (`https://br.investing.com/portfolio/?portfolioID=...`) quando parseável.
2. Sina (`https://finance.sina.com.cn/futures/quotes/I0.shtml` + `hq.sinajs.cn/list=hf_I0`) para minério I0.
3. Yahoo chart API (`query1.finance.yahoo.com`) como fallback.
4. Stooq diário (`stooq.com`) como fallback adicional.

Se uma fonte falhar, o script tenta automaticamente a próxima fonte do ativo e registra `source_used`.

### Notas de mapeamento de símbolos

Os códigos variam entre provedores. Exemplos no `config/assets.json`:
- `VALE.K` (lista do usuário) → Yahoo `VALE`, Stooq `vale.us`
- `.OSEAX` → Yahoo `OSEAX.OL`
- `.SSEC` → Yahoo `000001.SS`
- `.SZI` → Yahoo `399001.SZ`
- `SOXX.O` → Yahoo `SOXX`
- `MINERIO_SINA` usa Sina (`hf_I0`) e fallback Yahoo `TIO=F`/Stooq `tio.f`

## Executar localmente

```bash
python scripts/update_assets.py
```

Depois abra `dashboard/index.html` (ou publique via GitHub Pages).

## Agendamento (5 em 5 minutos)

Workflow: `.github/workflows/update-assets.yml`

- roda a cada 5 minutos (`*/5 * * * *`)
- executa `python scripts/update_assets.py`
- commita somente quando `data/*.json` mudar

## Dashboard / GitHub Pages

1. Ative GitHub Pages em `Settings > Pages` (branch `main`, pasta root).
2. Acesse `https://<owner>.github.io/<repo>/dashboard/`.

## Como adicionar/editar ativos

Edite `config/assets.json` em `assets[]`:
- `symbol`, `display_name`, `group`
- `line_memberships` (`blue`, `red`, `green`)
- `preferred_sources` (ordem de fallback)
- `source_symbols` (ticker por provedor)
- `parsing_hints` (ajuda para parsing em páginas HTML)

## Qualidade

Teste rápido de validação:

```bash
python -m unittest -q
```
