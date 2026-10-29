CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number integer NOT NULL UNIQUE,
  date date NOT NULL,
  value numeric(12,2) NOT NULL CHECK (value > 0),
  description text NOT NULL DEFAULT '',
  payer_type text NOT NULL DEFAULT 'juridica' CHECK (payer_type IN ('juridica', 'fisica')),
  payer_name text NOT NULL DEFAULT '',
  payer_cnpj text,
  payer_cpf text,
  payer_address text,
  recipient_name text NOT NULL DEFAULT '',
  recipient_cnpj text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.receipts(date);

-- Accessed only through the service role from the API routes.
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Emitente padrão (antigo config.json do recibo2pdf)
INSERT INTO public.settings (key, value, description)
VALUES
  ('receipt_recipient_name', '53.363.055 GRASIELE DA SILVA DOS SANTOS', 'Recibos: nome do emitente'),
  ('receipt_recipient_cnpj', '53.363.055/0001-22', 'Recibos: CNPJ/CPF do emitente')
ON CONFLICT (key) DO NOTHING;
