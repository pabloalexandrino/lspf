-- Function: usar_credito_wallet
-- Compensates selected lancamentos using the member's existing wallet credit.
-- All operations run inside a single transaction (plpgsql implicit transaction block).
-- SECURITY DEFINER so the function runs with the privileges of the owner,
-- allowing RLS-bypass for the internal compensation logic.

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
  v_total_credito     NUMERIC := 0;
  v_total_pendente    NUMERIC := 0;
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

  -- 4. total_selecionado already computed in the loop above

  -- 5. Calculate available credit
  -- Credit = SUM of all pago=true lancamentos (includes negative compensações and positive deposits)
  SELECT COALESCE(SUM(valor), 0)
    INTO v_total_credito
    FROM lancamentos
   WHERE member_id = p_member_id
     AND pago = true;

  -- Pending = SUM of all unpaid and uncompensated debits
  SELECT COALESCE(SUM(valor), 0)
    INTO v_total_pendente
    FROM lancamentos
   WHERE member_id = p_member_id
     AND pago = false
     AND compensado = false;

  v_available_credit := v_total_credito - v_total_pendente;

  -- 6. Validate sufficient credit
  IF v_available_credit < v_total_selecionado THEN
    RAISE EXCEPTION 'Crédito insuficiente';
  END IF;

  -- 7. Mark selected lancamentos as compensated
  UPDATE lancamentos
     SET compensado = true
   WHERE id = ANY(p_lancamento_ids);

  -- 8. Insert a single compensation lancamento (negative valor, pago=true → does not count as caixa entry)
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

  -- 9. Return success
  RETURN json_build_object('success', true);
END;
$$;
