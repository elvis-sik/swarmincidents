import copy,unittest
import feed,publication

class HistoricalSources(unittest.TestCase):
    def setUp(self):
        self.source=['Response report','Agency','https://agency.example/report']
        self.response=dict(id='response',inc=['incident'],src=[self.source])
        self.catalog=dict(incidents=[dict(id='incident',sources=[])],responses=[])
        self.update=dict(id='historical',incident='incident',type='Correction',published='2026-09-29T13:18:46-07:00',title='Correction',summary='Historical correction',source=self.source[2],publisher=self.source[1],changes=[dict(path=['responses','response'],before_exists=False,before=None,after_exists=True,after=self.response)],history=dict(reconstructed=True))
    def test_historical_response_source_remains_readable_after_removal(self):
        publication.check_update(self.update,self.catalog,legacy=True)
        rendered=feed.render(self.catalog,{'updates':[self.update]})
        self.assertIn(b'Reconstructed site history',rendered)
    def test_unrelated_response_cannot_supply_a_source(self):
        self.response['inc']=['other']
        with self.assertRaises(ValueError):publication.check_update(self.update,self.catalog,legacy=True)
        with self.assertRaises(ValueError):feed.render(self.catalog,{'updates':[self.update]})
    def test_unknown_and_unsafe_sources_remain_rejected(self):
        for source in ['https://unknown.example/report','javascript:alert(1)']:
            update=copy.deepcopy(self.update);update['source']=source
            with self.assertRaises(ValueError):publication.check_update(update,self.catalog,legacy=True)
            with self.assertRaises(ValueError):feed.render(self.catalog,{'updates':[update]})
    def test_dataset_landing_page_is_a_valid_evidence_resource(self):
        self.catalog['incidents'][0]['datasets']=[dict(url=self.source[2])]
        self.update['changes']=[]
        publication.check_update(self.update,self.catalog,legacy=True)
        feed.render(self.catalog,{'updates':[self.update]})

class HistoricalMigration(unittest.TestCase):
    def setUp(self):
        self.catalog=dict(updated='2026-10-14',incidents=[dict(id='incident',sources=[['Report','Publisher','https://publisher.example/report']])],responses=[],affected=[])
        self.update=dict(id='history-one',incident='incident',type='New incident',published='2026-09-28T19:41:28-07:00',title='Old listing',summary='Retrospective',source='https://publisher.example/report',publisher='Publisher',freshness='archive',changes=[dict(path=['incidents','incident'],before_exists=False,before=None,after_exists=True,after=self.catalog['incidents'][0])],history=dict(kind='git',reconstructed=True,commit='a'*40))
        self.manifest=dict(review_status='curator-reviewed',ids=['history-one'],entries_sha256=publication.digest([self.update]))
        self.journal=dict(schema_version=1,baseline=dict(catalog_sha256=publication.digest(self.catalog),updates=[self.update]),publications=[],historical_import=self.manifest)
    def check(self):publication.check_transition(self.catalog,self.catalog,None,self.journal,{'updates':[]})
    def test_reviewed_manifest_allows_only_the_exact_history_import(self):
        self.check()
        self.update['summary']='Changed after review'
        with self.assertRaisesRegex(ValueError,'differs from'):self.check()
    def test_drafts_and_unlisted_imports_stay_blocked(self):
        self.manifest['review_status']='draft-awaiting-curator'
        with self.assertRaisesRegex(ValueError,'curator review'):self.check()
        self.manifest['review_status']='curator-reviewed';self.manifest['ids']=[]
        with self.assertRaisesRegex(ValueError,'enumerate'):self.check()
    def test_future_or_unproven_history_stays_blocked(self):
        for mutate in [lambda:self.update.update(published='2026-10-16T00:00:00-07:00'),lambda:self.update['history'].update(commit='not-a-commit')]:
            mutate();self.manifest['entries_sha256']=publication.digest([self.update])
            with self.assertRaises(ValueError):self.check()
