import importlib.util, json, pathlib, tempfile, unittest
P=pathlib.Path(__file__).parents[1]/"comparator"/"compare-security-catalog-v1.0.0.py"
S=importlib.util.spec_from_file_location("cmp",P); M=importlib.util.module_from_spec(S); S.loader.exec_module(M)
class ComparatorTests(unittest.TestCase):
 def setUp(self): self.expected={"functions":[{"identity":"public.f()","owner":"postgres","security_mode":"DEFINER","definition_md5":"0"*32,"expected_execute_roles":["postgres"]}]}
 def test_exact_match(self):
  observed={"functions":[{"identity":"public.f()","owner":"postgres","security_mode":"DEFINER","definition_md5":"0"*32,"execute_roles":["postgres"]}]}; self.assertEqual([],M.compare(self.expected,observed))
 def test_unexpected_anon_fails(self):
  observed={"functions":[{"identity":"public.f()","owner":"postgres","security_mode":"DEFINER","definition_md5":"0"*32,"execute_roles":["anon","postgres"]}]}; self.assertEqual("execute_roles",M.compare(self.expected,observed)[0]["field"])
 def test_definition_drift_fails(self):
  observed={"functions":[{"identity":"public.f()","owner":"postgres","security_mode":"DEFINER","definition_md5":"1"*32,"execute_roles":["postgres"]}]}; self.assertTrue(M.compare(self.expected,observed))
 def test_missing_and_unexpected_fail(self): self.assertEqual("MISSING_FUNCTION",M.compare(self.expected,{"functions":[]})[0]["kind"])
if __name__=="__main__": unittest.main()
