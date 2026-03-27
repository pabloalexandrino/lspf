-- Rename custo_extra to custo_sessao and add custo_agape
ALTER TABLE sessoes
  RENAME COLUMN custo_extra TO custo_sessao;

ALTER TABLE sessoes
  RENAME COLUMN custo_extra_descricao TO custo_sessao_descricao;

ALTER TABLE sessoes
  ADD COLUMN custo_agape numeric(10,2) DEFAULT 0,
  ADD COLUMN custo_agape_descricao text;
