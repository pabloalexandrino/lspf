INSERT INTO lancamentos
  (member_id, caixa_id, sessao_id, tipo, descricao, valor, pago, data_pagamento)
VALUES (
  (SELECT id FROM members WHERE nome ILIKE '%Andrey%' LIMIT 1),
  (SELECT id FROM caixas WHERE nome = 'Bar da Sabedoria' LIMIT 1),
  (SELECT id FROM sessoes WHERE data = '2026-03-10' LIMIT 1),
  'saida_caixa',
  'Reembolso ágape 10/03 - pago antecipadamente por Andrey',
  535.93, true, '2026-03-13'
);
