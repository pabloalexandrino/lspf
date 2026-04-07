-- Fix: wallet credit must only count deposits and compensations.
--
-- Previously, ALL pago=true lancamentos were summed as wallet credit, which
-- incorrectly included cash payments like mensalidades, sessoes paid in cash, etc.
-- The wallet balance is formed exclusively by:
--   - tipo='deposito'  → money added to the member's prepaid wallet
--   - tipo='compensacao' → negative entries that reduce the wallet when debts are settled

CREATE OR REPLACE FUNCTION usar_credito_wallet(
  p_member_id     uuid,
  p_lancamento_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lancamento        RECORD;
  v_total_selecionado NUMERIC := 0;
  v_available_credit  NUMERIC := 0;
BEGIN
  -- 1. Validate that at least one lancamento was provided
  IF array_length(p_lancamento_ids, 1) IS NULL OR array_length(p_lancamento_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Nenhum lançamento selecionado';
  END IF;

  -- 2 & 3. Fetch lancamentos and validate ownership + status
  FOR v_lancamento IN
    SELECT id, valor, member_id, pago, compensado
    FROM lancamentos
    WHERE id = ANY(p_lancamento_ids)
  LOOP
    IF v_lancamento.member_id <> p_member_id THEN
      RAISE EXCEPTION 'Lançamentos inválidos';
    END IF;
    IF v_lancamento.pago = true THEN
      RAISE EXCEPTION 'Lançamento já está pago';
    END IF;
    IF v_lancamento.compensado = true THEN
      RAISE EXCEPTION 'Lançamento já foi compensado';
    END IF;
    v_total_selecionado := v_total_selecionado + v_lancamento.valor;
  END LOOP;

  -- 4. Wallet balance = sum of deposits and compensations only (pago=true).
  --    Excludes cash payments like mensalidade that go to the loja's caixa.
  SELECT COALESCE(SUM(valor), 0)
    INTO v_available_credit
    FROM lancamentos
   WHERE member_id = p_member_id
     AND pago = true
     AND tipo IN ('deposito', 'compensacao');

  -- 5. Validate sufficient credit
  IF v_available_credit < v_total_selecionado THEN
    RAISE EXCEPTION 'Crédito insuficiente';
  END IF;

  -- 6. Mark selected lancamentos as compensated
  UPDATE lancamentos
     SET compensado = true
   WHERE id = ANY(p_lancamento_ids);

  -- 7. Insert a single compensation lancamento (negative valor, pago=true)
  INSERT INTO lancamentos (member_id, sessao_id, tipo, valor, pago, compensado, descricao, caixa_id, data_pagamento)
  VALUES (
    p_member_id,
    NULL,
    'compensacao',
    -v_total_selecionado,
    true,
    false,
    'Compensação manual de crédito em carteira',
    NULL,
    CURRENT_DATE
  );

  RETURN json_build_object('success', true);
END;
$$;
