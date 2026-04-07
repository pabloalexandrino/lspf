-- Fix: usar_credito_wallet available credit calculation
--
-- Old logic: v_available_credit = sum(pago=true) - sum(!pago && !compensado)
-- This incorrectly subtracted ALL pending debits from the wallet balance, making it
-- impossible to compensate a large debt even when the wallet had enough gross balance.
--
-- New logic: v_available_credit = sum(pago=true)
-- The wallet balance is the gross sum of all pago=true entries (deposits are positive,
-- previously applied compensacoes are negative). Pending debts are not yet deducted
-- from the wallet — they represent future obligations, not current cash outflows.

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
    -- Validate ownership
    IF v_lancamento.member_id <> p_member_id THEN
      RAISE EXCEPTION 'Lançamentos inválidos';
    END IF;

    -- Validate not already paid
    IF v_lancamento.pago = true THEN
      RAISE EXCEPTION 'Lançamento já está pago';
    END IF;

    -- Validate not already compensated
    IF v_lancamento.compensado = true THEN
      RAISE EXCEPTION 'Lançamento já foi compensado';
    END IF;

    -- Accumulate total selected
    v_total_selecionado := v_total_selecionado + v_lancamento.valor;
  END LOOP;

  -- 4. Calculate gross wallet balance:
  --    SUM of all pago=true lancamentos (deposits are positive, compensacoes are negative).
  --    Pending debits are NOT subtracted — they haven't been drawn from the wallet yet.
  SELECT COALESCE(SUM(valor), 0)
    INTO v_available_credit
    FROM lancamentos
   WHERE member_id = p_member_id
     AND pago = true;

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

  -- 8. Return success
  RETURN json_build_object('success', true);
END;
$$;
