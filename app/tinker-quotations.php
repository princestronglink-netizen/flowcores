<?php

use App\Models\Client;
use App\Models\ItemVariant;
use App\Models\Pipeline;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/* ----------------------------- Settings ----------------------------- */
$count        = 15;    // how many NEW transactions with a quotation to create
$fixExisting  = true;  // also issue a quotation for existing open transactions that don't have one
$maxVersions  = 2;     // each quotation gets 0..N extra edits (creates "Version 1", "Version 2")
$markSent     = true;  // move about half of them one stage past the quotation stage (shows "Sent")
$backdate     = true;  // spread created_at over the last 30 days

mt_srand(7);
/* -------------------------------------------------------------------- */

$pipeline = Pipeline::default();
$initial  = $pipeline?->initialStage();

if (! $initial) {
    echo 'No pipeline or stages yet.' . PHP_EOL;
    return;
}

$qStage = $pipeline->stages()->where('creates_quotation', true)->first();

if (! $qStage) {
    echo 'No stage is flagged "creates quotation". Flag one in the pipeline settings first.' . PHP_EOL;
    return;
}

$clients  = Client::with('contactPeople')->has('contactPeople')->get();
$variants = ItemVariant::with('brand.item')->get();

if ($clients->isEmpty() || $variants->isEmpty()) {
    echo 'Run tinker-clients.php and tinker-30-items.php first.' . PHP_EOL;
    return;
}

$user       = User::first();
$by         = $user?->id;
$priorities = ['Low', 'Medium', 'High', 'Critical'];
$markups    = [0, 5, 10, 15];
$subjects   = ['Office renovation', 'Warehouse repair', 'Residential project', 'Building maintenance',
               'Factory expansion', 'Showroom fit-out', 'Condo unit finishing', 'Plumbing retrofit'];

$prices = [];
foreach ($variants as $v) {
    $prices[$v->id] = mt_rand(5000, 500000) / 100;
}

/** Edit the quotation so a new version is created (only works while it isn't frozen). */
$editQuotation = function (Transaction $t, int $round) use ($by) {
    $t->refresh()->load('items');

    $rows = $t->items->map(fn ($i) => [
        'item_variant_id' => $i->item_variant_id,
        'item_name'       => $i->item_name,
        'brand_name'      => $i->brand_name,
        'quantity'        => $i->quantity + mt_rand(1, 5),   // quantity change => printed change
        'unit_price'      => $i->unit_price,
    ])->all();

    $fields = [
        'name'                     => $t->name,
        'client_id'                => $t->client_id,
        'client_contact_person_id' => $t->client_contact_person_id,
        'priority'                 => $t->priority,
        'winning_message'          => $t->winning_message,
        'remarks'                  => "Revised pricing, round {$round}. Valid for 30 days.",
        'prepared_by'              => $t->prepared_by,
        'prepared_by_position'     => $t->prepared_by_position,
        'markup_percent'           => $t->markup_percent,
        'vat_percent'              => $t->vat_percent,
    ];

    $t->saveEdit($fields, $rows, $by);
    $t->refresh()->syncAmount();
};

/** Versions, then optionally "sent". */
$finish = function (Transaction $t) use ($maxVersions, $markSent, $pipeline, $qStage, $by, $editQuotation) {
    $versions = mt_rand(0, $maxVersions);
    for ($r = 1; $r <= $versions; $r++) {
        $editQuotation($t, $r);
    }

    if ($markSent && mt_rand(0, 1)) {
        $next = $pipeline->stages()
            ->where('sort_order', '>', $qStage->sort_order)
            ->orderBy('sort_order')
            ->first();

        // Never into the delivery or final stage: those need real delivery records.
        if ($next && ! $next->deducts_stock && ! $next->is_final) {
            $t->refresh()->moveToStage($next, $by, 'Quotation sent (seed script)');
        }
    }
};

$created = 0;
$fixed   = 0;
$skipped = 0;

