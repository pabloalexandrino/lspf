-- Add compensado flag: distinguishes "covered by credit" from "pending payment"
ALTER TABLE lancamentos
  ADD COLUMN compensado boolean NOT NULL DEFAULT false;

-- Extend tipo check constraint to include 'compensacao'
ALTER TABLE lancamentos
  DROP CONSTRAINT IF EXISTS lancamentos_tipo_check;

ALTER TABLE lancamentos
  ADD CONSTRAINT lancamentos_tipo_check
  CHECK (tipo IN (
    'sessao', 'agape', 'produto',
    'mensalidade', 'oferta',
    'deposito', 'outro', 'saida_caixa',
    'compensacao'
  ));
