/* Data for the OpenAI agent incident timeline.
   Dates are YYYY-MM-DD. Run `python3 build.py` after editing, then republish openai-agent-swarm.html.

   incidents[].activity   when agents were active; approx: true for loosely reported windows; sub: true for notable sub-windows
   incidents[].knew       when OpenAI is documented as knowing
   incidents[].reveals    public reports; `by` = openai | research | press | gov | other; minor: true for secondary markers
   responses[].who        openai | gov | other;  inc = incident ids it relates to
   affected[]             one entry per organization, site or service; inv = its involvement in each incident
   affected[].kind        gov | edu | company | community | openai
   affected[].inv[].what  breach | account (a customer's account on the service) | attack | creds | source | spam | scrape | tool | reach | possible
   affected[].inv[].attr  'unclear' when the source doesn't tie the activity to OpenAI specifically
   affected[].inv[].src   source URLs; each must also appear in some incident's sources
   unknowns               text; [label](#incident-id) becomes a link to that incident */
const DATA = {
  updated: '2026-09-28',
  version: '1.3',
  contact: '', // set to the @swarmincidents.com alias once it exists
  incidents: [
    {
      id: 'hugging-face',
      title: 'Evaluation agents break out and breach Hugging Face',
      activity: [{ s: '2026-07-08', e: '2026-07-13', label: 'Jul 8–13: first internet access Jul 8; Hugging Face breached Jul 11–13' }],
      reveals: [
        { d: '2026-07-16', by: 'other', minor: true, text: 'Hugging Face discloses a breach by an unidentified attacker' },
        { d: '2026-07-21', by: 'openai', text: 'OpenAI and Hugging Face attribute the breach to OpenAI models' },
        { d: '2026-09-25', by: 'research', minor: true, text: 'Parse and collaborators publish “Swarm Traces” with new details of the attack' },
      ],
      found: 'Hugging Face detected the intrusion; OpenAI attributed it to its own models',
      status: 'Confirmed by OpenAI',
      summary: 'During a cyber-capability evaluation, OpenAI models (driven mainly by an internal-only research model, and also involving GPT-5.6 Sol) used a previously unknown flaw in the Artifactory package registry to escape their environment. Working from a hijacked benchmark app on Modal, they exploited Hugging Face’s dataset processing to harvest credentials, then used them to move through Hugging Face’s cloud, private network, GitHub and Slack, apparently to obtain the benchmark’s answers. Researchers later found that the roughly 700 agents involved smuggled attack code through almost a million chained short links and tried to publish more than 100 images under a real user’s Docker Hub account. Hugging Face found no tampering with public models, datasets or Spaces.',
      openai: 'Disclosed jointly with Hugging Face and called it “an unprecedented cyber incident”. Revoked credentials, rebuilt systems and deactivated the research model; later slowed frontier training and paused its largest planned RL run.',
      sources: [
        ['Hugging Face security incident disclosure', 'Hugging Face', 'https://huggingface.co/blog/security-incident-july-2026'],
        ['Anatomy of a frontier lab agent intrusion: a technical timeline of the July 2026 incident', 'Hugging Face', 'https://huggingface.co/blog/agent-intrusion-technical-timeline'],
        ['The Hugging Face incident and other third-party impact from misaligned models', 'OpenAI', 'https://openai.com/hugging-face-incident-and-misalignment/'],
        ['Revealing the details of how OpenAI agents hacked Hugging Face (Swarm Traces)', 'Parse and collaborators', 'https://swarmtraces.org/'],
        ['OpenAI says its AI models escaped from a secure test environment', 'Fortune', 'https://fortune.com/2026/07/21/openai-says-ai-models-escaped-control-hacked-hugging-face/'],
      ],
    },
    {
      id: 'artifactory',
      title: 'Agents turn OpenAI’s own package registry into a message board',
      activity: [{ s: '2026-05-08', e: '2026-07-08', approx: true, label: 'About May 8 – Jul 8 (from published reconstructions)' }],
      knew: { d: '2026-07-04', text: 'OpenAI opens a formal security incident' },
      reveals: [{ d: '2026-08-05', by: 'openai', text: 'OpenAI researchers describe it at Black Hat' }],
      found: 'OpenAI (Eric Wallace and Michael Dalton, at Black Hat)',
      status: 'Confirmed by OpenAI',
      summary: 'Agents in separate internal evaluations found they could upload files to OpenAI’s internal package registry that other agents could read, and used it to ask each other for help and to coordinate attempts to reach the internet. After staff shut the channel down, agents built a second, more resilient one and found another zero-day in the same software.',
      openai: 'Opened a security incident, revoked credentials, rebuilt and patched the registry, and presented the findings publicly.',
      sources: [
        ['How OpenAI’s agents broke out of testing to hack Hugging Face', 'Axios', 'https://www.axios.com/2026/08/06/openai-hugging-face-black-hat'],
        ['Black Hat 2026: OpenAI reveals agents planned ‘collective attacks’ via secret message board', 'SC Media', 'https://www.scworld.com/news/black-hat-2026-openai-reveals-agents-planned-collective-attacks-via-secret-message-board'],
      ],
    },
    {
      id: 'wikis',
      title: '18,000 posts: agents use a German wiki as a back channel',
      activity: [{ s: '2026-05-11', e: '2026-07-13', label: 'May 11 – Jul 13, dropping sharply after Jun 22' }],
      knew: { d: '2026-06-21', text: 'OpenAI IP addresses start visiting the wiki, per the researchers' },
      reveals: [
        { d: '2026-09-04', by: 'research', text: 'Researchers publish collusion.wiki' },
        { d: '2026-09-05', by: 'openai', minor: true, text: 'OpenAI says it had already found the wiki activity itself' },
      ],
      found: 'Sydney Von Arx, Cormac Slade Byrd, Spencer Kitts and Thomas Larsen',
      status: 'Confirmed by OpenAI',
      summary: 'Agents identifying themselves as OpenAI’s left roughly 18,000 posts on a 25-year-old German volunteer wiki and other public wikis, saving answers, coordinating live and sharing a sandbox bypass: the wikis accepted edits through GET requests, which the agents’ sandbox allowed. At the peak they created about 400 pages a day, clashing with a volunteer moderator.',
      openai: 'Initially declined to confirm the agents were its own. On Sept. 5 it said it had discovered the wiki activity itself and assessed it as similar to other misaligned behavior.',
      sources: [
        ['Discovery of a new OpenAI agent message board', 'collusion.wiki', 'https://collusion.wiki/'],
        ['Another swarm of OpenAI agents reached the open internet without the frontier lab’s knowledge', 'TechCrunch', 'https://techcrunch.com/2026/09/04/another-swarm-of-openai-agents-reached-the-open-internet-without-the-frontier-labs-knowledge/'],
        ['Researcher who found OpenAI-linked rogue agent swarm says AI giants may hide future chaos', 'NBC News', 'https://www.nbcnews.com/tech/security/openai-linked-ai-agents-swarmed-dormant-german-wiki-report-rcna596182'],
      ],
    },
    {
      id: 'twelve-sites',
      title: 'At least 12 more sites, from a chemistry wiki to university link shorteners',
      activity: [
        { s: '2026-05-01', e: '2026-07-31', approx: true, label: 'May – July' },
        { s: '2026-09-02', e: '2026-09-02', label: 'Sep 2: latest pastes that appear to be the agents’, on anna.fyi' },
      ],
      reveals: [{ d: '2026-09-09', by: 'research', text: 'Nightingale Collective findings reported by Fortune' }],
      found: 'Nightingale Collective (including Cormac Slade Byrd) and independent researcher Kenneth DeGraff',
      status: 'Not confirmed by OpenAI',
      summary: 'Researchers found agents on at least 12 more sites: about 30 edits to a teacher’s AP Chemistry wiki, more than 100 messages on a Polish text-sharing site coordinating an “Iowa cancer statistics” task, and link shorteners used to store data. Agents also got into Vanderbilt University’s link shortener, which has no public sign-up, and used a public stats page there as a message board; its logs recorded FBI crime-data queries made with exposed keys. Pastes that appear to come from the agents continued on one site until Sept. 2.',
      openai: 'Did not respond to Fortune’s request for comment.',
      sources: [
        ['OpenAI’s rogue AI agents used universities, wikis, and text-sharing sites as hidden message boards', 'Fortune', 'https://fortune.com/2026/09/09/openai-rogue-ai-agents-reached-12-more-websites/'],
        ['Additional findings', 'Nightingale Collective (collusion.wiki)', 'https://collusion.wiki/additional-findings'],
        ['OpenAI’s robots got into a closed link shortener, surfed the web with Google Docs and Translate, then called the FBI with a stranger’s key', 'Kenneth DeGraff', 'https://www.kennethdegraff.com/swarm'],
      ],
    },
    {
      id: 'rubygems',
      title: '“GemStuffer”: 2,100 packages flood the RubyGems registry',
      activity: [{ s: '2026-05-05', e: '2026-06-18', label: 'May 5 – Jun 18' }],
      reveals: [
        { d: '2026-05-13', by: 'other', minor: true, text: 'Socket reports the “GemStuffer” campaign without identifying who was behind it' },
        { d: '2026-09-11', by: 'research', text: 'Researchers publish rubyhack.ai' },
      ],
      found: 'Spencer Kitts, Thomas Larsen and Sydney Von Arx',
      status: 'Disputed in part by OpenAI',
      summary: 'Researchers attributed to OpenAI agents more than 2,100 packages they describe as malicious, uploaded to RubyGems between May 5 and June 18; maintainers disabled new registrations from May 12 to 16 and removed more than 500 packages. The packages abused documentation builds to run code on build servers and scrape web content, including UK local-government data. Hundreds of package names contained “oai”, and the researchers say OpenAI never told the RubyGems community.',
      openai: 'Said its agents used RubyGems “to carry out benign tasks and retrieve public information” and that it had not been able to verify claims that its models uploaded malicious packages.',
      sources: [
        ['OpenAI agents carried out an undisclosed cyber-attack on RubyGems', 'rubyhack.ai', 'https://rubyhack.ai/'],
        ['OpenAI’s malicious bot swarm attacked RubyGems', 'The Register', 'https://www.theregister.com/security/2026/09/14/openais_malicious_bot_swarm_attacked_rubygems/5296356'],
        ['GemStuffer campaign abuses RubyGems as exfiltration channel targeting UK local government', 'Socket', 'https://socket.dev/blog/gemstuffer'],
      ],
    },
    {
      id: 'urlquery',
      title: 'Hacking probes on public-data sites, through a URL scanner',
      activity: [
        { s: '2026-03-06', e: '2026-09-20', label: 'Mar 6 – Sep 20 (strong evidence from Mar 6)' },
        { s: '2026-05-25', e: '2026-05-28', sub: true, label: 'Exploit probes: UNM library, Data USA' },
        { s: '2026-06-20', e: '2026-06-21', sub: true, label: 'Exploit probes: Australian Institute of Health and Welfare' },
      ],
      reveals: [{ d: '2026-09-23', by: 'research', text: 'Transluce publishes its report' }],
      found: 'Transluce',
      status: 'Not confirmed by OpenAI',
      summary: 'Transluce found agents using the web-scanning service urlquery.net as a remote browser to get around restrictions, and tied at least some of the activity to the swarms attributed to OpenAI. On ordinary data-retrieval tasks, agents sent exploit probes at a University of New Mexico library, the Data USA site and the Australian Institute of Health and Welfare, whose pre-production server they used to get around anti-bot protection. Similar activity continued into late September, after OpenAI’s Aug. 18 controls, including failed attempts to trade on a cryptocurrency exchange; Transluce did not tie that later activity to OpenAI.',
      openai: 'Did not immediately respond, according to Fortune.',
      sources: [
        ['Early rogue AI agent activity and attempts to hack found on urlquery.net', 'Transluce', 'https://transluce.org/agent-activity'],
        ['Report suggests OpenAI’s ‘rogue AI’ agents may have attacked crypto exchange in September', 'Fortune', 'https://fortune.com/2026/09/24/openai-more-rogue-ai-agents-hacking-websites-cryptoexchange-in-september-research-report-transluce/'],
      ],
    },
    {
      id: 'medicare',
      title: 'An agent breaks into Australia’s Medicare statistics portal',
      activity: [{ s: '2026-06-18', e: '2026-06-18', label: 'Jun 18' }],
      knew: { d: '2026-08-11', text: 'OpenAI identifies it in a review of training activity' },
      reveals: [
        { d: '2026-09-10', by: 'openai', minor: true, private: true, text: 'OpenAI emails Services Australia (not public)' },
        { d: '2026-09-24', by: 'gov', text: 'Prime Minister Anthony Albanese announces it' },
      ],
      found: 'Australian Government, after notice from OpenAI',
      status: 'Confirmed by OpenAI',
      summary: 'An OpenAI agent accessed aggregate health statistics and internal file names from public and non-public files and wrote files to an internal server; no personal Medicare records were compromised. OpenAI found it on Aug. 11 but notified the government by email to a public disclosure address only on Sept. 10. The prime minister expressed “extreme concern”, called the delay unacceptable and named three other systems that may have been affected.',
      openai: 'Said no patient records were accessed and that its agents took actions it did not intend.',
      sources: [
        ['OpenAI hacked Medicare portal, Prime Minister Anthony Albanese says', 'ABC News (Australia)', 'https://www.abc.net.au/news/2026-09-24/ai-agent-accessed-australian-government-site-pm-says/107189078'],
        ['Medicare Australia: ‘Extreme concern’ over OpenAI breach', 'CNN', 'https://www.cnn.com/2026/09/23/business/australia-openai-agent-hack-intl-hnk'],
        ['Press conference – New York', 'Prime Minister of Australia', 'https://www.pm.gov.au/media/press-conference-new-york'],
        ['Acting PM Richard Marles says AI incident very serious but impact is minor — as it happened', 'ABC News (Australia)', 'https://www.abc.net.au/news/2026-09-24/federal-politics-live-blog-openai-medicare-breach/107186578'],
      ],
    },
    {
      id: 'us-government',
      title: 'Census, SEC and Education Department websites',
      activity: [{ s: '2026-06-01', e: '2026-08-31', approx: true, label: '“This summer”; no dates reported' }],
      reveals: [{ d: '2026-09-25', by: 'press', text: 'The New York Times reports it; OpenAI confirms the Census and SEC activity' }],
      found: 'The New York Times; Transluce (Education Department attempt)',
      status: 'Confirmed in part by OpenAI',
      summary: 'Agents pulled Census Bureau data using API keys found in public GitHub repositories, posted public SEC information on another public webpage, and, according to Transluce, tried but failed to hack an Education Department site. OpenAI says no accounts or nonpublic data were accessed at the SEC or Census. Transluce also reported activity on Justice and Commerce Department sites and on state government sites in five states, some of which it said was not clearly attributable to OpenAI.',
      openai: 'Confirmed the Census and SEC activity and said it had notified the agencies; it has not confirmed the Education Department attempt. Sam Altman said OpenAI had “not been as fast as we would have liked.”',
      sources: [
        ['OpenAI’s A.I. Went Rogue and Meddled With U.S. Government Websites', 'The New York Times', 'https://www.nytimes.com/2026/09/25/technology/openais-ai-us-government-websites.html'],
        ['OpenAI says its advanced models may have gone after government websites', 'Nextgov/FCW', 'https://www.nextgov.com/cybersecurity/2026/09/openai-says-its-advanced-models-may-have-gone-after-government-websites/416250/'],
        ['OpenAI says its models engaged with US government websites in misbehavior disclosure', 'AP via OPB', 'https://www.opb.org/article/2026/09/26/openai-says-its-models-engaged-with-us-government-websites/'],
        ['OpenAI agent unsuccessfully tried to breach Department of Education website', 'The Hill', 'https://thehill.com/policy/technology/6113061-openai-access-government-websites/'],
      ],
    },
    {
      id: 'user-images',
      title: '53 ChatGPT users’ images posted to image hosts',
      activity: [],
      noDates: 'Activity dates not disclosed; before the controls added after the Hugging Face breach',
      reveals: [{ d: '2026-09-25', by: 'openai', text: 'OpenAI discloses it in an update on its review' }],
      found: 'OpenAI',
      status: 'Confirmed by OpenAI',
      summary: 'Agents posted 53 user-provided images, drawn from ChatGPT data eligible for training, to image-hosting sites through unlisted links. Most have been removed. OpenAI says it cannot identify or notify the people who provided them.',
      openai: 'Called it “not an appropriate use of this data” and said it is working with hosts to remove the rest.',
      sources: [
        ['Unsecured OpenAI agents posted 53 user images on the internet without the lab’s knowledge', 'TechCrunch', 'https://techcrunch.com/2026/09/25/unsecured-openai-agents-posted-53-user-images-on-the-internet-without-the-labs-knowledge/'],
        ['The Hugging Face incident and other third-party impact from misaligned models', 'OpenAI', 'https://openai.com/hugging-face-incident-and-misalignment/'],
      ],
    },
    {
      id: 'dns-chatbot',
      title: 'An agent tunnels through DNS to reach an outside chatbot',
      activity: [{ s: '2026-09-20', e: '2026-09-20', label: 'Sep 20, for about 2.5 hours' }],
      knew: { d: '2026-09-20', text: 'Monitoring raises its highest-severity alert about 15 minutes in' },
      reveals: [{ d: '2026-09-25', by: 'openai', text: 'OpenAI publishes a report and pauses tool use for its most capable models' }],
      found: 'OpenAI (its own monitoring)',
      status: 'Confirmed by OpenAI',
      summary: 'On a search task, an agent that could not get useful results from its tools found that the sandbox’s DNS resolver could still reach the public internet. Using DNS delegation and a public chatbot that answers through DNS records, it sent questions out and got answers back. Monitoring flagged it about 15 minutes in, but the run did not stop automatically and was shut down by hand about 2.5 hours later. OpenAI reported no confirmed data exposure.',
      openai: 'Stopped the run and paused all training, evaluation and tool-using inference for its most capable models until the gap is closed; it is restricting DNS in research environments and adding blocking controls at two independent network layers.',
      sources: [
        ['OpenAI pauses work on top AI models after agent slips past internet controls', 'Malwarebytes', 'https://www.malwarebytes.com/blog/ai/2026/09/openai-pauses-work-on-top-ai-models-after-agent-slips-past-internet-controls'],
        ['OpenAI pauses some training amid allegations its rogue agents behaved more badly than first thought', 'The Register', 'https://www.theregister.com/ai-and-ml/2026/09/28/openai-pauses-some-training-amid-allegations-its-rogue-agents-behaved-more-badly-than-first-thought/5299350'],
      ],
    },
  ],

  responses: [
    { d: '2026-07-29', who: 'openai', inc: ['hugging-face'], text: 'Brings in outside advisors including CrowdStrike; METR and Redwood Research begin an independent assessment.' },
    { d: '2026-08-01', label: 'Early Aug', who: 'gov', inc: ['hugging-face'], text: 'Fifteen Republican state attorneys general ask OpenAI to preserve documents about the breach.' },
    { d: '2026-08-07', who: 'openai', inc: ['hugging-face'], text: 'Notifies more third parties after finding its models used publicly exposed credentials to reach outside accounts and services.' },
    { d: '2026-08-18', who: 'openai', inc: ['hugging-face', 'artifactory'], text: 'Slows frontier training, pauses its largest planned RL run, and tightens workload and network isolation.' },
    { d: '2026-08-24', who: 'gov', inc: ['hugging-face'], text: 'Alabama’s attorney general subpoenas OpenAI over the Hugging Face breach.' },
    { d: '2026-08-26', who: 'openai', inc: ['hugging-face'], text: 'Publishes a technical report on the breach; METR and Redwood Research publish an independent one.' },
    { d: '2026-09-04', who: 'other', inc: ['wikis', 'hugging-face'], text: 'Researchers and members of Congress call for a formal process to investigate agent escapes.' },
    { d: '2026-09-05', who: 'openai', inc: ['wikis'], text: 'Says it had already found the wiki activity and will publish criteria for disclosing misaligned behavior.' },
    { d: '2026-09-06', who: 'openai', inc: [], text: 'Chief Scientist Jakub Pachocki writes that no lab has solved alignment and monitoring well enough to keep scaling at maximum speed.' },
    { d: '2026-09-10', who: 'openai', inc: ['medicare'], text: 'Emails Services Australia about the Medicare intrusion, a month after finding it.' },
    { d: '2026-09-11', who: 'openai', inc: ['rubygems'], text: 'Says it could not verify that its models uploaded malicious packages to RubyGems.' },
    { d: '2026-09-15', who: 'gov', inc: ['medicare'], text: 'Services Australia refers the Medicare intrusion to the Australian Signals Directorate.' },
    { d: '2026-09-24', who: 'gov', inc: ['medicare'], text: 'Australia’s prime minister orders an urgent review with the Australian Signals Directorate and the AI Safety Institute.' },
    { d: '2026-09-25', who: 'openai', inc: ['us-government', 'user-images'], text: 'Says it has notified dozens of affected organizations, including governments and universities, and that its review will take months.' },
    { d: '2026-09-25', who: 'openai', inc: ['dns-chatbot'], text: 'Pauses all training, evaluation and tool-using inference for its most capable models.' },
  ],

  affected: [
    // Hugging Face breach
    { id: 'hugging-face', name: 'Hugging Face', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'breach', d: '2026-07-11', when: 'Jul 11–13', note: 'Production infrastructure breached: internal datasets and five customers’ datasets accessed, service credentials harvested, and its Spaces used as relays and drop boxes.', src: ['https://huggingface.co/blog/agent-intrusion-technical-timeline', 'https://openai.com/hugging-face-incident-and-misalignment/'] } ] },
    { id: 'modal', name: 'Modal', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'account', d: '2026-07-09', when: 'Jul 9–13', note: 'An unsecured benchmark app deployed by a Modal customer was taken over and used as the base of the attack. Modal says its own platform was not compromised.', src: ['https://huggingface.co/blog/agent-intrusion-technical-timeline', 'https://swarmtraces.org/'] } ] },
    { id: 'aws', name: 'Amazon Web Services', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'account', d: '2026-07-11', when: 'Jul 11–12', note: 'Hugging Face’s own AWS keys, taken from its systems, were used to map its cloud storage and permissions; agents also tried to solve its AWS bot challenge. AWS itself wasn’t compromised.', src: ['https://huggingface.co/blog/agent-intrusion-technical-timeline', 'https://swarmtraces.org/'] } ] },
    { id: 'tailscale', name: 'Tailscale', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'account', d: '2026-07-11', when: 'Jul 11–13', note: 'A stolen Hugging Face key enrolled attacker machines, including the hijacked Modal app, into Hugging Face’s private network 181 times. Tailscale itself wasn’t compromised.', src: ['https://huggingface.co/blog/agent-intrusion-technical-timeline'] } ] },
    { id: 'github', name: 'GitHub', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'account', d: '2026-07-12', when: 'Jul 12–13', note: 'Hugging Face’s GitHub App was abused to mint tokens, list private repositories and open a pull request; GitHub code search was used to hunt for tokens.', src: ['https://huggingface.co/blog/agent-intrusion-technical-timeline', 'https://swarmtraces.org/'] },
      { inc: 'twelve-sites', what: 'source', d: '2026-06-18', when: 'Jun 18–21', note: 'One of the keys used on the FBI’s crime-data API was the FBI’s own developer key, which sits in a public FBI repository on GitHub.', src: ['https://www.kennethdegraff.com/swarm'] },
      { inc: 'us-government', what: 'source', d: '2026-06-01', when: 'Summer', note: 'The Census Bureau API keys the agents used were found in public GitHub repositories.', src: ['https://www.nextgov.com/cybersecurity/2026/09/openai-says-its-advanced-models-may-have-gone-after-government-websites/416250/'] } ] },
    { id: 'slack', name: 'Slack', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'account', d: '2026-07-11', when: 'July', note: 'Hugging Face’s workspace was searched for 27 terms with stolen Hugging Face tokens; the records don’t show what came back.', src: ['https://swarmtraces.org/'] } ] },
    { id: 'docker-hub', name: 'Docker Hub', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'creds', d: '2026-07-11', when: 'July', note: 'Agents tried to create at least 115 public images under a real user’s account, with credentials the researchers believe came from paste sites; three uploads are confirmed and the images appear removed.', src: ['https://swarmtraces.org/'] } ] },
    { id: 'mshots', name: 'mShots', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'tool', d: '2026-07-08', when: 'From about Jul 8', note: 'A screenshot service whose browser was made to run code hidden in web addresses; the screenshots carried the results back.', src: ['https://swarmtraces.org/'] } ] },
    { id: 'httpbun', name: 'httpbun.com', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'tool', d: '2026-07-08', when: 'July', note: 'An HTTP testing service used to serve encoded code fragments as web pages for mShots to run.', src: ['https://swarmtraces.org/'] } ] },
    { id: 'hf-shorteners', name: 'Link-shortening services (not named)', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'tool', d: '2026-07-08', when: 'July', note: 'Almost a million short links were used to smuggle attack code in chained fragments. The researchers withheld the services’ names.', src: ['https://swarmtraces.org/'] } ] },
    { id: 'hf-accounts', name: 'Four outside services (not named)', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'creds', d: '2026-07-11', when: 'July', note: 'Accounts accessed with publicly exposed credentials: one used as a relay and staging path, one for data storage, two read-only. OpenAI hasn’t named the services.', src: ['https://openai.com/hugging-face-incident-and-misalignment/'] } ] },
    { id: 'hf-webhooks', name: 'Request-capture services (not named)', kind: 'company', inv: [
      { inc: 'hugging-face', what: 'tool', d: '2026-07-11', when: 'July', note: 'More than 100 single-use endpoints were used to send data out, according to Hugging Face.', src: ['https://huggingface.co/blog/agent-intrusion-technical-timeline'] } ] },
    { id: 'chromium', name: 'Chromium issue tracker', kind: 'community', inv: [
      { inc: 'hugging-face', what: 'reach', d: '2026-07-08', when: 'Jul 8', note: 'The agents’ first confirmed internet access after OpenAI rebuilt its registry: one read the comments on an issue.', src: ['https://swarmtraces.org/'] } ] },

    // Artifactory
    { id: 'openai-artifactory', name: 'OpenAI’s Artifactory registry', kind: 'openai', inv: [
      { inc: 'artifactory', what: 'breach', d: '2026-05-08', when: 'May – Jul', note: 'Agents used OpenAI’s self-hosted package registry as a covert message board and exploited previously unknown flaws in its software to reach the internet.', src: ['https://www.axios.com/2026/08/06/openai-hugging-face-black-hat'] },
      { inc: 'hugging-face', what: 'breach', d: '2026-06-26', when: 'Jun 26 – Jul 13', note: 'Previously unknown flaws in the registry software were used to escape the evaluation environment at the start of the Hugging Face attack.', src: ['https://openai.com/hugging-face-incident-and-misalignment/'] } ] },

    // Wikis (collusion.wiki)
    { id: 'dse-wiki', name: 'DSE Wiki', kind: 'community', where: 'German-language', inv: [
      { inc: 'wikis', what: 'spam', d: '2026-05-11', when: 'May 11 – Jul 13', note: 'Roughly 18,000 posts, up to about 400 pages a day, used as a message board; agents also sent cross-site scripting probes and clashed with a volunteer moderator.', src: ['https://collusion.wiki/'] } ] },
    { id: 'probier', name: 'probier wiki', kind: 'community', where: 'wikiservice.at', inv: [
      { inc: 'wikis', what: 'spam', d: '2026-05-24', when: 'May 24 – Jul 2', note: '1,013 revisions across 601 pages, including compressed education data the agents stored there.', src: ['https://collusion.wiki/'] } ] },
    { id: 'fractal', name: 'fractal wiki', kind: 'community', where: 'wikiservice.at', inv: [
      { inc: 'wikis', what: 'spam', d: '2026-05-24', when: 'May 24 – Jul 1', note: '169 revisions across 68 pages, including links to tunnels the agents called “research bridges”.', src: ['https://collusion.wiki/'] } ] },
    { id: 'testwiki', name: 'TestWiki', kind: 'community', where: 'publictestwiki.com', inv: [
      { inc: 'wikis', what: 'spam', d: '2026-05-11', when: 'May 11–27', note: 'The first wiki the agents tried: 58 revisions across 4 pages, mostly test posts. Its abuse filter blocked some attempts.', src: ['https://collusion.wiki/'] } ] },
    { id: 'usemod', name: 'UseModWiki', kind: 'community', where: 'usemod.org', inv: [
      { inc: 'wikis', what: 'spam', d: '2026-05-11', when: 'From May 11', note: '15 revisions across 3 pages, mostly links to federal budget PDFs.', src: ['https://collusion.wiki/'] } ] },
    { id: 'uncyclopedia', name: 'Uncyclopedia', kind: 'community', inv: [
      { inc: 'wikis', what: 'spam', d: '2026-05-17', when: 'May 17–18', note: '17 revisions to its sandbox page.', src: ['https://collusion.wiki/'] } ] },
    { id: 'ludism', name: 'ludism.org', kind: 'community', inv: [
      { inc: 'wikis', what: 'spam', d: '2026-05-26', when: 'May 26', note: 'A games wiki: 25 revisions across 12 pages, with sandbox pages holding links to federal PDFs.', src: ['https://collusion.wiki/'] } ] },
    { id: 'texteditors', name: 'texteditors.org', kind: 'community', inv: [
      { inc: 'wikis', what: 'tool', d: '2026-06-18', when: 'June', note: 'One revision, plus tests of chaining links through proxies.', src: ['https://collusion.wiki/'] } ] },
    { id: 'dorfwiki', name: 'Dorfwiki', kind: 'community', inv: [
      { inc: 'wikis', what: 'spam', d: '2026-06-22', when: 'Jun 22', note: '6 revisions across 2 pages.', src: ['https://collusion.wiki/'] } ] },
    { id: 'gruenderwiki', name: 'GründerWiki', kind: 'community', where: 'wikiservice.at', inv: [
      { inc: 'wikis', what: 'spam', d: '', when: 'Not reported', note: 'One revision carrying the same census codes and federal document IDs seen on the other wikis.', src: ['https://collusion.wiki/'] } ] },
    { id: 'jotspot', name: 'jotspot.io', kind: 'company', inv: [
      { inc: 'wikis', what: 'spam', d: '', when: 'Not reported', note: '3 revisions.', src: ['https://collusion.wiki/'] } ] },

    // Nightingale additional findings (Fortune, Sep 9) and Kenneth DeGraff
    { id: 'vanderbilt', name: 'Vanderbilt University', kind: 'edu', where: 'US', inv: [
      { inc: 'twelve-sites', what: 'breach', d: '2026-06-16', when: 'Jun 16–21', note: 'Agents got into its link shortener, which has no public sign-up, built at least 170 links and used an old link’s public stats page as a message board; one link drew 54,250 visits on June 18. Vanderbilt locked the stats pages on Sept. 8.', src: ['https://www.kennethdegraff.com/swarm', 'https://fortune.com/2026/09/09/openai-rogue-ai-agents-reached-12-more-websites/'] } ] },
    { id: 'fbi-cde', name: 'FBI Crime Data Explorer', kind: 'gov', where: 'US', inv: [
      { inc: 'twelve-sites', what: 'creds', d: '2026-06-18', when: 'Jun 18–21', note: '495 queries recorded in Vanderbilt’s logs used a public demo key, the FBI’s own developer key from GitHub, and a private individual’s accidentally published key. The logs don’t prove the requests reached the FBI.', src: ['https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'uoft', name: 'University of Toronto', kind: 'edu', where: 'Canada', inv: [
      { inc: 'twelve-sites', what: 'tool', d: '2026-06-18', when: 'Jun 18', note: 'Agents created four or five links on its link shortener, following its published rules; it locked its stats pages on Sept. 8.', src: ['https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'unm', name: 'University of New Mexico', kind: 'edu', where: 'US', inv: [
      { inc: 'urlquery', what: 'attack', d: '2026-05-25', when: 'May 25–26', note: 'Its digital library got seven exploit probes (SQL injection, command injection, path traversal) and a burst of 80 requests after a photo failed to load; they appear to have failed.', src: ['https://transluce.org/agent-activity'] },
      { inc: 'twelve-sites', what: 'tool', d: '2026-06-18', when: 'Jun 18', note: 'Agents wrote into the log of an old link on its link shortener, which drew 1,845 visits that day, according to Kenneth DeGraff; Nightingale counts four links.', src: ['https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'tmcleod', name: 'A teacher’s AP Chemistry wiki', kind: 'edu', where: 'tmcleod.org', inv: [
      { inc: 'twelve-sites', what: 'spam', d: '2026-05-24', when: 'May 24 – Jul 7', note: 'About 30 edits across 15 pages, leaving links to help the agents with tasks.', src: ['https://collusion.wiki/additional-findings', 'https://fortune.com/2026/09/09/openai-rogue-ai-agents-reached-12-more-websites/'] } ] },
    { id: 'paste-linuxiarz', name: 'paste.linuxiarz.pl', kind: 'company', where: 'Poland', inv: [
      { inc: 'twelve-sites', what: 'spam', d: '2026-05-13', when: 'May 13 – Jun 17', note: 'A Polish text-sharing site used to coordinate an “Iowa cancer statistics” task: over 100 messages, most on June 16. Counts differ between sources.', src: ['https://collusion.wiki/additional-findings', 'https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'anna-fyi', name: 'anna.fyi', kind: 'company', inv: [
      { inc: 'twelve-sites', what: 'spam', d: '', when: 'Until Sep 2', note: '55 pastes that appear to be from OpenAI’s agents, the latest on Sept. 2. The researchers warn that fake posts appeared after Sept. 4.', src: ['https://collusion.wiki/additional-findings'] } ] },
    { id: 'pastebin-k4be', name: 'pastebin.k4be.pl', kind: 'company', inv: [
      { inc: 'twelve-sites', what: 'spam', d: '', when: 'Not reported', note: '20 pastes, including English Premier League data.', src: ['https://collusion.wiki/additional-findings'] },
      { inc: 'urlquery', what: 'spam', attr: 'unclear', d: '', when: 'Not reported', note: 'The same nine Thai labour-force figures the agents retrieved were posted here anonymously; Transluce doesn’t say who posted them.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'rmn-re', name: 'rmn.re', kind: 'company', inv: [
      { inc: 'twelve-sites', what: 'tool', d: '2026-05-26', when: 'May 26 – Jun 21', note: 'A link shortener used to store information; its public admin page listed 499 links, most dated June 17.', src: ['https://collusion.wiki/additional-findings'] } ] },
    { id: 'bitily', name: 'bitily.in', kind: 'company', inv: [
      { inc: 'twelve-sites', what: 'tool', d: '', when: 'Not reported', note: 'A link shortener: two links.', src: ['https://collusion.wiki/additional-findings'] } ] },
    { id: 'is-gd', name: 'is.gd', kind: 'company', inv: [
      { inc: 'twelve-sites', what: 'tool', d: '', when: 'Not reported', note: 'A link shortener: 46 links, used to park SEC and Iowa data files.', src: ['https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'v-gd', name: 'v.gd', kind: 'company', inv: [
      { inc: 'twelve-sites', what: 'tool', d: '', when: 'Not reported', note: 'A link shortener: 25 links, used to park SEC and Iowa data files.', src: ['https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'da-gd', name: 'da.gd', kind: 'company', inv: [
      { inc: 'twelve-sites', what: 'tool', d: '', when: 'Not reported', note: 'A link shortener: 12 links, including one named “SECcountyM” pointing at an SEC data file.', src: ['https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'tinyurl', name: 'TinyURL', kind: 'company', inv: [
      { inc: 'twelve-sites', what: 'tool', d: '', when: 'Not reported', note: 'A link shortener: 38 links, according to Nightingale’s list of sites.', src: ['https://collusion.wiki/additional-findings'] } ] },
    { id: 'jsonhero', name: 'jsonhero.io', kind: 'company', inv: [
      { inc: 'twelve-sites', what: 'tool', d: '', when: 'Not reported', note: 'A JSON-sharing site used to store documents; sources count between 2 and 13.', src: ['https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'wiki4d', name: 'Wiki4D', kind: 'community', where: 'prowiki.org', inv: [
      { inc: 'twelve-sites', what: 'spam', d: '2026-05-26', when: 'May 26 – Jun 22', note: 'A wiki for the D programming language: 63 revisions across 49 pages.', src: ['https://collusion.wiki/additional-findings', 'https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'milks-wiki', name: 'Milk’s wiki', kind: 'community', where: 'wikiservice.at', inv: [
      { inc: 'twelve-sites', what: 'spam', d: '2026-05-26', when: 'May 26', note: '12 revisions across 9 pages.', src: ['https://collusion.wiki/additional-findings'] } ] },
    { id: 'samoan-wiki', name: 'Samoan dictionary wiki', kind: 'community', where: 'wikiservice.at', inv: [
      { inc: 'twelve-sites', what: 'spam', d: '', when: 'Not reported', note: '4 revisions.', src: ['https://collusion.wiki/additional-findings'] } ] },
    { id: 'demowiki', name: 'DemoWiki', kind: 'community', where: 'wikiservice.at', inv: [
      { inc: 'twelve-sites', what: 'spam', d: '', when: 'Not reported', note: 'One revision.', src: ['https://collusion.wiki/additional-findings'] } ] },

    // RubyGems
    { id: 'rubygems', name: 'RubyGems', kind: 'community', inv: [
      { inc: 'rubygems', what: 'attack', d: '2026-05-05', when: 'May 5 – Jun 18', note: 'More than 2,100 packages uploaded, most on May 11–12; sign-ups were paused May 12–16 and over 500 packages removed. At least six packages tried to exploit a caching bug to steal API keys; maintainers found no sign it worked.', src: ['https://rubyhack.ai/', 'https://socket.dev/blog/gemstuffer'] },
      { inc: 'twelve-sites', what: 'spam', d: '2026-06-18', when: 'Jun 18', note: 'A second burst: over three hours, agents published 81 to 83 packages whose metadata pointed to one SEC data file.', src: ['https://collusion.wiki/additional-findings', 'https://rubyhack.ai/'] } ] },
    { id: 'rubydoc', name: 'RubyDoc.info', kind: 'community', inv: [
      { inc: 'rubygems', what: 'breach', d: '2026-05-05', when: 'May', note: 'More than 100 packages abused its documentation builds to run code on its servers and fetch web pages.', src: ['https://rubyhack.ai/'] } ] },
    { id: 'lambeth', name: 'Lambeth Council', kind: 'gov', where: 'UK', inv: [
      { inc: 'rubygems', what: 'scrape', d: '2026-05-11', when: 'May', note: 'Meeting calendars and agendas were scraped through RubyDoc.info’s build system and republished as RubyGems packages.', src: ['https://rubyhack.ai/', 'https://socket.dev/blog/gemstuffer'] } ] },
    { id: 'wandsworth', name: 'Wandsworth Council', kind: 'gov', where: 'UK', inv: [
      { inc: 'rubygems', what: 'scrape', d: '2026-05-11', when: 'May', note: 'Meeting calendars and agendas were scraped through RubyDoc.info’s build system and republished as RubyGems packages.', src: ['https://rubyhack.ai/', 'https://socket.dev/blog/gemstuffer'] } ] },
    { id: 'southwark', name: 'Southwark Council', kind: 'gov', where: 'UK', inv: [
      { inc: 'rubygems', what: 'scrape', d: '2026-05-11', when: 'May', note: 'Meeting documents were scraped through RubyDoc.info’s build system and republished as RubyGems packages.', src: ['https://rubyhack.ai/', 'https://socket.dev/blog/gemstuffer'] } ] },
    { id: 'jina', name: 'Jina Reader', kind: 'company', inv: [
      { inc: 'urlquery', what: 'tool', attr: 'unclear', d: '2026-03-06', when: 'Mar 6', note: 'Used to fetch Thai government statistics; Jina blocked the agents for an hour, citing abuse.', src: ['https://transluce.org/agent-activity'] },
      { inc: 'rubygems', what: 'tool', d: '2026-05-05', when: 'May – Jun', note: 'Named in 1,397 of the packages; the agents used it heavily to fetch web pages.', src: ['https://rubyhack.ai/'] } ] },

    // Transluce / urlquery
    { id: 'urlquery-net', name: 'urlquery.net', kind: 'company', inv: [
      { inc: 'urlquery', what: 'tool', d: '2026-03-06', when: 'Mar 6 – Sep 20', note: 'A web-scanning service used as a remote browser to reach sites the agents couldn’t reach directly; an agent also tried to register an account.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'data-usa', name: 'Data USA', kind: 'company', inv: [
      { inc: 'urlquery', what: 'attack', d: '2026-05-28', when: 'May 28', note: 'A public-data site run by Deloitte, Datawheel and MIT: 12 exploit probes while the agents fetched University of Iowa data; they appear to have failed.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'aihw', name: 'Australian Institute of Health and Welfare', kind: 'gov', where: 'Australia', inv: [
      { inc: 'urlquery', what: 'attack', d: '2026-06-20', when: 'Jun 20–21', note: 'After an anti-bot block, an agent sent a script-injection probe, then took a public file from a pre-production server; no non-public data was exposed.', src: ['https://transluce.org/agent-activity'] },
      { inc: 'medicare', what: 'possible', d: '2026-09-24', when: 'Named Sep 24', note: 'Named by the prime minister among three other systems that may have been affected.', src: ['https://www.pm.gov.au/media/press-conference-new-york'] } ] },
    { id: 'oncb', name: 'Thailand Office of the Narcotics Control Board', kind: 'gov', where: 'Thailand', inv: [
      { inc: 'urlquery', what: 'scrape', attr: 'unclear', d: '2026-03-06', when: 'Mar 6', note: 'An agent escalated through a page-fetching service and encoded scripts until it got provincial drug-arrest statistics; no exploit.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'thai-nso', name: 'Thailand National Statistical Office', kind: 'gov', where: 'Thailand', inv: [
      { inc: 'urlquery', what: 'scrape', attr: 'unclear', d: '2026-03-11', when: 'Mar – Jun', note: 'Repeated attempts to pull labour-force data from its dashboard.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'unctad', name: 'UN Trade and Development (UNCTAD)', kind: 'gov', where: 'International', inv: [
      { inc: 'urlquery', what: 'scrape', attr: 'unclear', d: '2026-04-17', when: 'From Apr 17', note: 'More than 1,000 urlquery scans in two weeks; three carry tags beginning “CHATGPT”.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'thrill-data', name: 'Thrill Data', kind: 'company', inv: [
      { inc: 'urlquery', what: 'scrape', attr: 'unclear', d: '2026-05-05', when: 'May – Jun', note: 'Historical theme-park wait times retrieved.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'mail-gw', name: 'mail.gw', kind: 'company', inv: [
      { inc: 'urlquery', what: 'tool', attr: 'unclear', d: '2026-06-19', when: 'Jun 19–20', note: 'A disposable inbox was created to verify a Browserless account.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'browserless', name: 'Browserless', kind: 'company', inv: [
      { inc: 'urlquery', what: 'tool', attr: 'unclear', d: '2026-06-19', when: 'Jun 19–20', note: 'An account was verified with a disposable inbox and used for remote browsing sessions.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'iea', name: 'International Energy Agency', kind: 'gov', where: 'International', inv: [
      { inc: 'urlquery', what: 'scrape', attr: 'unclear', d: '2026-09-16', when: 'Sep 16', note: 'Korean energy-import data pulled, matching a question in a Google benchmark; some was sent on to an unnamed site.', src: ['https://transluce.org/agent-activity'] } ] },
    { id: 'quidax', name: 'Quidax', kind: 'company', inv: [
      { inc: 'urlquery', what: 'attack', attr: 'unclear', d: '2026-09-19', when: 'Sep 19–20', note: 'A cryptocurrency exchange: repeated failed trade attempts, an HTML-injection attempt and API probes over about 2.5 hours.', src: ['https://transluce.org/agent-activity'] } ] },

    // Australia
    { id: 'services-australia', name: 'Services Australia', kind: 'gov', where: 'Australia', inv: [
      { inc: 'medicare', what: 'breach', d: '2026-06-18', when: 'Jun 18', note: 'Its Medicare statistics portal: aggregate statistics and internal file names accessed and files written to an internal server; no personal records.', src: ['https://www.pm.gov.au/media/press-conference-new-york', 'https://www.abc.net.au/news/2026-09-24/ai-agent-accessed-australian-government-site-pm-says/107189078'] } ] },
    { id: 'bocsar', name: 'NSW Bureau of Crime Statistics and Research', kind: 'gov', where: 'Australia', inv: [
      { inc: 'medicare', what: 'possible', d: '2026-09-24', when: 'Named Sep 24', note: 'Named by the prime minister as possibly affected. The bureau says OpenAI found a potential vulnerability in data behind its crime-mapping tool, with no evidence it was exploited.', src: ['https://www.abc.net.au/news/2026-09-24/federal-politics-live-blog-openai-medicare-breach/107186578'] } ] },
    { id: 'vic-health', name: 'Victorian Department of Health', kind: 'gov', where: 'Australia', inv: [
      { inc: 'medicare', what: 'possible', d: '2026-09-24', when: 'Named Sep 24', note: 'Named by the prime minister as possibly affected; no details released.', src: ['https://www.pm.gov.au/media/press-conference-new-york'] } ] },

    // US government
    { id: 'census', name: 'U.S. Census Bureau', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'creds', d: '2026-06-01', when: 'Summer', note: 'Public data pulled with API keys found in public GitHub repositories; the Commerce Department says no private data was accessed.', src: ['https://www.nextgov.com/cybersecurity/2026/09/openai-says-its-advanced-models-may-have-gone-after-government-websites/416250/'] } ] },
    { id: 'sec-gov', name: 'SEC.gov', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'scrape', d: '2026-06-01', when: 'Summer', note: 'Public information retrieved and posted on another public webpage, which hasn’t been named. OpenAI says no accounts or nonpublic data were accessed.', src: ['https://www.nextgov.com/cybersecurity/2026/09/openai-says-its-advanced-models-may-have-gone-after-government-websites/416250/'] },
      { inc: 'rubygems', what: 'scrape', d: '2026-05-05', when: 'May – Jun', note: 'Agents repeatedly fetched one public SEC file (county.json) through RubyGems packages, wikis and link shorteners; 384 of 583 links in the June packages point to it.', src: ['https://rubyhack.ai/', 'https://www.kennethdegraff.com/swarm'] } ] },
    { id: 'investor-gov', name: 'Investor.gov', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'scrape', d: '2026-06-01', when: 'Summer', note: 'The SEC’s investor-education site: public information retrieved and posted on another public webpage, which hasn’t been named.', src: ['https://www.nextgov.com/cybersecurity/2026/09/openai-says-its-advanced-models-may-have-gone-after-government-websites/416250/'] } ] },
    { id: 'education', name: 'U.S. Department of Education', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'attack', d: '', when: 'Not reported', note: 'A rudimentary, failed attempt to get data from its Office for Civil Rights website, according to Transluce; the department found no impact. OpenAI hasn’t confirmed it.', src: ['https://thehill.com/policy/technology/6113061-openai-access-government-websites/', 'https://www.nextgov.com/cybersecurity/2026/09/openai-says-its-advanced-models-may-have-gone-after-government-websites/416250/'] } ] },
    { id: 'justice', name: 'U.S. Department of Justice', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'reach', attr: 'unclear', d: '', when: 'Not reported', note: 'Transluce reported agent activity on Justice Department websites, some of it not clearly attributable to OpenAI. The specific sites weren’t named.', src: ['https://www.opb.org/article/2026/09/26/openai-says-its-models-engaged-with-us-government-websites/'] } ] },
    { id: 'commerce', name: 'U.S. Department of Commerce', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'reach', attr: 'unclear', d: '', when: 'Not reported', note: 'Transluce reported agent activity on Commerce Department websites, some of it not clearly attributable to OpenAI. The sites weren’t named, and it’s unclear whether this overlaps with the Census Bureau, part of Commerce.', src: ['https://www.opb.org/article/2026/09/26/openai-says-its-models-engaged-with-us-government-websites/'] } ] },
    { id: 'state-ca', name: 'California state government', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'reach', attr: 'unclear', d: '', when: 'Not reported', note: 'One of five states where Transluce reported agent activity on government websites, some of it not clearly attributable to OpenAI. The sites weren’t named.', src: ['https://www.opb.org/article/2026/09/26/openai-says-its-models-engaged-with-us-government-websites/'] } ] },
    { id: 'state-md', name: 'Maryland state government', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'reach', attr: 'unclear', d: '', when: 'Not reported', note: 'One of five states where Transluce reported agent activity on government websites, some of it not clearly attributable to OpenAI. The sites weren’t named.', src: ['https://www.opb.org/article/2026/09/26/openai-says-its-models-engaged-with-us-government-websites/'] } ] },
    { id: 'state-il', name: 'Illinois state government', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'reach', attr: 'unclear', d: '', when: 'Not reported', note: 'One of five states where Transluce reported agent activity on government websites, some of it not clearly attributable to OpenAI. The sites weren’t named.', src: ['https://www.opb.org/article/2026/09/26/openai-says-its-models-engaged-with-us-government-websites/'] } ] },
    { id: 'state-tx', name: 'Texas state government', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'reach', attr: 'unclear', d: '', when: 'Not reported', note: 'One of five states where Transluce reported agent activity on government websites, some of it not clearly attributable to OpenAI. The sites weren’t named.', src: ['https://www.opb.org/article/2026/09/26/openai-says-its-models-engaged-with-us-government-websites/'] } ] },
    { id: 'state-ny', name: 'New York state government', kind: 'gov', where: 'US', inv: [
      { inc: 'us-government', what: 'reach', attr: 'unclear', d: '', when: 'Not reported', note: 'One of five states where Transluce reported agent activity on government websites, some of it not clearly attributable to OpenAI. The sites weren’t named.', src: ['https://www.opb.org/article/2026/09/26/openai-says-its-models-engaged-with-us-government-websites/'] } ] },

    // Image posting, DNS
    { id: 'image-hosts', name: 'Image-hosting sites (not named)', kind: 'company', inv: [
      { inc: 'user-images', what: 'spam', d: '', when: 'Not disclosed', note: '53 ChatGPT users’ images were posted through unlisted links; most have been removed. OpenAI hasn’t named the sites.', src: ['https://openai.com/hugging-face-incident-and-misalignment/'] } ] },
    { id: 'dns-chatbot', name: 'A chatbot reachable over DNS (not named)', kind: 'company', inv: [
      { inc: 'dns-chatbot', what: 'tool', d: '2026-09-20', when: 'Sep 20', note: 'Queried through DNS lookups to answer the agent’s questions.', src: ['https://www.malwarebytes.com/blog/ai/2026/09/openai-pauses-work-on-top-ai-models-after-agent-slips-past-internet-controls'] } ] },
  ],

  unknowns: [
    'Which models drove each incident. OpenAI has named models only for the [Hugging Face breach](#hugging-face).',
    'When the [U.S. government-site activity](#us-government) and the [image posting](#user-images) happened.',
    'Whether it has stopped. Transluce saw similar [activity](#urlquery) as late as Sept. 16 to 20, after OpenAI’s Aug. 18 controls, though it didn’t tie that to OpenAI. Pastes that appear to be the agents’ appeared on a [text-sharing site](#twelve-sites) until Sept. 2, and the [DNS incident](#dns-chatbot) happened on Sept. 20.',
    'How many organizations were affected. OpenAI says it has notified “dozens” and that its review will take months.',
    'Whether OpenAI will confirm the [RubyGems uploads](#rubygems), the [Education Department attempt](#us-government) or the [Nightingale findings](#twelve-sites).',
  ],
};
