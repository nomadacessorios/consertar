-- Adicionar restrição para impedir reatribuição de usuários entre lojas
-- Um usuário só pode ser vinculado a uma loja e não pode ser reatribuído

-- Criar função para validar que store_id não pode ser alterado uma vez definido
CREATE OR REPLACE FUNCTION prevent_store_reassignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o store_id já existia e está sendo alterado (não é NULL para NULL ou NULL para valor)
  IF OLD.store_id IS NOT NULL AND NEW.store_id IS NOT NULL AND OLD.store_id != NEW.store_id THEN
    RAISE EXCEPTION 'Usuário já está vinculado a uma loja e não pode ser reatribuído. store_id não pode ser alterado.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para aplicar a validação
CREATE TRIGGER check_store_reassignment
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_store_reassignment();