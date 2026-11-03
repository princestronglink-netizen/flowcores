<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('client_purchase_orders', function (Blueprint $table) {
            $table->decimal('markup_percent', 8, 2)->default(0)->after('amount');
            $table->decimal('vat_percent', 5, 2)->default(12)->after('markup_percent');
            $table->text('remarks')->nullable()->after('note');
            $table->string('prepared_by')->nullable()->after('remarks');
            $table->string('prepared_by_position')->nullable()->after('prepared_by');
        });

        // Existing POs: copy the values from their transaction and recompute the amount.
        DB::table('client_purchase_orders')->orderBy('id')->each(function ($po) {
            $tx = DB::table('transactions')->find($po->transaction_id);
            if (! $tx) {
                return;
            }

            $subtotal = DB::table('client_purchase_order_items')
                ->where('client_purchase_order_id', $po->id)
                ->sum(DB::raw('quantity * unit_price'));

            $total = \App\Models\Transaction::breakdown(
                (float) $subtotal, (float) $tx->markup_percent, (float) $tx->vat_percent
            )['total'];

            DB::table('client_purchase_orders')->where('id', $po->id)->update([
                'markup_percent'       => $tx->markup_percent,
                'vat_percent'          => $tx->vat_percent,
                'remarks'              => $tx->remarks,
                'prepared_by'          => $tx->prepared_by,
                'prepared_by_position' => $tx->prepared_by_position,
                'amount'               => $total,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('client_purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['markup_percent', 'vat_percent', 'remarks', 'prepared_by', 'prepared_by_position']);
        });
    }
};