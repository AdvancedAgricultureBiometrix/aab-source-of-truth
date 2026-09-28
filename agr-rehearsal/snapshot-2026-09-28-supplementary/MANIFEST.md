# Step 0 supplementary evidence snapshot, 2026-09-28: manifest

Every file in the supplement, with its size in bytes and SHA-256 digest. The digests are the same as in `SHA256SUMS`, which `sha256sum -c SHA256SUMS` checks from this folder.

**This manifest is part of a read-only evidence record. It is never edited after commit.**

## Source

- **Source B supplement:** Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas that snapshot-2026-09-28 did not record.

## Files (57)

Generated from the PostgreSQL system catalogs in one read-only query at 2026-09-28 09:04:35 UTC (PostgreSQL 17.6). Seven files for each schema, and `database.sql` for the database-level objects.

| File | Bytes | SHA-256 |
|---|---:|---|
| `source-b/cognitive_core/functions.sql` | 102130 | `2a6b352655b3b4dbef8a29236cdf59f238d1c9d4f1d73e71972cf3a8dd2b9661` |
| `source-b/cognitive_core/grants.sql` | 11471 | `2311596422d3c21f2393bf5db08021f485285f36113fed819e4edef4793ef812` |
| `source-b/cognitive_core/rls.sql` | 1897 | `eec93ba9fc2d5c5b73fca494c0ff3773aa59b1a19b808765bec3409c84dd61c1` |
| `source-b/cognitive_core/sequences.sql` | 647 | `e719e81d4e980bfdf2a4eed8d004195f02c464010bc471008e499fb04e6cd8ae` |
| `source-b/cognitive_core/tables.sql` | 36975 | `96fc8e2e9a929ac670d9f7603e388d752693070372be6fd24712e6b49cdb2ab7` |
| `source-b/cognitive_core/triggers.sql` | 667 | `c53273aab105fe27e760b8a5cbc22c2feffc06a21422ff57c6b15595bc081fba` |
| `source-b/cognitive_core/views.sql` | 2731 | `da25175901ca9cf208624ef0618611a7607f0dad6a0291ec15528b8b08464be5` |
| `source-b/continuity_core/functions.sql` | 3291 | `4e60c595ba1c0eac9ecd82a7042ed49a7471f63f9d9a384efe4ec73674f9100d` |
| `source-b/continuity_core/grants.sql` | 1163 | `ac73a880cdb28651698bf15eef10b1bb4f372fcfe168af62544c8a2e3cd6628f` |
| `source-b/continuity_core/rls.sql` | 792 | `d7fcd5a39c18f6aa91cc84b05b4282efbcf7aaf91f3deddbe61aa94a29ebd23a` |
| `source-b/continuity_core/sequences.sql` | 645 | `f624391cfb06fc0614e0d8184945cb87c430e8027ff5b565a49259523f1a60d7` |
| `source-b/continuity_core/tables.sql` | 2801 | `c92a8629b18eef8f44204864b608108eec59a6716e73e48f330484d9058b8d70` |
| `source-b/continuity_core/triggers.sql` | 665 | `d7523cff820b850faf26ff3fceaa3fc0fbf4f8e882785ae3421a4c28f5f9c39f` |
| `source-b/continuity_core/views.sql` | 2169 | `dea2d254ae3babcdb6941e17b917971cad3fda1f7566adab010fd1b8f602c8e3` |
| `source-b/country_core/functions.sql` | 96318 | `a49cbc682b81bfc77d32092d1fb499a16594b2a303f910e0902fd0205855c695` |
| `source-b/country_core/grants.sql` | 52120 | `195b2fb81af3e1af2d495f432d46f14c28cf197c97a154dc3b15575e5a988c82` |
| `source-b/country_core/rls.sql` | 11087 | `623204d6d85b1337b80d03ea56a919187340b85b775758d39a7cc531ad1e168c` |
| `source-b/country_core/sequences.sql` | 643 | `58c51e7390628bed7f14202724e0ccd377af7cba6330c4cb6d7ec8ba17bff2d7` |
| `source-b/country_core/tables.sql` | 111184 | `549e875b0e1914313a52a1277e6755caa24e19c7b9a4821498a246e73ba53614` |
| `source-b/country_core/triggers.sql` | 663 | `3054b628b14ceafb5f314ffdf00ff3ce14702e874ce047b756ec23f82d231b9f` |
| `source-b/country_core/views.sql` | 6968 | `6b4eaa7354789c6442a690c841dc41e9fd9bfdd56253e85d10664bc6d7c65ca8` |
| `source-b/database.sql` | 4141 | `07803cd2af3152b81670fbe8a71325ed4ef86e7fc106d472ed1d19c1183e843b` |
| `source-b/manufacturing_core/functions.sql` | 5976 | `cc289d2ebdb86d7063f8f2a23f7ad6ffe66c7f654b1e60ca93a4c0fe99f870fd` |
| `source-b/manufacturing_core/grants.sql` | 1768 | `ce14a90aedff9e76e867c8617d8db9b62e44fe9b0e9d4954c2c989bbc4211b32` |
| `source-b/manufacturing_core/rls.sql` | 944 | `8c963cd9a3af24c2fb150640cc75f9b6fbca7e657f4e409ff3f42337ee4122b4` |
| `source-b/manufacturing_core/sequences.sql` | 655 | `43e02dff94995abdddd3cd7a6c7ef6c6cd22eb89cc0cd2e5e28b9ce049093344` |
| `source-b/manufacturing_core/tables.sql` | 7599 | `ed241f3de6937ab96e737607abdf414bdf41499b453f41505d4cd5c376bbcf8c` |
| `source-b/manufacturing_core/triggers.sql` | 675 | `13aecdc09bcd260c9a3c76cc441d839441d25c2e28472a04f60d8e5ba14c595c` |
| `source-b/manufacturing_core/views.sql` | 1545 | `68271c3ba0f16ac918bbde3a1573ee1319e079973e48d1aeece3411249e93f9a` |
| `source-b/observation_core/functions.sql` | 41845 | `b949492978c00af1b8154e72679f5d1de0d2b393e610da4840c07deae6b2cdc9` |
| `source-b/observation_core/grants.sql` | 10086 | `9a3ce4bfc28afeb0ff22d6e09dabd85cbd88121859bd60953029e382fddc3698` |
| `source-b/observation_core/rls.sql` | 1306 | `3619c1fb08db2030d8ed49560aa0eebade0c647c3c24fb0eeabe2b06c49b1a39` |
| `source-b/observation_core/sequences.sql` | 652 | `8081ff7d9c758379ce5e3d24a64ff7cd1be76f41fc4e5d5150fb30e887a21dbc` |
| `source-b/observation_core/tables.sql` | 17574 | `4c69a2dc49fe1cbedc5206e2e839c48cc52a59a4ab104cc5b7eaa1f299460a7d` |
| `source-b/observation_core/triggers.sql` | 672 | `f9319e2ba663cc1f4b9f30924a6edc50e5f2ccdd37c0f937aabf9adb03293e0b` |
| `source-b/observation_core/views.sql` | 10338 | `371be870d9a42e0f15e5790337ebc18f8363a6aee2eec8ca6852dab2ddca58a4` |
| `source-b/presentation_core/functions.sql` | 701 | `1ae98b78aa6d758320d9c56f25f05c90db6ddc1e2955cc5b1cfcba1c93aac8fa` |
| `source-b/presentation_core/grants.sql` | 1484 | `497cc0caeb4528317c182415efa43ff7fa58596225a95ea130615c36dc835141` |
| `source-b/presentation_core/rls.sql` | 1174 | `9d4a3db693849f0641957f5d77c33ce70b58910f3a06f89c6b3ed99de995858a` |
| `source-b/presentation_core/sequences.sql` | 933 | `6c99ed185bad86a1fc9a59b87aec2703627f02829e021644b7cf40ca236a7cb1` |
| `source-b/presentation_core/tables.sql` | 7114 | `798a0add0e7cd8067cc51e82e669394674177c17b795508eac4b7323d91c0ddd` |
| `source-b/presentation_core/triggers.sql` | 673 | `9430d81d0a0768c9698aa821c38f5734775d1d630d636efb3f87e1b92545559e` |
| `source-b/presentation_core/views.sql` | 657 | `6280b6ad6d60fcaefbc8a58512a01241c3cf1ebd183fa7bb5984f5f454cade33` |
| `source-b/regulatory_core/functions.sql` | 8116 | `c411d1fc23028b7cd9aa66bc8969dd50c21d09e79a89d0581bbdbfa1b3916829` |
| `source-b/regulatory_core/grants.sql` | 2775 | `e0ab838d566c4db139b3ab6a886ac3c30d7badcc9150fa4b6767b94fed17c990` |
| `source-b/regulatory_core/rls.sql` | 1264 | `3105b9f4813aa0f1a1fbf402eff6f9333a87c105d2d4e33916529211ae65268b` |
| `source-b/regulatory_core/sequences.sql` | 647 | `9d2de305989af58f3b6fc6a92f241306fb7661e17794e62f9513001f01144fa3` |
| `source-b/regulatory_core/tables.sql` | 10827 | `e1c545374e60d3bf1a99482e644720caa505fc832cdf211f4e96fbc5c22d245b` |
| `source-b/regulatory_core/triggers.sql` | 667 | `613d301d86363707ded82e1a278cc1635054357c084d417d4d9186cb854296ae` |
| `source-b/regulatory_core/views.sql` | 1493 | `13e460d32ef1e00b099c3e9977b93b8d45199d36a2cccc73a70ad506777758a4` |
| `source-b/security_core/functions.sql` | 8354 | `4f92adeb57e245a226a3aac785bcb746e2044c17d3ca4d905f65776f2632e779` |
| `source-b/security_core/grants.sql` | 1092 | `0fc84073576eb9f181e69ba3f83522751bd8c6a42ad153fb086aee7f57c0398a` |
| `source-b/security_core/rls.sql` | 775 | `06bcf83e2875640be6fcfa2556e1d116bc0675938c2971f940c827d67f91499b` |
| `source-b/security_core/sequences.sql` | 639 | `415397ab42deb288187b945c2dd291480f2850419e1f4c8d99be719cc0a3b524` |
| `source-b/security_core/tables.sql` | 2802 | `1db96ea4516438b5d2cb30837afecf02c4feb7784046685ac54dcd82b71a56d4` |
| `source-b/security_core/triggers.sql` | 659 | `73425f343e599a995cc5afc67f6b0fa6757e5649c220cb3f46f04d12c9088f9f` |
| `source-b/security_core/views.sql` | 643 | `246e2c0d95890f047aebc1647603df46cb1c013d11ac410ea22c8a7476c04b8c` |

## Excluded

| What | Reason |
|---|---|
| Every table row | Schema only. No row of any table was read; the query reads the system catalogs only |
| The rows of `storage.buckets` (2 buckets) and `cron.job` (0 jobs) | Rows, although they configure behaviour. Only their counts were read |
| The Supabase platform schemas (`auth`, `storage`, `realtime`, `vault`, `cron`, `graphql`, `graphql_public`, `pgbouncer`) | Owned by `supabase_admin` or `pgbouncer`: the Supabase platform, not the rehearsal. The rehearsal has no triggers or policies of its own on them |
| The `extensions` schema's objects | Extension objects and Supabase helper functions only. The installed extensions are listed in `database.sql` |
| `agriculture`, `platform` and `public`, and the migration list | Already recorded in `snapshot-2026-09-28/` |

No file was excluded for credentials or personal data. A scan of every file found no email addresses, keys, tokens, connection strings or URLs.
