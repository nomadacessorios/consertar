-- Corrigir a função prevent_store_reassignment para ter search_path seguro
DROP FUNCTION IF EXISTS prevent_store_reassignment() CASCADE;

CREATE OR REPLACE FUNCTION prevent_store_reassignment()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o store_id já existia e está sendo alterado (não é NULL para NULL ou NULL para valor)
  IF OLD.store_id IS NOT NULL AND NEW.store_id IS NOT NULL AND OLD.store_id != NEW.store_id THEN
    RAISE EXCEPTION 'Usuário já está vinculado a uma loja e não pode ser reatribuído. store_id não pode ser alterado.';
  END IF;
  RETURN NEW;
END;
$$;

-- Recriar o trigger
DROP TRIGGER IF EXISTS check_store_reassignment ON profiles;
CREATE TRIGGER check_store_reassignment
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_store_reassignment();