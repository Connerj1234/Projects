import tempfile, unittest
from pathlib import Path
from morning_brief.dashboard import action_card, weather_card, write_archive, render_dashboard, render_sports_groups, refresh_archive_navigation
from morning_brief.sources.weather import simplify_periods
from morning_brief.prioritization import build_actions
class Changes(unittest.TestCase):
 def test_missing_link(self):
  self.assertNotIn('Details',action_card({'link':'javascript:alert(1)'}))
 def test_market_link(self):
  actions=build_actions({'market_watchlist':[{'symbol':'^GSPC','change_percent':3}]},'2026-10-18',2)
  self.assertIn('%5EGSPC',actions[0]['link'])
 def test_weather_link(self):
  actions=build_actions({'weather':[{'alerts':[{'source_url':'https://api.weather.gov/alerts/example'}]}]},'2026-10-18',2)
  self.assertIn('href="https://api.weather.gov/alerts/example"',action_card(actions[0]))
 def test_weather(self):
  periods=simplify_periods([{'name':'Tonight','isDaytime':False,'temperature':42,'temperatureUnit':'F','probabilityOfPrecipitation':{'value':0},'windSpeed':'5 mph','windDirection':'N','detailedForecast':'Clear < skies'}])
  result=weather_card({'forecast_periods':periods})
  for value in ['Low </span>42°F','Precipitation: 0%','Wind: 5 mph N']:
   self.assertIn(value,result)
  self.assertNotIn('Clear &lt; skies',result)
  self.assertNotIn('Precipitation:',weather_card({'forecast_periods':[{'name':'Today'}]}))
 def test_archive(self):
  with tempfile.TemporaryDirectory() as d:
   write_archive(Path(d),['2026-10-18','2026-08-01','bad'])
   page=(Path(d)/'archive.html').read_text()
   self.assertIn('2026-08-01.html',page)
   self.assertIn('October 2026',page)
   self.assertNotIn('bad.html',page)
 def test_highlights_limit_and_header(self):
  page=render_dashboard({}, {'actions':[{'title':f'Highlight {i}'} for i in range(6)]}, [], None)
  self.assertEqual(page.count('<article class="card action '),4)
  self.assertNotIn('YOUR DAILY BRIEF',page)
  self.assertNotIn('<select',page)
  self.assertIn('class="archive-button" href="archive.html"',page)
 def test_weather_keeps_extended_periods_collapsed(self):
  result=weather_card({'location':'Atlanta','forecast_periods':[{'name':name,'temperature':60} for name in ['Today','Tonight','Friday','Friday Night']]})
  visible,extended=result.split('<details',1)
  self.assertIn('Today',visible)
  self.assertNotIn('Friday',visible)
  self.assertIn('Friday',extended)
  self.assertNotIn(' open',extended)
if __name__=='__main__':unittest.main()


class SportsExpansionTests(unittest.TestCase):
    def event(self, name, date, followed_team="Champions League"):
        return {"event": name, "starts_at": date, "followed_team": followed_team, "sport_path": "soccer/league"}

    def test_followed_team_stays_visible_ahead_of_earlier_major_events(self):
        games = [self.event(f"European game {i}", f"2026-10-2{i}T12:00:00Z") for i in range(4)]
        games.append(self.event("Atlanta United match", "2026-10-25T20:00:00Z", "Atlanta United"))
        result = render_sports_groups(games, followed_teams={"Atlanta United"})
        visible, _, expanded = result.partition('<details class="sports-more">')
        self.assertIn("Atlanta United match", visible)
        self.assertEqual(visible.count('<article class="card">'), 3)
        self.assertEqual(expanded.count('<article class="card">'), 2)
        self.assertIn("European game 3", expanded)
        self.assertIn("Show all 5 events", result)
        self.assertIn("Show fewer events", result)

    def test_no_counter_or_expansion_when_everything_fits(self):
        for count in (1, 3):
            result = render_sports_groups([self.event(f"Game {i}", f"2026-10-2{i}T12:00:00Z") for i in range(count)])
            self.assertNotIn("upcoming", result)
            self.assertNotIn("sports-more", result)

    def test_same_event_from_team_and_league_is_shown_once(self):
        followed = self.event("Atlanta match", "2026-10-25T20:00:00Z", "Atlanta United")
        major = {**followed, "followed_team": "MLS Playoffs"}
        result = render_sports_groups([major, followed], followed_teams={"Atlanta United"})
        self.assertEqual(result.count("Atlanta match"), 1)
        self.assertIn("Atlanta United", result)


class ArchivedSportsTests(unittest.TestCase):
    def test_updates_saved_events_without_replacing_other_sections(self):
        import json
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            page = root / "2026-10-12.html"
            page.write_text('<html><head></head><body><header class="hero">Old navigation</header><main><div class="sport-groups"><section><div>Old sports</div></section></div><section>Original market data</section></main></body></html>')
            games = [{"event": f"Saved match {i}", "starts_at": f"2026-10-{12+i}T20:00:00Z", "sport_path": "soccer/league"} for i in range(5)]
            (root / "2026-10-12-facts.json").write_text(json.dumps({"sports": {"followed_teams": games, "major_events": []}}))
            refresh_archive_navigation(root, "2026-10-19")
            result = page.read_text()
            self.assertIn("Show all 5 events", result)
            self.assertEqual(result.count("Saved match"), 5)
            self.assertIn("Original market data", result)
            self.assertNotIn("Old sports", result)
            self.assertIn("Latest brief", result)


class HighlightDeduplicationTests(unittest.TestCase):
    def test_lead_is_not_repeated_and_next_highlight_fills_its_slot(self):
        lead = {"title": "Main regional alert", "link": "https://example.com/main"}
        others = [{"title": f"Other highlight {i}", "link": f"https://example.com/{i}"} for i in range(5)]
        page = render_dashboard({}, {"one_thing": lead, "actions": [lead, *others]}, [], None)
        self.assertEqual(page.count("Main regional alert"), 1)
        self.assertEqual(page.count('<article class="card action '), 4)
        self.assertIn("Other highlight 3", page)
        self.assertNotIn("Other highlight 4", page)

    def test_only_lead_does_not_claim_no_urgent_items(self):
        lead = {"title": "Urgent alert", "link": "https://example.com/main"}
        page = render_dashboard({}, {"one_thing": lead, "actions": [lead]}, [], None)
        self.assertIn("No additional highlights this morning.", page)
        self.assertNotIn("Nothing urgent was detected", page)
