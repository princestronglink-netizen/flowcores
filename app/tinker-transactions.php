<?php

use App\Models\Client;
use App\Models\ItemVariant;
use App\Models\Pipeline;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/* ----------------------------- Settings ----------------------------- */
$count    = 20;     // how many transactions to create
$backdate = true;   // spread created_at over the last 30 days (affects reorder points)
$advance  = false;  // true = move some cards forward a few stages (stops before the delivery stage)

mt_srand(42); // same data every run
/* -------------------------------------------------------------------- */

$pipeline = Pipeline::default();
$initial  = $pipeline?->initialStage();

if (! $initial) {
    echo 'No pipeline or no stages yet. Create the pipeline first.' . PHP_EOL;
    return;
}

$clients  = Client::with('contactPeople')->has('contactPeople')->get();
$variants = ItemVariant::with('brand.item')->get();

if ($clients->isEmpty() || $variants->isEmpty()) {
    echo 'Run tinker-clients.php and tinker-30-items.php first (need clients with contacts and item variants).' . PHP_EOL;
    return;
}

$user       = User::first();
$priorities = ['Low', 'Medium', 'High', 'Critical'];
$markups    = [0, 5, 10, 15];
$subjects   = [
    'Office renovation', 'Warehouse repair', 'Residential project', 'Building maintenance',
    'Factory expansion', 'Showroom fit-out', 'Condo unit finishing', 'Plumbing retrofit',
    'Electrical upgrade', 'Roofing replacement',
];

// One fixed unit price per variant, so the same item costs the same across transactions.
$prices = [];
foreach ($variants as $v) {
    $prices[$v->id] = mt_rand(5000, 500000) / 100;
}

$created = 0;
$skipped = 0;

DB::transaction(function () use (
    $count, $backdate, $advance, $pipeline, $initial, $clients, $variants, $user,
    $priorities, $markups, $subjects, $prices, &$created, &$skipped
) {
    for ($n = 1; $n <= $count; $n++) {
        $name = sprintf('%s #%03d', $subjects[($n - 1) % count($subjects)], $n);

        // Safe to re-run: a transaction with this name is never created twice.
        if (Transaction::where('name', $name)->exists()) {
            $skipped++;
            continue;
        }

        $client  = $clients->random();
        $contact = $client->contactPeople->random();

        // 1 to 4 DIFFERENT variants (the form requires distinct lines).
        $picked = $variants->random(min(mt_rand(1, 4), $variants->count()));
        $rows   = collect($picked)->map(fn ($v) => [
            'item_variant_id' => $v->id,
            'item_name'       => $v->brand->item->item_name,
            'brand_name'      => $v->brand->brand_name,
            'quantity'        => mt_rand(1, 50),
            'unit_price'      => $prices[$v->id],
        ])->all();

        $markup = $markups[array_rand($markups)];
        $vat    = 12;

        $subtotal = collect($rows)->sum(fn ($r) => $r['quantity'] * $r['unit_price']);
        $amount   = Transaction::breakdown((float) $subtotal, (float) $markup, (float) $vat)['total'];

        $transaction = Transaction::create([
            'name'                     => $name,
            'client_id'                => $client->id,
            'client_contact_person_id' => $contact->id,
            'pipeline_id'              => $pipeline->id,
            'pipeline_stage_id'        => $initial->id,
            'status'                   => 'open',
            'priority'                 => $priorities[array_rand($priorities)],
            'winning_message'          => null,
            'remarks'                  => mt_rand(0, 1) ? 'Prices valid for 30 days. Delivery within 7 working days.' : null,
            'prepared_by'              => $user?->name,
            'prepared_by_position'     => $user?->position ?? null,
            'amount'                   => $amount,
            'markup_percent'           => $markup,
            'vat_percent'              => $vat,
        ]);

        $transaction->items()->createMany($rows);

        $transaction->stageHistory()->create([
            'pipeline_stage_id' => $initial->id,
            'changed_by'        => $user?->id,
            'note'              => 'Transaction created',
        ]);

        // The first stage can be flagged too (quotation / client PO), same as the controller.
        $transaction->runStageAutomation($initial, $user?->id);

        if ($backdate) {
            $when = now()->subDays(mt_rand(0, 29))->subMinutes(mt_rand(0, 1439));
            $transaction->created_at = $when;
            $transaction->saveQuietly();
        }

        if ($advance) {
            $steps = mt_rand(0, 2);
            for ($i = 0; $i < $steps; $i++) {
                $transaction->unsetRelation('stage');
                $next = $transaction->pipeline->stages()
                    ->where('sort_order', '>', $transaction->stage->sort_order)
                    ->orderBy('sort_order')
                    ->first();

                // Don't go into the delivery stage: it needs real delivery records.
                if (! $next || $next->deducts_stock || $next->is_final) {
                    break;
                }

                $transaction->moveToStage($next, $user?->id, 'Moved by seed script');
            }
        }

        $created++;
    }
});

echo "New transactions: {$created} (skipped {$skipped} that already existed)" . PHP_EOL
    . 'Totals - Transactions: ' . Transaction::count()
    . ' | Lines: ' . \App\Models\TransactionItem::count() . PHP_EOL;