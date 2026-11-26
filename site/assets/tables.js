/* What each table in a case holds, in one plain line: what a row is and where it comes from.
   Neutral on purpose: it explains the data, never which table holds the answer. Keyed by case type, then table. */
(function () {
  const DASH = 'What the dashboard shows. Built by the nightly job from the raw data.';
  const DEPLOYS = 'Code changes shipped to production: when, which service, by whom, and what changed.';
  const PROMOS = 'Sales and offers run by competitors, with their dates.';
  /* The data flow behind the number in the alert, shown in the "Your job" box. Names the tables, never the cause. */
  window.TAI.LINEAGE = {
    late: '`orders` (raw, one row per order) → nightly job (`job_runs`) → `daily_orders` (dashboard)',
    fanout: '`orders` + `dim_customers` → `fct_orders` → `daily_revenue` (dashboard)',
    drift: '`raw_signups` + `countries` → `daily_signups` (dashboard)',
    status: '`orders` → the dashboard SQL (`model_sql`) → `daily_revenue` (dashboard)',
    tz: '`orders` (written by the ingest service) → `daily_orders` (dashboard)',
    backfill: '`orders` → nightly job or a backfill run → `daily_orders` (dashboard)',
    nowhere: 'price changes (`price_audit`) → `products` → what each sale charged (`order_items`) → `daily_sales` (dashboard)',
    email: '`campaigns` → sender job (`job_runs`) → one row per email (`email_sends`) → `daily_email` (dashboard)',
    purge: 'clean-up job (`job_runs`) → accounts it deleted (`deleted_users`); `daily_active` (dashboard) counts who is left',
    bill: 'every warehouse query, with its cost (`query_history`) → `daily_cost` (the bill); dashboard tiles run queries too',
    units: '`raw_webhooks` (as each provider sent them) → `payments` → `daily_revenue` (dashboard)',
  };
  window.TAI.TABLE_INFO = {
    late: {
      orders: 'Raw orders: one row per order, with the source it came from (web, ios, android, partner_api).',
      daily_orders: DASH + ' One row per day and source.',
      partitions: 'When each source’s data for a day landed in the warehouse, and how many rows it had.',
      job_runs: 'Runs of the nightly job that builds daily_orders: when it ran, its status and how many rows it read.',
      campaigns: 'Marketing campaigns, their dates and daily spend.',
      deploys: DEPLOYS,
      payment_attempts: 'Checkout payment attempts and failures per day.',
      site_traffic: 'Visits to the site and apps per day.',
    },
    fanout: {
      orders: 'Raw orders: one row per order, with the customer and amount.',
      dim_customers: 'Customer details (country, plan), loaded from the CRM. The dashboard joins orders to this table.',
      fct_orders: 'Orders joined to customer details. The dashboard adds these up.',
      daily_revenue: DASH,
      crm_syncs: 'Syncs that copy customers from the CRM into dim_customers: when, what scope, how, and rows written.',
      promo_uses: 'How many orders used each promo code, per day.',
      price_changes: 'Announced plan price changes and the day each takes effect.',
    },
    drift: {
      raw_signups: 'Raw sign-up events from the apps and web, with the app version, country and the original payload.',
      countries: 'Country codes and names. The dashboard joins sign-ups to this table.',
      daily_signups: DASH + ' One row per day and country.',
      app_releases: 'App versions released to the stores.',
      holidays: 'Public holidays by country.',
      deploys: DEPLOYS,
      marketing_spend: 'Marketing spend per day and channel.',
    },
    units: {
      payments: 'Payments as the pipeline stored them: one row per payment, with provider and amount.',
      daily_revenue: DASH,
      raw_webhooks: 'Payment messages exactly as each provider sent them.',
      integrations: 'The payment providers we’re connected to, when each went live and who owns it.',
      social_mentions: 'How often people mentioned us on social media, per day.',
      site_sessions: 'Visits to the site per day.',
      pebble_docs: 'Pebble Pay’s API documentation for the fields in its payment messages.',
    },
    status: {
      orders: 'Raw orders: one row per order, with payment provider, status and amount.',
      daily_revenue: DASH,
      model_sql: 'The SQL the nightly job runs to build each dashboard table.',
      provider_changelog: 'Changes announced by our payment providers.',
      status_incidents: 'Incidents on our own status page: when they started and ended.',
      competitor_promos: PROMOS,
    },
    tz: {
      orders: 'Raw orders: one row per order, with the time it was stamped and the ingest version that wrote it.',
      daily_orders: DASH,
      deploys: DEPLOYS,
      weather: 'The weather forecast per day.',
      competitor_promos: PROMOS,
    },
    backfill: {
      orders: 'Raw orders: one row per order, with the channel (web, ios, android).',
      daily_orders: DASH + ' updated_at is when each day’s row was last written.',
      backfill_runs: 'Times the job was run by hand to rebuild past days: who ran it, which days, with what filter.',
      privacy_deletions: 'Customer requests to delete their data, and how many orders each day’s requests removed.',
      deploys: DEPLOYS,
    },
    nowhere: {
      products: 'Every product and its price right now.',
      order_items: 'One row per product line in an order: when, which product, how many, and the price charged.',
      daily_sales: DASH,
      price_audit: 'Every price change: when, which product, old and new price, and who changed it.',
      query_log: 'Statements people ran by hand against the production database.',
      tickets: 'Ops tickets: requests for changes in production.',
      deploys: DEPLOYS,
      price_feed_runs: 'Runs of the supplier’s nightly price feed and how many prices each updated.',
      newsletters: 'Marketing newsletters sent, with their subject and audience size.',
    },
    email: {
      email_sends: 'One row per email sent: to which customer, which campaign, when, and in which batch.',
      daily_email: DASH + ' Campaign emails and other emails per day.',
      job_runs: 'Runs of the campaign sender job: start, end, status and a note.',
      campaigns: 'Email campaigns: owner, scheduled time and audience size.',
      email_feedback: 'Unsubscribes and spam reports per day.',
      provider_status: 'The email provider’s status page, per day.',
    },
    purge: {
      deleted_users: 'Accounts deleted by the clean-up job: when, their last login, and how they signed up.',
      daily_active: DASH + ' Active users per day.',
      job_runs: 'Runs of the nightly clean-up job that deletes inactive accounts.',
      code_changes: 'Code changes merged recently: when, by whom, which file, and a summary.',
      app_last_seen: 'When each user last opened the mobile app.',
      support_tickets: 'Support tickets per day and category.',
      incidents: 'Incidents on our status page: when they started and ended.',
    },
    bill: {
      query_history: 'Every query run on the warehouse: when, by whom, how much data it read (GB) and what it cost.',
      daily_cost: 'The warehouse bill per day.',
      dashboard_tiles: 'Tiles on our dashboards: which query each runs, how often it refreshes, and who made it.',
      tile_sql: 'The SQL behind each dashboard tile.',
      table_sizes: 'The size of the events table over time, and the column it is partitioned by.',
      pricing: 'What the warehouse charges per TB of data a query reads.',
    },
  };
})();
