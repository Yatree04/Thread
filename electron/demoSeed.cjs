// One-time example content, seeded only on the very first launch (never
// again after that — see the 'seeded' flag in store.cjs), purely so there's
// something to click through in Widget/Capture/Query before the real
// watchers or Quick Capture have added anything of your own. Clearly
// labelled as an example, not a stand-in for real AI output.
const now = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function build() {
  const trails = [
    {
      id: 'demo-trail-pricing',
      name: 'Example: Pricing Page Redesign',
      confidence: 92,
      lifecycle: 'active',
      createdAt: now - 3 * DAY,
      lastActiveAt: now - 12 * MIN,
    },
    {
      id: 'demo-trail-onboarding',
      name: 'Example: Client Onboarding',
      confidence: 68,
      lifecycle: 'forming',
      createdAt: now - 1 * DAY,
      lastActiveAt: now - 3 * HOUR,
    },
  ];

  const items = [
    {
      id: 'demo-item-1',
      trailId: 'demo-trail-pricing',
      type: 'file',
      title: 'pricing-page-v3.fig',
      evidence: 'Included: opened in same window',
      addedAt: now - 3 * DAY,
    },
    {
      id: 'demo-item-2',
      trailId: 'demo-trail-pricing',
      type: 'tab',
      title: 'Stripe Docs — tiered pricing models',
      evidence: 'Included: matched by content',
      addedAt: now - 2 * DAY,
    },
    {
      id: 'demo-item-3',
      trailId: 'demo-trail-pricing',
      type: 'clipboard',
      title: '"Starter / Pro / Scale" tier copy draft',
      evidence: 'Included: matched by content',
      addedAt: now - 12 * MIN,
    },
    {
      id: 'demo-item-4',
      trailId: 'demo-trail-onboarding',
      type: 'file',
      title: 'client-contract-signed.pdf',
      evidence: 'Included: opened in same window',
      addedAt: now - 1 * DAY,
    },
    {
      id: 'demo-item-5',
      trailId: 'demo-trail-onboarding',
      type: 'clipboard',
      title: 'Kickoff call notes, 3:00pm Thu',
      evidence: 'Included: matched by content',
      addedAt: now - 3 * HOUR,
    },
    {
      id: 'demo-item-6',
      trailId: null,
      type: 'tab',
      title: 'Example: an unfiled item — try right-clicking it in Query',
      evidence: 'Not yet grouped',
      addedAt: now - 45 * MIN,
    },
  ];

  return { trails, items };
}

module.exports = { build };
