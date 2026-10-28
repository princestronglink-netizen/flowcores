<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The transaction IS the quotation. This adds the quotation fields to transactions,
 * moves version history to transaction_versions and copies existing quotation data over.
 *
 * quotations / quotation_items / quotation_versions are NOT dropped here. Check the data first,
 * then drop them in a later migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $t) {
            $t->string('quotation_number')->nullable()->unique()->after('note');
            $t->unsignedInteger('version')->default(0)->after('quotation_number');
            $t->date('valid_until')->nullable()->after('version');
            $t->text('terms')->nullable()->after('valid_until');
            $t->timestamp('quotation_issued_at')->nullable()->after('terms');
            // Set when the card leaves the quotation stage: the quotation as it was sent.
            $t->json('quotation_snapshot')->nullable()->after('quotation_issued_at');
        });

        Schema::create('transaction_versions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $t->unsignedInteger('version');
            $t->string('quotation_number');
            $t->json('snapshot');
            $t->foreignId('edited_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();

            $t->unique(['transaction_id', 'version']);
        });

        if (! Schema::hasTable('quotations')) {
            return;
        }

        // ---- copy existing quotations onto their transactions ----
        $quotations = DB::table('quotations')->whereNotNull('transaction_id')->get();

        foreach ($quotations as $q) {
            $tx = DB::table('transactions')->where('id', $q->transaction_id)->first();
            if (! $tx) {
                continue;
            }

            DB::table('transactions')->where('id', $tx->id)->update([
                'quotation_number'    => $q->quotation_number,
                'version'             => $q->version ?? 0,
                'valid_until'         => $q->valid_until,
                'terms'               => $q->terms,
                'quotation_issued_at' => $q->created_at,
            ]);

            // Past the quotation stage: freeze what the quotation looked like.
            $quoteStage = DB::table('pipeline_stages')
                ->where('pipeline_id', $tx->pipeline_id)->where('creates_quotation', true)->first();
            $stage = DB::table('pipeline_stages')->where('id', $tx->pipeline_stage_id)->first();

            if ($quoteStage && $stage && $stage->sort_order > $quoteStage->sort_order) {
                $items = DB::table('quotation_items')->where('quotation_id', $q->id)->get()->map(fn ($i) => [
                    'item_variant_id' => $i->item_variant_id,
                    'item_name'       => $i->item_name,
                    'brand_name'      => $i->brand_name,
                    'quantity'        => $i->quantity,
                    'unit_price'      => (float) $i->unit_price,
                ])->all();

                DB::table('transactions')->where('id', $tx->id)->update([
                    'quotation_snapshot' => json_encode([
                        'subject'                  => $q->subject,
                        'client_id'                => $q->client_id,
                        'client_contact_person_id' => $q->client_contact_person_id,
                        'valid_until'              => $q->valid_until,
                        'amount'                   => (float) $q->amount,
                        'note'                     => $q->note,
                        'terms'                    => $q->terms,
                        'items'                    => $items,
                    ]),
                ]);
            }

            // ---- version history ----
            foreach (DB::table('quotation_versions')->where('quotation_id', $q->id)->get() as $v) {
                DB::table('transaction_versions')->insert([
                    'transaction_id'   => $tx->id,
                    'version'          => $v->version,
                    'quotation_number' => $v->quotation_number,
                    'snapshot'         => is_string($v->snapshot) ? $v->snapshot : json_encode($v->snapshot),
                    'edited_by'        => $v->edited_by,
                    'created_at'       => $v->created_at,
                    'updated_at'       => $v->updated_at,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_versions');

        Schema::table('transactions', function (Blueprint $t) {
            $t->dropUnique(['quotation_number']);
            $t->dropColumn(['quotation_number', 'version', 'valid_until', 'terms', 'quotation_issued_at', 'quotation_snapshot']);
        });
    }
};
