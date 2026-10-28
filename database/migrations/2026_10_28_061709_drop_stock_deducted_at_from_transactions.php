<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Safety net: old-style orders (flag set, no delivery rows) depend on this column.
        $legacy = DB::table('transactions')
            ->whereNotNull('stock_deducted_at')
            ->whereNotExists(fn ($q) => $q
                ->select(DB::raw(1))
                ->from('deliveries')
                ->whereColumn('deliveries.transaction_id', 'transactions.id'))
            ->count();

        if ($legacy > 0) {
            throw new RuntimeException(
                "{$legacy} transaction(s) were deducted the old way (no delivery records). " .
                'Keep stock_deducted_at until those are handled.'
            );
        }

        Schema::table('transactions', function (Blueprint $t) {
            $t->dropColumn('stock_deducted_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $t) {
            $t->timestamp('stock_deducted_at')->nullable();
        });
    }
};