<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Removes the supplier purchase order feature.
 * WARNING: this deletes every row in purchase_orders and purchase_order_items. Back up first.
 * Stock already received stays: stock_receipts and the stock ledger are not touched.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Receipts used to point at the PO that produced them.
        if (Schema::hasTable('stock_receipts') && Schema::hasColumn('stock_receipts', 'purchase_order_id')) {
            try {
                Schema::table('stock_receipts', fn (Blueprint $t) => $t->dropForeign(['purchase_order_id']));
            } catch (\Throwable $e) {
                // no foreign key on this column, nothing to drop
            }

            Schema::table('stock_receipts', fn (Blueprint $t) => $t->dropColumn('purchase_order_id'));
        }

        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');

        if (Schema::hasColumn('pipeline_stages', 'creates_purchase_order')) {
            Schema::table('pipeline_stages', fn (Blueprint $t) => $t->dropColumn('creates_purchase_order'));
        }
    }

    public function down(): void
    {
        // Intentionally not reversible: the data is gone. Restore from a backup if needed.
    }
};