DB::transaction(function () use (
    $count, $fixExisting, $backdate, $pipeline, $initial, $qStage, $clients, $variants,
    $user, $by, $priorities, $markups, $subjects, $prices, $finish, &$created, &$fixed, &$skipped
) {
    /* ---- 1. Existing open transactions without a quotation ---- */
    if ($fixExisting) {
        Transaction::whereNull('quotation_number')
            ->where('status', 'open')
            ->whereHas('stage', fn ($s) => $s->where('sort_order', '<=', $qStage->sort_order))
            ->get()
            ->each(function (Transaction $t) use ($qStage, $by, $finish, &$fixed) {
                if ($t->stage?->id !== $qStage->id) {
                    $t->moveToStage($qStage, $by, 'Moved to quotation stage (seed script)'); // issues the quotation
                } else {
                    $t->issueQuotation($by);
                }

                $t->refresh();

                if ($t->quotation_number) {
                    $finish($t);
                    $fixed++;
                }
            });
    }

    /* ---- 2. New transactions that get a quotation ---- */
    for ($n = 1; $n <= $count; $n++) {
        $name = sprintf('%s (quoted) #%03d', $subjects[($n - 1) % count($subjects)], $n);

        if (Transaction::where('name', $name)->exists()) {
            $skipped++;
            continue;
        }

        $client  = $clients->random();
        $contact = $client->contactPeople->random();

        $picked = $variants->random(min(mt_rand(1, 4), $variants->count()));
        $rows   = collect($picked)->map(fn ($v) => [
            'item_variant_id' => $v->id,
            'item_name'       => $v->brand->item->item_name,
            'brand_name'      => $v->brand->brand_name,
            'quantity'        => mt_rand(1, 50),
            'unit_price'      => $prices[$v->id],
        ])->all();

        $markup   = $markups[array_rand($markups)];
        $vat      = 12;
        $subtotal = collect($rows)->sum(fn ($r) => $r['quantity'] * $r['unit_price']);
        $amount   = Transaction::breakdown((float) $subtotal, (float) $markup, (float) $vat)['total'];

        $t = Transaction::create([
            'name'                     => $name,
            'client_id'                => $client->id,
            'client_contact_person_id' => $contact->id,
            'pipeline_id'              => $pipeline->id,
            'pipeline_stage_id'        => $initial->id,
            'status'                   => 'open',
            'priority'                 => $priorities[array_rand($priorities)],
            'winning_message'          => null,
            'remarks'                  => 'Prices valid for 30 days.',
            'prepared_by'              => $user?->name,
            'prepared_by_position'     => $user?->position ?? null,
            'amount'                   => $amount,
            'markup_percent'           => $markup,
            'vat_percent'              => $vat,
        ]);

        $t->items()->createMany($rows);

        $t->stageHistory()->create([
            'pipeline_stage_id' => $initial->id,
            'changed_by'        => $by,
            'note'              => 'Transaction created',
        ]);

        // Same as the controller: the first stage's automation (may already issue the quotation).
        $t->runStageAutomation($initial, $by);

        // Not in the quotation stage yet: move it there. This issues the quotation number.
        if (! $t->refresh()->quotation_number) {
            $t->moveToStage($qStage, $by, 'Moved to quotation stage (seed script)');
        }

        $t->refresh();

        if (! $t->quotation_number) {
            continue; // issuing failed, nothing more to do for this one
        }

        if ($backdate) {
            $t->created_at = now()->subDays(mt_rand(0, 29))->subMinutes(mt_rand(0, 1439));
            $t->saveQuietly();
        }

        $finish($t);
        $created++;
    }
});

echo "New quoted transactions: {$created} | Existing fixed: {$fixed} | Skipped: {$skipped}" . PHP_EOL
    . 'Totals - Transactions: ' . Transaction::count()
    . ' | With quotation: ' . Transaction::whereNotNull('quotation_number')->count()
    . ' | Versions: ' . \App\Models\TransactionVersion::count() . PHP_EOL;