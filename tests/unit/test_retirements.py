import unittest
from catalog_history import retired_incidents

class RetirementPermalinks(unittest.TestCase):
    def setUp(self):
        self.removal = dict(path=['incidents', 'old'], before_exists=True, after_exists=False)
        self.update = dict(id='retirement', incident='old', changes=[self.removal])
    def test_only_journaled_retirements_resolve(self):
        self.assertEqual(retired_incidents({'incidents':[]}, {'updates':[self.update]}), {'old':'retirement'})
        self.assertEqual(retired_incidents({'incidents':[{'id':'old'}]}, {'updates':[self.update]}), {})
        self.assertEqual(retired_incidents({'incidents':[]}, {'updates':[dict(self.update,changes=[])]}), {})
    def test_newest_retirement_wins_and_unrelated_changes_do_not_retire(self):
        older = dict(self.update,id='older')
        self.assertEqual(retired_incidents({'incidents':[]}, {'updates':[self.update,older]}), {'old':'retirement'})
        for path in [['responses','old'], ['incidents','different']]:
            self.assertEqual(retired_incidents({'incidents':[]}, {'updates':[dict(self.update,changes=[dict(self.removal,path=path)])]}), {})
